import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getZoneSnapshot } from "@/lib/zones";
import type { TelemetryPayload, ZoneCode } from "@/lib/types";
import { apiUser, serverError, unauthorized } from "@/lib/api";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const user = await apiUser();
    if (!user) return unauthorized();

    const now = new Date();
    const snapshot = await getZoneSnapshot(new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000));
    const [recent, totalReadings, earliest] = await Promise.all([
      prisma.reading.findMany({
        take: 30,
        orderBy: { recordedAt: "desc" },
        include: { zone: { select: { code: true, name: true, color: true } } }
      }),
      prisma.reading.count(),
      prisma.reading.findFirst({ orderBy: { recordedAt: "asc" }, select: { recordedAt: true } })
    ]);

    const uptimeMs = earliest ? now.getTime() - earliest.recordedAt.getTime() : 0;
    const days = Math.floor(uptimeMs / 86400000);
    const hours = Math.floor((uptimeMs % 86400000) / 3600000);

    return NextResponse.json({
      deviceId: snapshot.zones[0]?.deviceId ?? "ESP32-LP-01",
      online: snapshot.zones.some((zone) => zone.online),
      zones: snapshot.zones,
      recent: recent.map((reading) => {
        const payload: TelemetryPayload & { recordedAt: string; source: string } = {
          deviceId: reading.deviceId,
          zone: reading.zone.code as ZoneCode,
          currentAmps: reading.currentAmps,
          voltageVolts: reading.voltageVolts,
          powerKw: reading.powerKw,
          powerFactor: reading.powerFactor,
          tariffSoles: reading.tariffSoles,
          intervalSeconds: undefined,
          recordedAt: reading.recordedAt.toISOString(),
          source: reading.source
        };
        return {
          id: reading.id,
          zoneCode: reading.zone.code as ZoneCode,
          zoneName: reading.zone.name,
          color: reading.zone.color,
          payload,
          receivedAt: reading.recordedAt.toISOString()
        };
      }),
      firmwareVersion: "v2.4.1",
      uptimeLabel: `${days} d ${hours} h`,
      totalReadings
    });
  } catch (error) {
    return serverError(error);
  }
}
