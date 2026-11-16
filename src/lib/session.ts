import "server-only";
import crypto from "crypto";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";

export const SESSION_COOKIE = "enerclass_session";
const SESSION_MAX_AGE = 60 * 60 * 24 * 7;

export type SessionPayload = {
  uid: string;
  role: string;
  exp: number;
};

function secret() {
  return process.env.AUTH_SECRET || "enerclass-development-secret";
}

function sign(value: string) {
  return crypto.createHmac("sha256", secret()).update(value).digest("base64url");
}

export function createToken(payload: Omit<SessionPayload, "exp"> & { exp?: number }) {
  const body = Buffer.from(
    JSON.stringify({ ...payload, exp: payload.exp ?? Math.floor(Date.now() / 1000) + SESSION_MAX_AGE })
  ).toString("base64url");
  return `${body}.${sign(body)}`;
}

export function verifyToken(token: string | undefined | null): SessionPayload | null {
  if (!token) return null;
  const [body, signature] = token.split(".");
  if (!body || !signature) return null;
  const expected = sign(body);
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  try {
    const payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as SessionPayload;
    if (!payload?.uid || !payload?.exp || payload.exp < Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch {
    return null;
  }
}

/**
 * La cookie solo se marca `Secure` cuando la petición llega por HTTPS.
 * Así el acceso por red local (`http://192.168.x.x:3000`) funciona en
 * cualquier navegador, y en Vercel/HTTPS la cookie sigue siendo segura.
 */
export function sessionCookieOptions(request: Request) {
  const forwarded = request.headers.get("x-forwarded-proto");
  const protocol = forwarded ? forwarded.split(",")[0].trim() : new URL(request.url).protocol.replace(":", "");
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: protocol === "https",
    path: "/",
    maxAge: SESSION_MAX_AGE
  };
}

export async function getSessionUser() {
  const token = cookies().get(SESSION_COOKIE)?.value;
  const payload = verifyToken(token);
  if (!payload) return null;
  const user = await prisma.user.findUnique({
    where: { id: payload.uid },
    select: { id: true, name: true, email: true, role: true, position: true, active: true, createdAt: true }
  });
  if (!user || !user.active) return null;
  return user;
}

export async function requireSession() {
  return getSessionUser();
}
