import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiUser, badRequest, serverError, unauthorized } from "@/lib/api";

export const dynamic = "force-dynamic";

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  try {
    const user = await apiUser();
    if (!user) return unauthorized();

    const body = await request.json();
    const status = String(body?.status ?? "");
    if (!["PENDIENTE", "INSPECCIONADO"].includes(status)) return badRequest("Estado de inspección inválido.");

    const existing = await prisma.ghostFinding.findUnique({ where: { id: params.id } });
    if (!existing) return NextResponse.json({ error: "Hallazgo no encontrado." }, { status: 404 });

    const updated = await prisma.ghostFinding.update({
      where: { id: params.id },
      data:
        status === "INSPECCIONADO"
          ? { status, inspectedAt: new Date(), inspector: user.name }
          : { status, inspectedAt: null, inspector: null }
    });

    return NextResponse.json({ ok: true, finding: { ...updated, detectedAt: updated.detectedAt.toISOString(), inspectedAt: updated.inspectedAt?.toISOString() ?? null } });
  } catch (error) {
    return serverError(error);
  }
}
