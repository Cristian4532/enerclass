import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** Oculta la contraseña si aparece dentro de un mensaje de error. */
function mask(value: string): string {
  return value.replace(/\/\/([^:/@\s]+):([^@\s]+)@/g, "//$1:***@");
}

export async function GET() {
  const url = process.env.DATABASE_URL ?? "";
  const summary = {
    commit: (process.env.VERCEL_GIT_COMMIT_SHA ?? "local").slice(0, 7),
    environment: process.env.VERCEL_ENV ?? "local",
    region: process.env.VERCEL_REGION ?? null,
    hasDatabaseUrl: Boolean(url),
    databaseProtocol: url ? url.split(":")[0] : null,
    usesPooler: url.includes("-pooler."),
    hasPgbouncer: url.includes("pgbouncer=true"),
    hasAuthSecret: Boolean(process.env.AUTH_SECRET),
    hasIotApiKey: Boolean(process.env.IOT_API_KEY)
  };

  try {
    const users = await prisma.user.count();
    return NextResponse.json(
      { ...summary, database: "ok", users },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    const detail = error as { name?: string; code?: string; message?: string };
    return NextResponse.json(
      {
        ...summary,
        database: "error",
        errorName: detail.name ?? null,
        errorCode: detail.code ?? null,
        errorMessage: mask(String(detail.message ?? "")).slice(0, 500)
      },
      { status: 200, headers: { "Cache-Control": "no-store" } }
    );
  }
}
