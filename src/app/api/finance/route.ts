import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSettings } from "@/lib/settings";
import { buildBill } from "@/lib/billing";
import { CO2_FACTOR, ZONE_ORDER } from "@/lib/constants";
import type { FinanceData, ZoneCode } from "@/lib/types";
import { apiUser, serverError, unauthorized } from "@/lib/api";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const user = await apiUser();
    if (!user) return unauthorized();

    const settings = await getSettings();
    const now = new Date();
    const monthStart = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const fourWeeksAgo = new Date(now.getTime() - 28 * 24 * 60 * 60 * 1000);

    const [zones, readings] = await Promise.all([
      prisma.zone.findMany({ orderBy: { code: "asc" } }),
      prisma.reading.findMany({
        where: { recordedAt: { gte: monthStart }, source: "seed" },
        select: { zoneId: true, energyKwh: true, powerKw: true, currentAmps: true, recordedAt: true }
      })
    ]);

    const orderedZones = [...zones].sort((a, b) => ZONE_ORDER.indexOf(a.code as ZoneCode) - ZONE_ORDER.indexOf(b.code as ZoneCode));
    const zoneAgg = new Map<string, { kwh: number; ampsSum: number; ampsCount: number; peak: number }>();
    const plantByTime = new Map<number, number>();
    const weekAgg = new Map<number, number>();
    const weekMs = 7 * 24 * 60 * 60 * 1000;
    let totalKwh = 0;

    for (const reading of readings) {
      const agg = zoneAgg.get(reading.zoneId) ?? { kwh: 0, ampsSum: 0, ampsCount: 0, peak: 0 };
      agg.kwh += reading.energyKwh;
      agg.ampsSum += reading.currentAmps;
      agg.ampsCount += 1;
      agg.peak = Math.max(agg.peak, reading.powerKw);
      zoneAgg.set(reading.zoneId, agg);
      totalKwh += reading.energyKwh;

      plantByTime.set(reading.recordedAt.getTime(), (plantByTime.get(reading.recordedAt.getTime()) ?? 0) + reading.powerKw);

      if (reading.recordedAt >= fourWeeksAgo) {
        const weekIndex = Math.min(3, Math.max(0, Math.floor((reading.recordedAt.getTime() - fourWeeksAgo.getTime()) / weekMs)));
        weekAgg.set(weekIndex, (weekAgg.get(weekIndex) ?? 0) + reading.energyKwh);
      }
    }

    const maxDemandKw = Math.max(0, ...Array.from(plantByTime.values()));
    const baselineKwh = totalKwh / (1 - settings.savingsRate);
    const baselineDemand = maxDemandKw * 1.12;

    const optimized = buildBill(totalKwh, maxDemandKw, settings.tariff, settings.igv);
    const baseline = buildBill(baselineKwh, baselineDemand, settings.tariff, settings.igv);

    const byZone = orderedZones.map((zone) => {
      const agg = zoneAgg.get(zone.id) ?? { kwh: 0, ampsSum: 0, ampsCount: 0, peak: 0 };
      return {
        code: zone.code as ZoneCode,
        name: zone.shortName,
        color: zone.color,
        kwh: round(agg.kwh, 1),
        cost: round(agg.kwh * settings.tariff * (1 + settings.igv), 2),
        pct: totalKwh > 0 ? round((agg.kwh / totalKwh) * 100, 1) : 0,
        avgAmps: agg.ampsCount ? round(agg.ampsSum / agg.ampsCount, 2) : 0,
        peakKw: round(agg.peak, 2)
      };
    });

    const weeks = [0, 1, 2, 3].map((index) => {
      const currentKwh = weekAgg.get(index) ?? 0;
      const base = currentKwh / (1 - settings.savingsRate);
      const start = new Date(fourWeeksAgo.getTime() + index * weekMs);
      return {
        label: new Intl.DateTimeFormat("es-PE", { timeZone: "America/Lima", day: "2-digit", month: "short" }).format(start),
        currentKwh: round(currentKwh, 1),
        baselineKwh: round(base, 1),
        currentSoles: round(currentKwh * settings.tariff * (1 + settings.igv), 2),
        baselineSoles: round(base * settings.tariff * (1 + settings.igv), 2)
      };
    });

    const data: FinanceData = {
      periodLabel: `Últimos 30 días · ${new Intl.DateTimeFormat("es-PE", {
        timeZone: "America/Lima",
        month: "long",
        year: "numeric"
      }).format(now)}`,
      base: {
        kwh: round(totalKwh, 1),
        baselineKwh: round(baselineKwh, 1),
        maxDemandKw: round(maxDemandKw, 2),
        tariff: settings.tariff,
        igv: settings.igv,
        students: settings.students,
        classrooms: settings.classrooms,
        savingsRate: settings.savingsRate
      },
      bill: {
        optimized,
        baseline,
        monthlySaving: round(baseline.total - optimized.total, 2),
        yearlySaving: round((baseline.total - optimized.total) * 12, 2),
        savingPct: baseline.total > 0 ? round(((baseline.total - optimized.total) / baseline.total) * 100, 1) : 0
      },
      kpis: {
        kwhPerStudent: round(totalKwh / settings.students, 2),
        solesPerClassroom: round(optimized.total / settings.classrooms, 2),
        costPerKwh: totalKwh > 0 ? round(optimized.total / totalKwh, 3) : 0,
        co2Avoided: round((baselineKwh - totalKwh) * CO2_FACTOR, 1)
      },
      byZone,
      weeks
    };

    return NextResponse.json(data);
  } catch (error) {
    return serverError(error);
  }
}

function round(value: number, decimals: number) {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}
