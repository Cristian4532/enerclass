import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSettings } from "@/lib/settings";
import { getZoneSnapshot } from "@/lib/zones";
import { CO2_FACTOR, ZONE_ORDER, ZONE_THEME } from "@/lib/constants";
import { limaKey, limaLabel } from "@/lib/time";
import type { DashboardSeriesPoint, ZoneCode } from "@/lib/types";
import { apiUser, serverError, unauthorized } from "@/lib/api";

export const dynamic = "force-dynamic";

const RANGE_CONFIG = {
  live: { count: 30, step: 60 * 1000, granularity: "minute" as const, label: "Últimos 30 minutos" },
  "24h": { count: 24, step: 60 * 60 * 1000, granularity: "hour" as const, label: "Últimas 24 horas" },
  "7d": { count: 7, step: 24 * 60 * 60 * 1000, granularity: "day" as const, label: "Últimos 7 días" },
  "30d": { count: 30, step: 24 * 60 * 60 * 1000, granularity: "day" as const, label: "Últimos 30 días" }
};

type RangeKey = keyof typeof RANGE_CONFIG;

export async function GET(request: NextRequest) {
  try {
    const user = await apiUser();
    if (!user) return unauthorized();

    const requested = request.nextUrl.searchParams.get("range") ?? "24h";
    const range = (Object.keys(RANGE_CONFIG).includes(requested) ? requested : "24h") as RangeKey;
    const config = RANGE_CONFIG[range];
    const now = new Date();
    const monthStart = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const seriesStart = new Date(now.getTime() - (config.count - 1) * config.step);

    const [settings, snapshot, pendingAlerts, criticalAlerts, recentAlerts, readings] = await Promise.all([
      getSettings(),
      getZoneSnapshot(monthStart),
      prisma.alert.count({ where: { status: { not: "RESUELTA" } } }),
      prisma.alert.count({ where: { status: { not: "RESUELTA" }, severity: "CRITICA" } }),
      prisma.alert.findMany({
        take: 5,
        orderBy: { createdAt: "desc" },
        include: { zone: { select: { shortName: true, color: true } } }
      }),
      // La ventana en vivo se limita a 30 puntos; el historial completo queda en SQLite.
      prisma.reading.findMany({
        where: {
          recordedAt: { gte: seriesStart },
          ...(range === "live" ? {} : { source: "seed" })
        },
        select: { zoneId: true, powerKw: true, recordedAt: true }
      })
    ]);

    const { zones } = snapshot;
    const monthKwh = zones.reduce((sum, zone) => sum + zone.monthKwh, 0);
    const monthCost = zones.reduce((sum, zone) => sum + zone.monthCost, 0);
    const currentKw = zones.reduce((sum, zone) => sum + zone.currentKw, 0);
    const totalCurrent = zones.reduce((sum, zone) => sum + zone.currentAmps, 0);
    const activeVoltages = zones.filter((zone) => zone.voltageVolts > 0);
    const voltage = activeVoltages.length
      ? activeVoltages.reduce((sum, zone) => sum + zone.voltageVolts, 0) / activeVoltages.length
      : 0;
    const powerFactor = activeVoltages.length
      ? activeVoltages.reduce((sum, zone) => sum + zone.powerFactor, 0) / activeVoltages.length
      : 0;

    const baselineCost = settings.savingsRate < 1 ? monthCost / (1 - settings.savingsRate) : monthCost;
    const baselineKwh = settings.savingsRate < 1 ? monthKwh / (1 - settings.savingsRate) : monthKwh;
    const savingsSoles = baselineCost - monthCost;
    const co2Avoided = (baselineKwh - monthKwh) * CO2_FACTOR;

    const codeByZoneId = new Map(zones.map((zone) => [zone.id, zone.code]));
    const bucketKeys: string[] = [];
    const buckets = new Map<string, { label: string; sums: Record<ZoneCode, number>; counts: Record<ZoneCode, number> }>();

    for (let index = 0; index < config.count; index++) {
      const bucketDate = new Date(now.getTime() - (config.count - 1 - index) * config.step);
      const key = limaKey(bucketDate, config.granularity);
      bucketKeys.push(key);
      if (!buckets.has(key)) {
        buckets.set(key, {
          label: limaLabel(bucketDate, config.granularity),
          sums: { COMPUTO: 0, TALLERES: 0, ALUMBRADO: 0, ADMINISTRACION: 0 },
          counts: { COMPUTO: 0, TALLERES: 0, ALUMBRADO: 0, ADMINISTRACION: 0 }
        });
      }
    }

    for (const reading of readings) {
      const key = limaKey(reading.recordedAt, config.granularity);
      const bucket = buckets.get(key);
      const code = codeByZoneId.get(reading.zoneId);
      if (!bucket || !code) continue;
      bucket.sums[code] += reading.powerKw;
      bucket.counts[code] += 1;
    }

    const series: DashboardSeriesPoint[] = bucketKeys
      .map((key) => {
        const bucket = buckets.get(key);
        if (!bucket) return null;
        const values = {} as Record<ZoneCode, number>;
        for (const code of ZONE_ORDER) {
          values[code] =
            bucket.counts[code] > 0
              ? Math.round((bucket.sums[code] / bucket.counts[code]) * 100) / 100
              : 0;
        }
        const total = ZONE_ORDER.reduce((sum, code) => sum + values[code], 0);
        return {
          key,
          label: bucket.label,
          ...values,
          total: Math.round(total * 100) / 100
        };
      })
      .filter((point): point is DashboardSeriesPoint => point !== null)
      .slice(-30);

    const peakKw = series.reduce((max, point) => Math.max(max, point.total), 0);

    const distribution = zones.map((zone) => ({
      code: zone.code,
      name: zone.shortName,
      color: zone.color,
      kwh: zone.monthKwh,
      cost: zone.monthCost,
      pct: zone.sharePct
    }));

    return NextResponse.json({
      generatedAt: now.toISOString(),
      range,
      periodLabel: config.label,
      kpis: {
        currentKw: round(currentKw, 2),
        monthCost: round(monthCost, 2),
        monthKwh: round(monthKwh, 1),
        baselineCost: round(baselineCost, 2),
        savingsSoles: round(savingsSoles, 2),
        savingsPct: round(settings.savingsRate * 100, 1),
        totalCurrent: round(totalCurrent, 2),
        voltage: round(voltage, 1),
        powerFactor: round(powerFactor, 3),
        pendingAlerts,
        criticalAlerts,
        co2Avoided: round(co2Avoided, 1),
        peakKw: round(peakKw, 2)
      },
      zones,
      series,
      distribution,
      recentAlerts: recentAlerts.map((alert) => ({
        id: alert.id,
        title: alert.title,
        severity: alert.severity,
        status: alert.status,
        zoneName: alert.zone?.shortName ?? "Sistema",
        zoneColor: alert.zone?.color ?? ZONE_THEME.ADMINISTRACION.color,
        createdAt: alert.createdAt.toISOString()
      }))
    });
  } catch (error) {
    return serverError(error);
  }
}

function round(value: number, decimals: number) {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}
