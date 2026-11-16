import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { SESSION_COOKIE, createToken, sessionCookieOptions } from "@/lib/session";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const email = String(body?.email ?? "").trim().toLowerCase();
    const password = String(body?.password ?? "");

    if (!email || !password) {
      return NextResponse.json({ error: "Ingrese correo y contraseña." }, { status: 400 });
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !user.active) {
      return NextResponse.json({ error: "Credenciales inválidas o usuario inactivo." }, { status: 401 });
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      return NextResponse.json({ error: "Credenciales inválidas. Verifique su correo y contraseña." }, { status: 401 });
    }

    const token = createToken({ uid: user.id, role: user.role });
    const response = NextResponse.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        position: user.position
      }
    });
    response.cookies.set(SESSION_COOKIE, token, sessionCookieOptions(request));
    return response;
  } catch (error) {
    console.error("[EnerClass login]", error);
    return NextResponse.json({ error: "Error interno al iniciar sesión." }, { status: 500 });
  }
}
