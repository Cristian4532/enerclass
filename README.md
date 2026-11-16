# EnerClass — Seguimiento del consumo eléctrico

Aplicación web institucional para la **I.E. N° 2001 «Leoncio Prado»** (Rímac, Lima — Perú). Registra el consumo eléctrico de cuatro tableros con sensores **SCT-013** y un equipo **ESP32**, genera alertas, estima el ahorro en Soles y prepara reportes en PDF.

## Inicio rápido

1. Clone el repositorio y prepare las dependencias:

   ```bat
   git clone https://github.com/TU-USUARIO/enerclass.git
   cd enerclass
   npm install
   npm run setup
   ```

2. Haga doble clic en **`INICIAR_ENERCLASS.bat`** (modo producción, el más rápido).
3. Espere a que se abra el navegador en **http://localhost:3000**.

También puede iniciar manualmente desde una terminal:

```bat
npm run build
npm run start
```

> Requiere Node.js 18 o superior. `INICIAR.bat` se mantiene como alias compatible
> del lanzador de producción.

## Acceso desde otras laptops, celulares o hotspot

El servidor escucha en `0.0.0.0:3000`. Al abrir `/login` verá un banner azul con
la IP real de la laptop anfitriona, por ejemplo `http://192.168.1.45:3000`.
Cualquier equipo conectado a la misma red Wi-Fi o hotspot puede abrir esa URL sin
instalar nada. La misma dirección aparece en **Sensores y equipos**.

> En Windows, la primera vez que arranque Node puede aparecer el aviso del
> Firewall: permita el acceso en **redes privadas**. El puerto usado es el 3000.

## Base de datos portable

- SQLite en modo **WAL** (`journal_mode=WAL`), con índices por zona/fecha y
  estado/fecha para lecturas y alertas instantáneas.
- `src/lib/autoSeed.ts` detecta una base vacía al arrancar y crea los 3 usuarios,
  las 4 zonas, los sensores SCT-013 y 30 días de historial sin comandos manuales.
- Para regenerar los datos: **`REINICIAR-BD.bat`** o `npm run db:seed`.

## Despliegue en la nube

La guía paso a paso para Vercel + Neon/Turso y Render está en
[`GUIA_DESPLIEGUE.md`](./GUIA_DESPLIEGUE.md). En Vercel use una base remota
(Neon PostgreSQL recomendado), porque SQLite no persiste en su sistema de archivos.

## Credenciales de demostración

| Rol | Correo | Contraseña |
| --- | --- | --- |
| Dirección Institucional | `direccion@leoncioprado.edu.pe` | `Direccion2026!` |
| Subdirección Administrativa / Tesorería | `tesoreria@leoncioprado.edu.pe` | `Tesoreria2026!` |
| Mantenimiento y Soporte Técnico — CIST | `cist@leoncioprado.edu.pe` | `Cist2026!` |

La pantalla de acceso también permite entrar con un clic usando cualquiera de los tres perfiles.

## Módulos incluidos

- **Panel principal** — consumo en vivo, indicadores, series de 24 h / 7 d / 30 d, distribución por tablero y alertas recientes.
- **Alertas** — reglas de sobrecorriente, tensión y consumo nocturno; filtros, cambio de estado y límites editables.
- **Consumo fuera de horario** — comparación entre consumo lectivo y residual, pérdidas en Soles, hallazgos e inspecciones.
- **Costos y facturación** — recibo estimado frente al escenario sin mejoras, tarifa, IGV, demanda máxima y simulador de escenarios.
- **Sostenibilidad** — CO₂ evitado, árboles equivalentes, eficiencia A–G y aporte por tablero.
- **Sensores y equipos** — estado de los cuatro sensores, señal Wi-Fi, registro de lecturas, formato de envío y firmware Arduino.
- **Reportes** — informes ejecutivo, de costos y técnico, con encabezado institucional, indicadores, tablas, alertas, estado de sensores y recomendaciones (jsPDF + autotable).
- **Usuarios** — directorio, creación/edición, activación/desactivación, eliminación y matriz de permisos.

El encabezado incluye el interruptor **«Simulador de lecturas»**, que envía cuatro lecturas (una por zona) cada 3 segundos al endpoint de telemetría.

## API de telemetría ESP32

`POST /api/iot/telemetry` — público en la red local salvo que se configure `IOT_API_KEY`.

```json
{
  "deviceId": "ESP32-LP-01",
  "zone": "COMPUTO",
  "currentAmps": 12.84,
  "voltageVolts": 220.4,
  "powerKw": 2.69,
  "powerFactor": 0.95,
  "tariffSoles": 0.715,
  "intervalSeconds": 10,
  "wifiRssi": -58
}
```

Zonas válidas: `COMPUTO`, `TALLERES`, `ALUMBRADO`, `ADMINISTRACION`.

Ejemplo con cURL:

```bat
curl -X POST http://localhost:3000/api/iot/telemetry ^
  -H "Content-Type: application/json" ^
  -d "{\"deviceId\":\"ESP32-LP-01\",\"zone\":\"COMPUTO\",\"currentAmps\":12.84,\"voltageVolts\":220.4,\"powerKw\":2.69,\"powerFactor\":0.95,\"tariffSoles\":0.715,\"intervalSeconds\":10}"
```

Respuesta:

```json
{
  "ok": true,
  "readingId": 1234,
  "zone": "COMPUTO",
  "schoolHours": true,
  "alertsCreated": 0,
  "alerts": [],
  "receivedAt": "2026-11-13T20:00:00.000Z"
}
```

El firmware completo de referencia se puede consultar y descargar desde **Sensores y equipos → Código del firmware**.

## Comandos útiles

| Comando | Descripción |
| --- | --- |
| `npm run dev` | Servidor de desarrollo en `0.0.0.0:3000` |
| `npm run build` | Compilación de producción optimizada |
| `npm run start` | Servidor de producción en `0.0.0.0:3000` |
| `npm run setup` | Genera Prisma, crea tablas y siembra los datos demo |
| `npm run db:push` | Sincroniza el esquema Prisma con SQLite |
| `npm run db:seed` | Regenera los 30 días de datos de demostración |
| `npm run db:studio` | Abre Prisma Studio |

## Tecnologías

Next.js 14 (App Router) · TypeScript · Tailwind CSS · Lucide React · Recharts · Prisma 5 + SQLite · jsPDF + jspdf-autotable · bcryptjs · Zod · Sonner.

## Seguridad y alcance

- Sesiones con cookie `enerclass_session` firmada con HMAC y contraseñas cifradas con bcrypt.
- El middleware protege las rutas y cada API valida la sesión; los permisos de administración se verifican en el servidor.
- `AUTH_SECRET` e `IOT_API_KEY` deben configurarse con valores propios antes de un despliegue real.
- Los montos, la tarifa BT3 y los factores de CO₂ son referenciales y se usan con fines demostrativos.
