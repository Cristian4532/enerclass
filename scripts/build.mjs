import { execSync } from "node:child_process";

/**
 * Compilacion para los dos entornos de EnerClass:
 *  - Local (laptops del colegio): SQLite con prisma/schema.prisma.
 *  - Vercel: PostgreSQL con prisma/schema.postgres.prisma.
 *
 * Vercel define VERCEL=1 durante la compilacion. El cliente generado en ese
 * momento es el que queda empaquetado en las funciones del despliegue.
 */
const onVercel = process.env.VERCEL === "1";
const schema = onVercel ? "prisma/schema.postgres.prisma" : "prisma/schema.prisma";

function run(command) {
  execSync(command, { stdio: "inherit", env: process.env });
}

console.log(`[EnerClass] Generando cliente Prisma con ${schema}`);
run(`npx --no-install prisma generate --schema ${schema}`);

console.log("[EnerClass] Compilando la aplicacion");
run("npx --no-install next build");
