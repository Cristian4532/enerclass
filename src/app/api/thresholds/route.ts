import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiUser, badRequest, forbidden, serverError, unauthorized } from "@/lib/api";
import type { ThresholdItem } from "@/lib/types";

export const dynamic = "force-dynamic";

async function getThresholds() {
  const zones = await prisma.zone.findMany({
    include: { threshold: true },
    orderBy: { code: "asc" }
  });
  return zones
    .filter((zone) => zone.threshold)
    .map<ThresholdItem>((zone) => ({
      id: zone.threshold!.id,
      zoneId: zone.id,
      zoneName: zone.name,
      zoneCode: zone.code,
      zoneColor: zone.color,
      maxAmps: zone.threshold!.maxAmps,
      minVoltage: zone.threshold!.minVoltage,
      maxVoltage: zone.threshold!.maxVoltage,
      nightMaxKw: zone.threshold!.nightMaxKw,
      updatedAt: zone.threshold!.updatedAt.toISOString()
    }));
}

export async function GET() {
  try {
    const user = await apiUser();
    if (!user) return unauthorized();
    const thresholds = await getThresholds();
    const canEdit = ["CIST", "DIRECCION"].includes(user.role);
    return NextResponse.json({ thresholds, canEdit });
  } catch (error) {
    return serverError(error);
  }
}

export async function PUT(request: Request) {
  try {
    const user = await apiUser();
    if (!user) return unauthorized();
    if (!["CIST", "DIRECCION"].includes(user.role)) {
      return forbidden("Solo el área técnica (CIST) o Dirección pueden modificar los umbrales.");
    }

    const body = await request.json();
    const zoneId = String(body?.zoneId ?? "");
    const maxAmps = Number(body?.maxAmps);
    const minVoltage = Number(body?.minVoltage);
    const maxVoltage = Number(body?.maxVoltage);
    const nightMaxKw = Number(body?.nightMaxKw);

    if (!zoneId) return badRequest("Seleccione una zona.");
    if (![maxAmps, minVoltage, maxVoltage, nightMaxKw].every(Number.isFinite)) return badRequest("Todos los valores deben ser numéricos.");
    if (maxAmps < 1 || maxAmps > 200) return badRequest("El límite de amperaje debe estar entre 1 y 200 A.");
    if (minVoltage < 100 || maxVoltage > 300 || minVoltage >= maxVoltage) return badRequest("Rango de tensión inválido (mínimo < máximo, entre 100 y 300 V).");
    if (nightMaxKw < 0 || nightMaxKw > 100) return badRequest("El umbral nocturno debe estar entre 0 y 100 kW.");

    const zone = await prisma.zone.findUnique({ where: { id: zoneId } });
    if (!zone) return badRequest("La zona indicada no existe.");

    await prisma.threshold.upsert({
      where: { zoneId },
      update: { maxAmps, minVoltage, maxVoltage, nightMaxKw },
      create: { zoneId, maxAmps, minVoltage, maxVoltage, nightMaxKw }
    });

    const thresholds = await getThresholds();
    return NextResponse.json({ ok: true, thresholds });
  } catch (error) {
    return serverError(error);
  }
}
