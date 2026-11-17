import { execSync } from "node:child_process";

/**
 * Genera el cliente de Prisma adecuado antes de instalar/compilar:
 *  - Vercel: PostgreSQL (prisma/schema.postgres.prisma).
 *  - Local: SQLite (prisma/schema.prisma).
 *
 * Se usa en `postinstall`, porque Vercel instala dependencias antes de
 * ejecutar `npm run build` y el esquema SQLite no acepta una URL PostgreSQL.
 */
const onVercel = process.env.VERCEL === "1";
const schema = onVercel ? "prisma/schema.postgres.prisma" : "prisma/schema.prisma";

console.log(`[EnerClass] Generando cliente Prisma con ${schema}`);
execSync(`npx --no-install prisma generate --schema ${schema}`, {
  stdio: "inherit",
  env: process.env
});
