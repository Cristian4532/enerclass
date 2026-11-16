import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
  prismaConfigured: Promise<void> | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"]
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

/**
 * SQLite en modo WAL: permite lecturas concurrentes mientras el ESP32 escribe
 * telemetría, evitando bloqueos "database is locked" en laptops básicas.
 * Si el proyecto se despliega con PostgreSQL/Turso, los PRAGMA se omiten.
 */
async function configureDatabase(client: PrismaClient) {
  const url = process.env.DATABASE_URL ?? "";
  if (!url.startsWith("file:")) return;

  try {
    await client.$queryRawUnsafe("PRAGMA journal_mode = WAL;");
    await client.$queryRawUnsafe("PRAGMA synchronous = NORMAL;");
    await client.$queryRawUnsafe("PRAGMA busy_timeout = 5000;");
    await client.$queryRawUnsafe("PRAGMA cache_size = -16000;");
    await client.$queryRawUnsafe("PRAGMA wal_autocheckpoint = 1000;");
    await client.$queryRawUnsafe("PRAGMA foreign_keys = ON;");
  } catch (error) {
    console.warn("[EnerClass] No se pudieron aplicar los PRAGMA de SQLite:", error);
  }
}

export const dbReady: Promise<void> =
  globalForPrisma.prismaConfigured ?? configureDatabase(prisma);

globalForPrisma.prismaConfigured = dbReady;
