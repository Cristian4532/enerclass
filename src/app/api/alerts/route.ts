import { NextRequest, NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { apiUser, serverError, unauthorized } from "@/lib/api";
import type { AlertItem } from "@/lib/types";

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
    const severity = params.get("severity");
    const status = params.get("status");
    const search = params.get("q")?.trim();
    const zone = params.get("zone");
    const from = params.get("from");
    const to = params.get("to");
    const page = Math.max(1, Number(params.get("page") ?? 1) || 1);
    const pageSize = Math.min(50, Math.max(1, Number(params.get("pageSize") ?? 10) || 10));

    const baseWhere: Prisma.AlertWhereInput = {};
    if (zone) baseWhere.zone = { code: zone };
    const dateRange = limaDayRange(from, to);
    if (dateRange) baseWhere.createdAt = dateRange;
    if (search) {
      baseWhere.OR = [{ title: { contains: search } }, { message: { contains: search } }];
    }

    const where: Prisma.AlertWhereInput = { ...baseWhere };
    if (severity && ["CRITICA", "ADVERTENCIA", "INFORMATIVA"].includes(severity)) where.severity = severity;
    if (status && ["PENDIENTE", "EN_REVISION", "RESUELTA"].includes(status)) where.status = status;

    const [alerts, total, bySeverityRaw, byStatusRaw, zones] = await Promise.all([
      prisma.alert.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { createdAt: "desc" },
        include: { zone: { select: { name: true, code: true, color: true } } }
      }),
      prisma.alert.count({ where }),
      prisma.alert.groupBy({ by: ["severity"], where: baseWhere, _count: { _all: true } }),
      prisma.alert.groupBy({ by: ["status"], where: baseWhere, _count: { _all: true } }),
      prisma.zone.findMany({ orderBy: { code: "asc" }, select: { id: true, code: true, name: true, color: true } })
    ]);

    const bySeverity = { CRITICA: 0, ADVERTENCIA: 0, INFORMATIVA: 0 } as Record<string, number>;
    bySeverityRaw.forEach((row) => {
      bySeverity[row.severity] = row._count._all;
    });
    const byStatus = { PENDIENTE: 0, EN_REVISION: 0, RESUELTA: 0 } as Record<string, number>;
    byStatusRaw.forEach((row) => {
      byStatus[row.status] = row._count._all;
    });

    const items: AlertItem[] = alerts.map((alert) => ({
      id: alert.id,
      zoneId: alert.zoneId,
      zoneName: alert.zone?.name ?? null,
      zoneCode: alert.zone?.code ?? null,
      zoneColor: alert.zone?.color ?? null,
      type: alert.type,
      severity: alert.severity as AlertItem["severity"],
      title: alert.title,
      message: alert.message,
      value: alert.value,
      threshold: alert.threshold,
      status: alert.status as AlertItem["status"],
      createdAt: alert.createdAt.toISOString(),
      resolvedAt: alert.resolvedAt?.toISOString() ?? null,
      resolvedBy: alert.resolvedBy
    }));

    const response = NextResponse.json({
      alerts: items,
      total,
      page,
      pageSize,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
      counts: { bySeverity, byStatus },
      zones
    });
    response.headers.set("Server-Timing", `db;dur=${Date.now() - startedAt}`);
    return response;
  } catch (error) {
    return serverError(error);
  }
}
