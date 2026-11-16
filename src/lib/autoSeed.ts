import "server-only";
import { dbReady, prisma } from "@/lib/prisma";
import { seedDatabase } from "@/lib/seed-database";

const globalForSeed = globalThis as unknown as {
  enerclassSeed?: Promise<void>;
};

/**
 * Autoinicialización portable: si la base SQLite viaja vacía a otra laptop,
 * se crean usuarios, zonas, umbrales, sensores y 30 días de historial sin
 * ejecutar comandos manuales. Es idempotente y solo actúa con la BD vacía.
 */
export async function ensureDatabaseReady(): Promise<void> {
  if (globalForSeed.enerclassSeed) return globalForSeed.enerclassSeed;

  globalForSeed.enerclassSeed = (async () => {
    await dbReady;

    const [userCount, zoneCount] = await Promise.all([
      prisma.user.count(),
      prisma.zone.count()
    ]);

    if (userCount > 0 || zoneCount > 0) return;

    console.log("[EnerClass] Base de datos vacía detectada: sembrando datos institucionales…");
    try {
      const result = await seedDatabase(prisma, { reset: false, log: false });
      console.log(
        `[EnerClass] Auto-seed listo: ${result.users} usuarios, ${result.zones} zonas, ` +
          `${result.readings} lecturas, ${result.alerts} alertas y ${result.findings} hallazgos.`
      );
    } catch (error) {
      // Si dos instancias arrancan a la vez, la segunda puede chocar con los
      // índices únicos. En ese caso verificamos si la primera ya sembró.
      const [users, zones] = await Promise.all([
        prisma.user.count().catch(() => 0),
        prisma.zone.count().catch(() => 0)
      ]);
      if (users > 0 && zones > 0) return;
      console.error(
        "[EnerClass] No se pudo auto-sembrar la base. Verifique que las tablas existan " +
          "(ejecute `npm run setup` una vez).",
        error
      );
    }
  })().catch((error) => {
    globalForSeed.enerclassSeed = undefined;
    console.error("[EnerClass] Error al inicializar la base de datos:", error);
  });

  return globalForSeed.enerclassSeed;
}
