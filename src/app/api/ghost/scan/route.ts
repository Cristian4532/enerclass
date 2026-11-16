import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSettings } from "@/lib/settings";
import { apiUser, serverError, unauthorized } from "@/lib/api";

export const dynamic = "force-dynamic";

export async function POST() {
  try {
    const user = await apiUser();
    if (!user) return unauthorized();

    const settings = await getSettings();
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const zones = await prisma.zone.findMany({ orderBy: { code: "asc" } });
    const grouped = await prisma.reading.groupBy({
      by: ["zoneId"],
      where: { recordedAt: { gte: weekAgo }, isSchoolHours: false },
      _avg: { powerKw: true, currentAmps: true }
    });

    await prisma.ghostFinding.deleteMany({
      where: { equipment: { startsWith: "Detección automática" } }
    });

    const created: { zoneId: string; equipment: string; residualAmps: number; wastedKwh: number; lossSoles: number }[] = [];

    for (const zone of zones) {
      const avg = grouped.find((row) => row.zoneId === zone.id);
      const avgKw = avg?._avg.powerKw ?? 0;
      const avgAmps = avg?._avg.currentAmps ?? 0;
      // Estimación conservadora: 35 % de la carga residual nocturna es auditable,
      // proyectada a 14 horas nocturnas × 30 días.
      const wastedKwh = Math.max(0, avgKw * 14 * 30 * 0.35);
      const lossSoles = wastedKwh * settings.tariff;

      created.push({
        zoneId: zone.id,
        equipment: `Detección automática — ${zone.shortName}`,
        residualAmps: Math.round(avgAmps * 100) / 100,
        wastedKwh: Math.round(wastedKwh * 10) / 10,
        lossSoles: Math.round(lossSoles * 100) / 100
      });
    }

    await prisma.ghostFinding.createMany({
      data: created.map((item) => ({
        zoneId: item.zoneId,
        equipment: item.equipment,
        description: "Barrido automático de cargas residuales fuera del horario lectivo (noches y fines de semana de la última semana).",
        residualAmps: item.residualAmps,
        wastedKwh: item.wastedKwh,
        lossSoles: item.lossSoles,
        status: "PENDIENTE",
        detectedAt: now
      }))
    });

    return NextResponse.json({
      ok: true,
      scannedZones: created.length,
      detectedKwh: Math.round(created.reduce((sum, item) => sum + item.wastedKwh, 0) * 10) / 10,
      message: `Barrido completado: ${created.length} circuitos analizados.`
    });
  } catch (error) {
    return serverError(error);
  }
}
