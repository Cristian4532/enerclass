import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSettings } from "@/lib/settings";
import { efficiencyRating } from "@/lib/billing";
import { CO2_FACTOR, TREE_ABSORPTION, ZONE_ORDER } from "@/lib/constants";
import type { SustainabilityData, ZoneCode } from "@/lib/types";
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
    const weekMs = 7 * 24 * 60 * 60 * 1000;

    const [zones, readings] = await Promise.all([
      prisma.zone.findMany({ orderBy: { code: "asc" } }),
      prisma.reading.findMany({
        where: { recordedAt: { gte: monthStart }, source: "seed" },
        select: { zoneId: true, energyKwh: true, recordedAt: true }
      })
    ]);

    const zoneEnergy = new Map<string, number>();
    const weekEnergy = new Map<number, number>();
    let currentKwh = 0;

    for (const reading of readings) {
      zoneEnergy.set(reading.zoneId, (zoneEnergy.get(reading.zoneId) ?? 0) + reading.energyKwh);
      currentKwh += reading.energyKwh;
      if (reading.recordedAt >= fourWeeksAgo) {
        const index = Math.min(3, Math.max(0, Math.floor((reading.recordedAt.getTime() - fourWeeksAgo.getTime()) / weekMs)));
        weekEnergy.set(index, (weekEnergy.get(index) ?? 0) + reading.energyKwh);
      }
    }

    const baselineKwh = currentKwh / (1 - settings.savingsRate);
    const avoidedKwh = baselineKwh - currentKwh;
    const co2Avoided = avoidedKwh * CO2_FACTOR;
    const kwhPerStudent = currentKwh / settings.students;
    const efficiency = efficiencyRating(kwhPerStudent);

    const orderedZones = [...zones].sort((a, b) => ZONE_ORDER.indexOf(a.code as ZoneCode) - ZONE_ORDER.indexOf(b.code as ZoneCode));
    const byZone = orderedZones.map((zone) => {
      const kwh = zoneEnergy.get(zone.id) ?? 0;
      const avoided = kwh / (1 - settings.savingsRate) - kwh;
      return {
        code: zone.code as ZoneCode,
        name: zone.shortName,
        color: zone.color,
        kwh: round(kwh, 1),
        co2: round(avoided * CO2_FACTOR, 1),
        pct: avoidedKwh > 0 ? round((avoided / avoidedKwh) * 100, 1) : 0
      };
    });

    const weeks = [0, 1, 2, 3].map((index) => {
      const energy = weekEnergy.get(index) ?? 0;
      const baseline = energy / (1 - settings.savingsRate);
      const start = new Date(fourWeeksAgo.getTime() + index * weekMs);
      return {
        label: new Intl.DateTimeFormat("es-PE", { timeZone: "America/Lima", day: "2-digit", month: "short" }).format(start),
        currentKwh: round(energy, 1),
        baselineKwh: round(baseline, 1),
        co2Avoided: round((baseline - energy) * CO2_FACTOR, 1)
      };
    });

    const data: SustainabilityData = {
      periodLabel: `Últimos 30 días · ${new Intl.DateTimeFormat("es-PE", {
        timeZone: "America/Lima",
        month: "long",
        year: "numeric"
      }).format(now)}`,
      currentKwh: round(currentKwh, 1),
      baselineKwh: round(baselineKwh, 1),
      avoidedKwh: round(avoidedKwh, 1),
      co2Avoided: round(co2Avoided, 1),
      treesEquivalent: round(co2Avoided / TREE_ABSORPTION, 1),
      savingsRate: round(settings.savingsRate * 100, 1),
      efficiency: {
        ...efficiency,
        kwhPerStudent: round(kwhPerStudent, 2)
      },
      weeks,
      equivalences: {
        carKm: Math.round(co2Avoided / 0.192),
        ledHours: Math.round(avoidedKwh / 0.009),
        smartphones: Math.round(avoidedKwh / 0.02)
      },
      byZone
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
