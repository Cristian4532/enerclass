import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiUser, unauthorized } from "@/lib/api";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await apiUser();
  if (!user) return unauthorized();

  const [pending, critical] = await Promise.all([
    prisma.alert.count({ where: { status: { not: "RESUELTA" } } }),
    prisma.alert.count({ where: { status: { not: "RESUELTA" }, severity: "CRITICA" } })
  ]);

  return NextResponse.json({ pending, critical });
}
