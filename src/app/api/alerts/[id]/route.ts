import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiUser, badRequest, serverError, unauthorized } from "@/lib/api";

export const dynamic = "force-dynamic";

const VALID_STATUS = ["PENDIENTE", "EN_REVISION", "RESUELTA"];

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  try {
    const user = await apiUser();
    if (!user) return unauthorized();

    const body = await request.json();
    const status = String(body?.status ?? "");
    if (!VALID_STATUS.includes(status)) return badRequest("Estado de alerta inválido.");

    const existing = await prisma.alert.findUnique({ where: { id: params.id } });
    if (!existing) return NextResponse.json({ error: "Alerta no encontrada." }, { status: 404 });

    const updated = await prisma.alert.update({
      where: { id: params.id },
      data:
        status === "RESUELTA"
          ? { status, resolvedAt: new Date(), resolvedBy: user.name }
          : { status, resolvedAt: null, resolvedBy: null }
    });

    return NextResponse.json({ ok: true, alert: { ...updated, createdAt: updated.createdAt.toISOString(), resolvedAt: updated.resolvedAt?.toISOString() ?? null } });
  } catch (error) {
    return serverError(error);
  }
}
