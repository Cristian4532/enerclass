import { NextRequest, NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getSettings } from "@/lib/settings";
import { ZONE_ORDER } from "@/lib/constants";
import type { GhostData, ZoneCode } from "@/lib/types";
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
    const status = params.get("status");
    const zone = params.get("zone");
    const from = params.get("from");
    const to = params.get("to");

    const settings = await getSettings();
    const now = new Date();
    const periodStart = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const weekStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const baseWhere: Prisma.GhostFindingWhereInput = { detectedAt: { gte: periodStart } };
    const where: Prisma.GhostFindingWhereInput = { ...baseWhere };
    const dateRange = limaDayRange(from, to);
    if (dateRange) where.detectedAt = dateRange;
    if (status && ["PENDIENTE", "INSPECCIONADO"].includes(status)) where.status = status;
    if (zone) where.zone = { code: zone };

    const [zones, periodAgg, nightAgg, findings, findingsTotal, statusCounts, summary, lastScan] =
      await Promise.all([
        prisma.zone.findMany({ orderBy: { code: "asc" } }),
        prisma.reading.groupBy({
          by: ["zoneId", "isSchoolHours"],
          where: { recordedAt: { gte: periodStart }, source: "seed" },
          _sum: { energyKwh: true }
        }),
        prisma.reading.groupBy({
          by: ["zoneId"],
          where: { recordedAt: { gte: weekStart }, isSchoolHours: false, source: "seed" },
          _avg: { currentAmps: true }
        }),
        prisma.ghostFinding.findMany({
          where,
          skip: (page - 1) * pageSize,
          take: pageSize,
          include: { zone: true },
          orderBy: [{ status: "asc" }, { detectedAt: "desc" }]
        }),
        prisma.ghostFinding.count({ where }),
        prisma.ghostFinding.groupBy({
          by: ["status"],
          where: baseWhere,
          _count: { _all: true }
        }),
        prisma.ghostFinding.aggregate({
          where: baseWhere,
          _sum: { wastedKwh: true, lossSoles: true, residualAmps: true },
          _count: { _all: true }
        }),
        prisma.ghostFinding.findFirst({
          orderBy: { detectedAt: "desc" },
          select: { detectedAt: true }
        })
      ]);

    const zoneAgg = new Map<string, { lectivo: number; fantasma: number }>();
    let lectivoKwh = 0;
    let fantasmaKwh = 0;
    for (const row of periodAgg) {
      const agg = zoneAgg.get(row.zoneId) ?? { lectivo: 0, fantasma: 0 };
      const energy = row._sum.energyKwh ?? 0;
      if (row.isSchoolHours) {
        agg.lectivo += energy;
        lectivoKwh += energy;
      } else {
        agg.fantasma += energy;
        fantasmaKwh += energy;
      }
      zoneAgg.set(row.zoneId, agg);
    }

    const nightByZone = new Map(nightAgg.map((row) => [row.zoneId, row._avg.currentAmps ?? 0]));

    const orderedZones = [...zones].sort(
      (a, b) => ZONE_ORDER.indexOf(a.code as ZoneCode) - ZONE_ORDER.indexOf(b.code as ZoneCode)
    );
    const byZone = orderedZones.map((item) => {
      const agg = zoneAgg.get(item.id) ?? { lectivo: 0, fantasma: 0 };
      return {
        code: item.code as ZoneCode,
        name: item.shortName,
        color: item.color,
        lectivoKwh: round(agg.lectivo, 1),
        fantasmaKwh: round(agg.fantasma, 1),
        residualAmps: round(nightByZone.get(item.id) ?? 0, 2),
        lossSoles: round(agg.fantasma * settings.tariff, 2)
      };
    });

    const statusMap: Record<string, number> = { PENDIENTE: 0, INSPECCIONADO: 0 };
    statusCounts.forEach((row) => {
      statusMap[row.status] = row._count._all;
    });
    const totalRead = lectivoKwh + fantasmaKwh;

    const data: GhostData = {
      periodLabel: new Intl.DateTimeFormat("es-PE", {
        timeZone: "America/Lima",
        month: "long",
        year: "numeric"
      }).format(now),
      totals: {
        wastedKwh: round(summary._sum.wastedKwh ?? 0, 1),
        lossSoles: round(summary._sum.lossSoles ?? 0, 2),
        pending: statusMap.PENDIENTE,
        inspected: statusMap.INSPECCIONADO,
        residualAmps: round(summary._sum.residualAmps ?? 0, 2),
        ghostPct: totalRead > 0 ? round((fantasmaKwh / totalRead) * 100, 1) : 0,
        lectivoKwh: round(lectivoKwh, 1),
        fantasmaKwh: round(fantasmaKwh, 1)
      },
      byZone,
      findings: findings.map((finding) => ({
        id: finding.id,
        zoneId: finding.zoneId,
        zoneName: finding.zone.shortName,
        zoneCode: finding.zone.code as ZoneCode,
        zoneColor: finding.zone.color,
        equipment: finding.equipment,
        description: finding.description,
        residualAmps: finding.residualAmps,
        wastedKwh: finding.wastedKwh,
        lossSoles: finding.lossSoles,
        status: finding.status as "PENDIENTE" | "INSPECCIONADO",
        detectedAt: finding.detectedAt.toISOString(),
        inspectedAt: finding.inspectedAt?.toISOString() ?? null,
        inspector: finding.inspector
      })),
      findingsTotal,
      page,
      pageSize,
      totalPages: Math.max(1, Math.ceil(findingsTotal / pageSize)),
      counts: statusMap,
      lastScanAt: lastScan?.detectedAt.toISOString() ?? null
    };

    const response = NextResponse.json(data);
    response.headers.set("Server-Timing", `db;dur=${Date.now() - startedAt}`);
    return response;
  } catch (error) {
    return serverError(error);
  }
}

function round(value: number, decimals: number) {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}
