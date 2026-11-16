import "server-only";
import { prisma } from "@/lib/prisma";
import { ZONE_ORDER } from "@/lib/constants";
import type { ZoneCode, ZoneLive } from "@/lib/types";

export async function getZoneSnapshot(since: Date) {
  const [zones, grouped] = await Promise.all([
    prisma.zone.findMany({
      include: {
        readings: { orderBy: { recordedAt: "desc" }, take: 1 }
      }
    }),
    prisma.reading.groupBy({
      by: ["zoneId"],
      where: { recordedAt: { gte: since } },
      _sum: { energyKwh: true, costSoles: true },
      _max: { powerKw: true }
    })
  ]);

  const aggregates = new Map(grouped.map((row) => [row.zoneId, row]));
  const totalKwh = grouped.reduce((sum, row) => sum + (row._sum.energyKwh ?? 0), 0);

  const sorted = [...zones].sort(
    (a, b) => ZONE_ORDER.indexOf(a.code as ZoneCode) - ZONE_ORDER.indexOf(b.code as ZoneCode)
  );

  const data: ZoneLive[] = sorted.map((zone) => {
    const last = zone.readings[0];
    const agg = aggregates.get(zone.id);
    const monthKwh = agg?._sum.energyKwh ?? 0;
    return {
      id: zone.id,
      code: zone.code as ZoneCode,
      name: zone.name,
      shortName: zone.shortName,
      color: zone.color,
      icon: zone.icon,
      deviceId: zone.deviceId,
      sensorModel: zone.sensorModel,
      online: zone.online && Date.now() - zone.lastSync.getTime() < 24 * 60 * 60 * 1000,
      calibration: zone.calibration,
      offsetVoltage: zone.offsetVoltage,
      wifiRssi: last?.source === "live" ? zone.wifiRssi : zone.wifiRssi,
      lastSync: zone.lastSync.toISOString(),
      currentKw: last?.powerKw ?? 0,
      currentAmps: last?.currentAmps ?? 0,
      voltageVolts: last?.voltageVolts ?? 0,
      powerFactor: last?.powerFactor ?? 0,
      lastReadingAt: last?.recordedAt.toISOString() ?? null,
      monthKwh: Math.round(monthKwh * 10) / 10,
      monthCost: Math.round((agg?._sum.costSoles ?? 0) * 100) / 100,
      sharePct: totalKwh > 0 ? Math.round((monthKwh / totalKwh) * 1000) / 10 : 0
    };
  });

  return { zones: data, totalKwh };
}
