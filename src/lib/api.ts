import "server-only";
import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session";

export async function apiUser() {
  return getSessionUser();
}

export function unauthorized() {
  return NextResponse.json({ error: "No autorizado. Inicie sesión nuevamente." }, { status: 401 });
}

export function forbidden(message = "No tiene permisos para realizar esta acción.") {
  return NextResponse.json({ error: message }, { status: 403 });
}

export function badRequest(message: string) {
  return NextResponse.json({ error: message }, { status: 400 });
}

export function serverError(error: unknown) {
  console.error("[EnerClass API]", error);
  const message = error instanceof Error ? error.message : "Error interno del servidor";
  return NextResponse.json({ error: message }, { status: 500 });
}
