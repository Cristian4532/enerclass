import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { ROLES, type RoleKey } from "@/lib/constants";
import { apiUser, badRequest, forbidden, serverError, unauthorized } from "@/lib/api";

export const dynamic = "force-dynamic";

function publicUser(user: {
  id: string;
  name: string;
  email: string;
  role: string;
  position: string;
  active: boolean;
  createdAt: Date;
}) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    position: user.position,
    active: user.active,
    createdAt: user.createdAt.toISOString()
  };
}

export async function GET() {
  try {
    const user = await apiUser();
    if (!user) return unauthorized();

    const users = await prisma.user.findMany({ orderBy: { createdAt: "asc" } });
    return NextResponse.json({
      users: users.map(publicUser),
      currentUserId: user.id,
      canManage: ["DIRECCION", "CIST"].includes(user.role)
    });
  } catch (error) {
    return serverError(error);
  }
}

export async function POST(request: Request) {
  try {
    const current = await apiUser();
    if (!current) return unauthorized();
    if (!["DIRECCION", "CIST"].includes(current.role)) {
      return forbidden("Solo Dirección o Soporte CIST pueden crear usuarios.");
    }

    const body = await request.json();
    const name = String(body?.name ?? "").trim();
    const email = String(body?.email ?? "").trim().toLowerCase();
    const password = String(body?.password ?? "");
    const role = String(body?.role ?? "") as RoleKey;
    const position = String(body?.position ?? "").trim();

    if (name.length < 4) return badRequest("El nombre completo debe tener al menos 4 caracteres.");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return badRequest("Ingrese un correo electrónico válido.");
    if (password.length < 8) return badRequest("La contraseña debe tener al menos 8 caracteres.");
    if (!Object.keys(ROLES).includes(role)) return badRequest("Rol institucional inválido.");

    const exists = await prisma.user.findUnique({ where: { email } });
    if (exists) return NextResponse.json({ error: "Ya existe un usuario registrado con ese correo." }, { status: 409 });

    const created = await prisma.user.create({
      data: {
        name,
        email,
        passwordHash: await bcrypt.hash(password, 10),
        role,
        position: position || ROLES[role].position,
        active: body?.active === false ? false : true
      }
    });

    return NextResponse.json({ ok: true, user: publicUser(created) }, { status: 201 });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return NextResponse.json({ error: "Ya existe un usuario registrado con ese correo." }, { status: 409 });
    }
    return serverError(error);
  }
}
