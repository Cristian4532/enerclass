import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { ROLES, type RoleKey } from "@/lib/constants";
import { apiUser, badRequest, forbidden, serverError, unauthorized } from "@/lib/api";

export const dynamic = "force-dynamic";

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  try {
    const current = await apiUser();
    if (!current) return unauthorized();
    if (!["DIRECCION", "CIST"].includes(current.role)) {
      return forbidden("Solo Dirección o Soporte CIST pueden editar usuarios.");
    }

    const existing = await prisma.user.findUnique({ where: { id: params.id } });
    if (!existing) return NextResponse.json({ error: "Usuario no encontrado." }, { status: 404 });

    const body = await request.json();
    const data: {
      name?: string;
      email?: string;
      role?: string;
      position?: string;
      active?: boolean;
      passwordHash?: string;
    } = {};

    if (body.name !== undefined) {
      const name = String(body.name).trim();
      if (name.length < 4) return badRequest("El nombre completo debe tener al menos 4 caracteres.");
      data.name = name;
    }

    if (body.email !== undefined) {
      const email = String(body.email).trim().toLowerCase();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return badRequest("Ingrese un correo electrónico válido.");
      const duplicate = await prisma.user.findFirst({ where: { email, NOT: { id: params.id } } });
      if (duplicate) return NextResponse.json({ error: "Ese correo ya está asignado a otro usuario." }, { status: 409 });
      data.email = email;
    }

    if (body.role !== undefined) {
      const role = String(body.role) as RoleKey;
      if (!Object.keys(ROLES).includes(role)) return badRequest("Rol institucional inválido.");
      if (existing.role === "DIRECCION" && role !== "DIRECCION") {
        const directionCount = await prisma.user.count({ where: { role: "DIRECCION", active: true } });
        if (directionCount <= 1) return badRequest("Debe existir al menos un usuario activo con rol Dirección.");
      }
      data.role = role;
    }

    if (body.position !== undefined) data.position = String(body.position).trim();

    if (body.active !== undefined) {
      const active = Boolean(body.active);
      if (!active && params.id === current.id) return badRequest("No puede desactivar su propia cuenta.");
      if (!active && existing.role === "DIRECCION") {
        const directionCount = await prisma.user.count({ where: { role: "DIRECCION", active: true } });
        if (directionCount <= 1) return badRequest("Debe existir al menos un usuario activo con rol Dirección.");
      }
      data.active = active;
    }

    if (body.password) {
      const password = String(body.password);
      if (password.length < 8) return badRequest("La contraseña debe tener al menos 8 caracteres.");
      data.passwordHash = await bcrypt.hash(password, 10);
    }

    const updated = await prisma.user.update({ where: { id: params.id }, data });
    return NextResponse.json({
      ok: true,
      user: {
        id: updated.id,
        name: updated.name,
        email: updated.email,
        role: updated.role,
        position: updated.position,
        active: updated.active,
        createdAt: updated.createdAt.toISOString()
      }
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return NextResponse.json({ error: "Ese correo ya está asignado a otro usuario." }, { status: 409 });
    }
    return serverError(error);
  }
}

export async function DELETE(_request: Request, { params }: { params: { id: string } }) {
  try {
    const current = await apiUser();
    if (!current) return unauthorized();
    if (!["DIRECCION", "CIST"].includes(current.role)) {
      return forbidden("Solo Dirección o Soporte CIST pueden eliminar usuarios.");
    }
    if (params.id === current.id) return badRequest("No puede eliminar su propia cuenta.");

    const existing = await prisma.user.findUnique({ where: { id: params.id } });
    if (!existing) return NextResponse.json({ error: "Usuario no encontrado." }, { status: 404 });

    if (existing.role === "DIRECCION") {
      const directionCount = await prisma.user.count({ where: { role: "DIRECCION", active: true } });
      if (directionCount <= 1) return badRequest("Debe existir al menos un usuario activo con rol Dirección.");
    }

    await prisma.user.delete({ where: { id: params.id } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return serverError(error);
  }
}
