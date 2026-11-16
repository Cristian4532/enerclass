import { NextRequest, NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { apiUser, serverError, unauthorized } from "@/lib/api";

export const dynamic = "force-dynamic";

function limaDayRange(from: string | null, to: string | null) {
  const range: { gte?: Date; lte?: Date } = {};
  if (from && /^\d{4}-\d{2}-\d{2}$/.test(from)) {
    const date = new Date(`${from}T00:00:00.000-05:00`);
    if (!Number.isNaN(date.getTime())) range.gte = date;
  }
  if (to && /^\d{4}-\d{2}-\d{2}$/.test(to)) {
    const date = new Date(`${to}T23:59:59.999-05:00`);
    if (!Number.isNaN(date.getTime())) range.lte = date;
  }
  return Object.keys(range).length ? range : undefined;
}

export async function GET(request: NextRequest) {
  const startedAt = Date.now();
  try {
    const user = await apiUser();
    if (!user) return unauthorized();

    const params = request.nextUrl.searchParams;
    const page = Math.max(1, Number(params.get("page") ?? 1) || 1);
    const pageSize = Math.min(50, Math.max(1, Number(params.get("pageSize") ?? 10) || 10));
    const zone = params.get("zone");
    const from = params.get("from");
    const to = params.get("to");

    const where: Prisma.ReadingWhereInput = {};
    if (zone) where.zone = { code: zone };
    const dateRange = limaDayRange(from, to);
    if (dateRange) where.recordedAt = dateRange;

    const [readings, total, zones] = await Promise.all([
      prisma.reading.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { recordedAt: "desc" },
        include: { zone: { select: { code: true, shortName: true, color: true } } }
      }),
      prisma.reading.count({ where }),
      prisma.zone.findMany({ orderBy: { code: "asc" }, select: { code: true, shortName: true } })
    ]);

    const response = NextResponse.json({
      readings: readings.map((reading) => ({
        id: reading.id,
        zoneCode: reading.zone.code,
        zoneName: reading.zone.shortName,
        zoneColor: reading.zone.color,
        deviceId: reading.deviceId,
        currentAmps: reading.currentAmps,
        voltageVolts: reading.voltageVolts,
        powerKw: reading.powerKw,
        powerFactor: reading.powerFactor,
        energyKwh: reading.energyKwh,
        costSoles: reading.costSoles,
        source: reading.source,
        isSchoolHours: reading.isSchoolHours,
        recordedAt: reading.recordedAt.toISOString()
      })),
      total,
      page,
      pageSize,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
      zones
    });
    response.headers.set("Server-Timing", `db;dur=${Date.now() - startedAt}`);
    return response;
  } catch (error) {
    return serverError(error);
  }
}
