/**
 * Hook de instrumentación de Next.js: se ejecuta una sola vez al arrancar el
 * servidor (dev o producción). Configura SQLite/WAL y auto-siembra la BD si
 * está vacía, sin comandos manuales para el docente o el técnico CIST.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  if (process.env.NEXT_PHASE === "phase-production-build") return;

  const { ensureDatabaseReady } = await import("./lib/autoSeed");
  await ensureDatabaseReady();
}
