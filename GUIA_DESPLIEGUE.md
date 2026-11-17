# Guía de despliegue gratuito — EnerClass

> **Importante:** EnerClass funciona sin configuración en una laptop con SQLite
> (`prisma/dev.db`). En la nube, Vercel no conserva archivos SQLite porque su
> sistema de archivos es efímero. Para abrirlo desde cualquier laptop del mundo
> use una base remota gratuita: **Neon (PostgreSQL)** es la ruta recomendada;
> **Turso (libSQL)** es una alternativa válida con un adaptador adicional.

## Opción recomendada: Vercel + Neon (PostgreSQL)

### Paso 1 — Suba el proyecto a GitHub e impórtelo en Vercel

1. Cree un repositorio en GitHub y suba la carpeta `enerclass` (sin `node_modules` ni `.next`).
2. Entre a [vercel.com](https://vercel.com), elija **Add New → Project** e importe el repositorio.
3. Framework: **Next.js**. No despliegue todavía; primero configure la base y las variables.

### Paso 2 — Cree la base gratuita en Neon

1. Regístrese en [neon.tech](https://neon.tech) y cree un proyecto (plan gratuito).
2. Copie dos cadenas desde **Connect**:
   - **Pooled connection string**: se usa en Vercel para la aplicación.
   - **Direct connection string**: se usa una sola vez para crear las tablas.
3. El proyecto ya trae dos esquemas:
   - `prisma/schema.prisma`: SQLite, para el sistema instalado en el colegio.
   - `prisma/schema.postgres.prisma`: PostgreSQL, para Vercel.

   No cambie el proveedor del esquema local: dejaría sin base de datos a la
   versión que funciona sin internet en las laptops.

4. Con la cadena **directa** en `DATABASE_URL`, cree las tablas y siembre los
   datos una sola vez:

```bat
set DATABASE_URL=postgresql://usuario:clave@ep-xxx.us-east-2.aws.neon.tech/neondb?sslmode=require
npm run db:generate:postgres
npm run db:push:postgres
npm run db:seed:postgres
```

En PowerShell:

```powershell
$env:DATABASE_URL="postgresql://usuario:clave@ep-xxx.us-east-2.aws.neon.tech/neondb?sslmode=require"
npm run db:generate:postgres
npm run db:push:postgres
npm run db:seed:postgres
```

> Si aparece `P1001: Can't reach database server` en una red que solo tiene
> IPv4, agregue `&hostaddr=<IPv4 que resuelve el servidor Neon>` al final de la
> cadena. Así Prisma usa IPv4 y conserva el nombre del host para TLS.

Después de sembrar, la compilación local (`npm run build`) vuelve a generar el
cliente SQLite automáticamente.

### Paso 3 — Configure las variables en Vercel

En **Project → Settings → Environment Variables** agregue:

| Variable | Valor |
| --- | --- |
| `DATABASE_URL` | Cadena **pooled** de Neon, terminada en `?sslmode=require&pgbouncer=true&connect_timeout=15` |
| `AUTH_SECRET` | Secreto aleatorio de 32+ caracteres |
| `IOT_API_KEY` | Clave para el ESP32 (ej. `LP-2001-iot-2026`) |
| `NODE_VERSION` | `22` |

Opcional: `TZ=America/Lima`.

> Quite `channel_binding=require` de la cadena de Neon: Prisma no lo necesita y
> puede impedir la conexión. No pegue la cadena directa en Vercel.

### Paso 4 — Despliegue y conecte el ESP32

1. Ejecute **Deploy**. Vercel detecta `VERCEL=1` y `scripts/build.mjs` genera el
   cliente Prisma con `prisma/schema.postgres.prisma` antes de compilar.
2. Abra la URL `https://su-proyecto.vercel.app` e ingrese con las credenciales
   demo. La base ya está sembrada desde el Paso 2.
3. Cambie las contraseñas demo desde **Usuarios**.
4. En el firmware ESP32 apunte `API_HOST` al dominio de Vercel y envíe la cabecera
   `x-api-key: <IOT_API_KEY>` en cada `POST /api/iot/telemetry`.

---

## Alternativa: Vercel + Turso (libSQL)

Turso ofrece una capa gratuita generosa, pero Prisma requiere el adaptador
libSQL. Pasos resumidos:

1. Instale las dependencias:
   ```bat
   npm install @prisma/adapter-libsql @libsql/client
   ```
2. Habilite el adaptador en `prisma/schema.prisma`:
   ```prisma
   generator client {
     provider        = "prisma-client-js"
     previewFeatures = ["driverAdapters"]
   }
   ```
3. Cree la base en [turso.tech](https://turso.tech), copie la URL y el token, y
   reemplace la creación de `PrismaClient` en `src/lib/prisma.ts` por:
   ```ts
   import { PrismaLibSQL } from "@prisma/adapter-libsql";
   import { createClient } from "@libsql/client";

   const libsql = createClient({
     url: process.env.TURSO_DATABASE_URL!,
     authToken: process.env.TURSO_AUTH_TOKEN!
   });
   const adapter = new PrismaLibSQL(libsql);
   export const prisma = new PrismaClient({ adapter });
   ```
4. En Vercel configure `TURSO_DATABASE_URL` y `TURSO_AUTH_TOKEN`. Cree las tablas
   con `turso db shell <nombre> < schema.sql` (genere el SQL con
   `npx prisma migrate diff --from-empty --to-schema-datamodel prisma/schema.prisma --script`).

---

## Alternativa: Render

Render permite SQLite **solo con disco persistente** (plan de pago). En el plan
gratuito el sistema de archivos es efímero y los datos se pierden en cada
reinicio. Si usa Render:

- Build command: `npm install && npm run build`
- Start command: `npx prisma db push && npm run start`
- Disco persistente montado en `/var/data`
- `DATABASE_URL=file:/var/data/enerclass.db`

Para una solución realmente gratuita, use **Vercel + Neon**.

## Seguridad mínima antes de publicar

- Genere un `AUTH_SECRET` real: `openssl rand -hex 32` o un generador de contraseñas.
- No suba `.env` a GitHub.
- Cambie las tres contraseñas demo desde **Usuarios y roles**.
- Configure `IOT_API_KEY` y exija la cabecera `x-api-key` al ESP32.
- El endpoint `/api/system/network-info` es público a propósito para mostrar la IP
  local en el login; en la nube solo devuelve la URL pública.
