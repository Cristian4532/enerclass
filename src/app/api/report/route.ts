import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSettings } from "@/lib/settings";
import { CO2_FACTOR, INSTITUTION, REPORT_TYPES, ZONE_ORDER, type ReportType } from "@/lib/constants";
import { limaKey } from "@/lib/time";
import type { ReportData, ZoneCode } from "@/lib/types";
import { apiUser, badRequest, serverError, unauthorized } from "@/lib/api";

export const dynamic = "force-dynamic";

function parseDate(value: string | null, fallback: Date, endOfDay = false) {
  if (!value) return fallback;
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return new Date(`${value}T${endOfDay ? "23:59:59" : "00:00:00"}-05:00`);
  }
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? fallback : parsed;
}

export async function GET(request: NextRequest) {
  try {
    const user = await apiUser();
    if (!user) return unauthorized();

    const settings = await getSettings();
    const now = new Date();
    const params = request.nextUrl.searchParams;
    const from = parseDate(params.get("from"), new Date(now.getTime() - 29 * 24 * 60 * 60 * 1000));
    const to = parseDate(params.get("to"), now, true);
    const type = (Object.keys(REPORT_TYPES).includes(params.get("type") ?? "") ? params.get("type") : "ejecutivo") as ReportType;

    if (from.getTime() >= to.getTime()) return badRequest("La fecha inicial debe ser anterior a la fecha final.");
    if (to.getTime() - from.getTime() > 92 * 24 * 60 * 60 * 1000) return badRequest("El rango máximo para un reporte es de 90 días.");

    const zoneCodes = (params.get("zones") ?? "")
      .split(",")
      .map((value) => value.trim())
      .filter((value): value is ZoneCode => ["COMPUTO", "TALLERES", "ALUMBRADO", "ADMINISTRACION"].includes(value));

    const zones = await prisma.zone.findMany({
      where: zoneCodes.length ? { code: { in: zoneCodes } } : undefined,
      orderBy: { code: "asc" }
    });
    if (!zones.length) return badRequest("Seleccione al menos una zona para el reporte.");

    const orderedZones = [...zones].sort((a, b) => ZONE_ORDER.indexOf(a.code as ZoneCode) - ZONE_ORDER.indexOf(b.code as ZoneCode));
    const zoneIds = zones.map((zone) => zone.id);

    const [readings, alerts] = await Promise.all([
      prisma.reading.findMany({
        where: { zoneId: { in: zoneIds }, recordedAt: { gte: from, lte: to } },
        select: { zoneId: true, energyKwh: true, powerKw: true, currentAmps: true, recordedAt: true }
      }),
      prisma.alert.findMany({
        where: { zoneId: { in: zoneIds }, createdAt: { gte: from, lte: to } },
        include: { zone: { select: { shortName: true } } },
        orderBy: { createdAt: "desc" },
        take: 50
      })
    ]);

    const zoneAgg = new Map<string, { kwh: number; peak: number; ampsWeighted: number; weight: number }>();
    const dailyAgg = new Map<string, { date: Date; kwh: number; cost: number }>();
    let totalKwh = 0;

    for (const reading of readings) {
      const agg = zoneAgg.get(reading.zoneId) ?? { kwh: 0, peak: 0, ampsWeighted: 0, weight: 0 };
      agg.kwh += reading.energyKwh;
      agg.peak = Math.max(agg.peak, reading.powerKw);
      const weight = Math.max(reading.energyKwh, 1 / 3600);
      agg.ampsWeighted += reading.currentAmps * weight;
      agg.weight += weight;
      zoneAgg.set(reading.zoneId, agg);
      totalKwh += reading.energyKwh;

      const key = limaKey(reading.recordedAt, "day");
      const day = dailyAgg.get(key) ?? { date: reading.recordedAt, kwh: 0, cost: 0 };
      day.kwh += reading.energyKwh;
      day.cost += reading.energyKwh * settings.tariff * (1 + settings.igv);
      dailyAgg.set(key, day);
    }

    const savingsRate = settings.savingsRate;
    const baselineKwh = totalKwh / (1 - savingsRate);
    const savingsKwh = baselineKwh - totalKwh;
    const costFactor = settings.tariff * (1 + settings.igv);
    const totalSoles = totalKwh * costFactor;
    const baselineSoles = baselineKwh * costFactor;
    const savingsSoles = savingsKwh * costFactor;
    const days = Math.max(1, Math.round((to.getTime() - from.getTime()) / (24 * 60 * 60 * 1000)));
    const avgDemandKw = totalKwh / days / 24;
    const peakKw = orderedZones.reduce((sum, zone) => sum + (zoneAgg.get(zone.id)?.peak ?? 0), 0);
    const criticalAlerts = alerts.filter((alert) => alert.severity === "CRITICA").length;

    const byZone = orderedZones.map((zone) => {
      const agg = zoneAgg.get(zone.id) ?? { kwh: 0, peak: 0, ampsWeighted: 0, weight: 0 };
      const kwh = agg.kwh;
      const zoneSavings = savingsRate < 1 ? kwh / (1 - savingsRate) - kwh : 0;
      return {
        id: zone.id,
        code: zone.code as ZoneCode,
        name: zone.name,
        color: zone.color,
        kwh: round(kwh, 1),
        cost: round(kwh * costFactor, 2),
        pct: totalKwh > 0 ? round((kwh / totalKwh) * 100, 1) : 0,
        avgAmps: agg.weight > 0 ? round(agg.ampsWeighted / agg.weight, 2) : 0,
        peakKw: round(agg.peak, 2),
        co2: round(zoneSavings * CO2_FACTOR, 1)
      };
    });

    const series = Array.from(dailyAgg.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([, value]) => ({
        label: new Intl.DateTimeFormat("es-PE", { timeZone: "America/Lima", day: "2-digit", month: "short" }).format(value.date),
        kwh: round(value.kwh, 1),
        cost: round(value.cost, 2)
      }));

    const highestZone = [...byZone].sort((a, b) => b.pct - a.pct)[0];
    const recommendations = buildRecommendations({
      type,
      criticalAlerts,
      totalAlerts: alerts.length,
      highestZone,
      savingsSoles,
      savingsPct: savingsRate * 100,
      totalKwh,
      offlineSensors: orderedZones.filter((zone) => !zone.online).length,
      periodDays: days
    });

    const metaTitles: Record<ReportType, string> = {
      ejecutivo: "Reporte Ejecutivo Institucional",
      costos: "Auditoría de Costos y Facturación Eléctrica",
      tecnico: "Reporte Técnico de Mantenimiento e IoT"
    };

    const formatBound = (date: Date) =>
      new Intl.DateTimeFormat("es-PE", { timeZone: "America/Lima", day: "2-digit", month: "long", year: "numeric" }).format(date);

    const data: ReportData = {
      meta: {
        institution: settings.institutionName,
        district: settings.district,
        ugel: INSTITUTION.ugel,
        type,
        typeLabel: REPORT_TYPES[type].label,
        title: metaTitles[type],
        rangeLabel: `${formatBound(from)} — ${formatBound(to)}`,
        from: from.toISOString(),
        to: to.toISOString(),
        generatedAt: now.toISOString(),
        generatedBy: user.name,
        generatedByPosition: user.position,
        days
      },
      kpis: {
        totalKwh: round(totalKwh, 1),
        baselineKwh: round(baselineKwh, 1),
        savingsKwh: round(savingsKwh, 1),
        totalSoles: round(totalSoles, 2),
        baselineSoles: round(baselineSoles, 2),
        savingsSoles: round(savingsSoles, 2),
        savingsPct: round(savingsRate * 100, 1),
        avgDemandKw: round(avgDemandKw, 2),
        peakKw: round(peakKw, 2),
        alertCount: alerts.length,
        criticalAlerts,
        co2Avoided: round(savingsKwh * CO2_FACTOR, 1),
        kwhPerStudent: round(totalKwh / settings.students, 2)
      },
      byZone,
      alerts: alerts.map((alert) => ({
        id: alert.id,
        title: alert.title,
        message: alert.message,
        severity: alert.severity as ReportData["alerts"][number]["severity"],
        status: alert.status as ReportData["alerts"][number]["status"],
        zoneName: alert.zone?.shortName ?? "Sistema",
        createdAt: alert.createdAt.toISOString()
      })),
      series,
      sensors: orderedZones.map((zone) => ({
        code: zone.code as ZoneCode,
        name: zone.name,
        online: zone.online,
        lastSync: zone.lastSync.toISOString(),
        calibration: zone.calibration,
        offsetVoltage: zone.offsetVoltage,
        sensorModel: zone.sensorModel,
        wifiRssi: zone.wifiRssi
      })),
      recommendations
    };

    return NextResponse.json(data);
  } catch (error) {
    return serverError(error);
  }
}

function buildRecommendations(input: {
  type: ReportType;
  criticalAlerts: number;
  totalAlerts: number;
  highestZone?: { name: string; pct: number };
  savingsSoles: number;
  savingsPct: number;
  totalKwh: number;
  offlineSensors: number;
  periodDays: number;
}) {
  const recommendations: string[] = [];

  if (input.criticalAlerts > 0) {
    recommendations.push(
      `Atender de inmediato las ${input.criticalAlerts} alertas críticas registradas en el periodo, priorizando los tableros con mayor corriente y riesgo eléctrico.`
    );
  }

  if (input.highestZone && input.highestZone.pct >= 30) {
    recommendations.push(
      `El tablero de ${input.highestZone.name} concentra el ${input.highestZone.pct.toFixed(1)} % del consumo. Programar una auditoría de cargas y revisar la simultaneidad de equipos en ese sector.`
    );
  }

  recommendations.push(
    "Mantener activa la desconexión de equipos de cómputo, impresoras y proyectores al finalizar la jornada; el consumo en standby representa una oportunidad directa de ahorro."
  );

  if (input.type === "tecnico") {
    recommendations.push(
      "Verificar la calibración de los sensores SCT-013 y el offset DC de 1.65 V en cada canal del ESP32; repetir el procedimiento cada 90 días o ante variaciones mayores al 3 %."
    );
    recommendations.push(
      input.offlineSensors > 0
        ? `Existen ${input.offlineSensors} nodos sin sincronización reciente. Revisar cobertura Wi-Fi y alimentación del concentrador ESP32-LP-01.`
        : "Los cuatro nodos se encuentran sincronizados. Mantener el respaldo de configuración y el monitoreo de la señal Wi-Fi (-50 a -70 dBm recomendado)."
    );
    recommendations.push("Revisar los temporizadores del alumbrado perimétrico y la programación de apagado del pabellón B para reducir el consumo nocturno.");
  }

  if (input.type === "costos") {
    recommendations.push(
      `El ahorro estimado de S/ ${input.savingsSoles.toFixed(2)} en el periodo equivale a un ${input.savingsPct.toFixed(1)} % de la facturación de referencia. Registrar este monto como liberación de presupuesto para fines pedagógicos.`
    );
    recommendations.push("Conciliar mensualmente el consumo por tablero con la facturación del concesionario y validar la tarifa BT3, cargos fijos e IGV aplicados.");
    recommendations.push("Priorizar la compra de temporizadores y sensores de presencia para los circuitos con mayor consumo residual fuera del horario lectivo.");
  }

  if (input.type === "ejecutivo") {
    recommendations.push(
      `Comunicar a la comunidad educativa que la reducción del ${input.savingsPct.toFixed(1)} % permitió liberar S/ ${input.savingsSoles.toFixed(2)} en el periodo, equivalentes a recursos para materiales educativos y mantenimiento.`
    );
    recommendations.push("Institucionalizar la meta de ahorro del 18 % y presentar este reporte en la reunión mensual de la comisión de eficiencia energética.");
    recommendations.push("Replicar las buenas prácticas del tablero con mejor desempeño y reconocer al personal responsable del apagado de equipos.");
  }

  if (input.totalKwh > 0 && input.periodDays >= 20) {
    recommendations.push("Continuar con la medición horaria durante al menos seis meses para consolidar la línea base y verificar la sostenibilidad del ahorro.");
  }

  return recommendations.slice(0, 7);
}

function round(value: number, decimals: number) {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}
