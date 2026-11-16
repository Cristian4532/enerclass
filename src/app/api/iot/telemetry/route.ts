import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { evaluateAlerts } from "@/lib/alerts";
import { isSchoolSchedule } from "@/lib/time";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const telemetrySchema = z.object({
  deviceId: z.string().min(1).max(64),
  zone: z.enum(["COMPUTO", "TALLERES", "ALUMBRADO", "ADMINISTRACION"]),
  currentAmps: z.coerce.number().finite().min(0).max(500),
  voltageVolts: z.coerce.number().finite().min(1).max(500),
  powerKw: z.coerce.number().finite().min(0).max(2000),
  powerFactor: z.coerce.number().finite().min(0).max(1.2),
  tariffSoles: z.coerce.number().finite().min(0).max(10),
  intervalSeconds: z.coerce.number().finite().min(1).max(3600).optional(),
  wifiRssi: z.coerce.number().int().min(-120).max(0).optional()
});

export async function POST(request: Request) {
  try {
    const configuredKey = process.env.IOT_API_KEY;
    if (configuredKey && request.headers.get("x-api-key") !== configuredKey) {
      return NextResponse.json({ error: "API key de dispositivo inválida." }, { status: 401 });
    }

    const body = await request.json();
    const parsed = telemetrySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Trama inválida", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const payload = parsed.data;
    const zone = await prisma.zone.findUnique({
      where: { code: payload.zone },
      include: { threshold: true }
    });
    if (!zone) {
      return NextResponse.json({ error: `Zona desconocida: ${payload.zone}` }, { status: 404 });
    }

    const now = new Date();
    const intervalSeconds = payload.intervalSeconds ?? 10;
    const energyKwh = Number((payload.powerKw * (intervalSeconds / 3600)).toFixed(6));
    const costSoles = Number((energyKwh * payload.tariffSoles).toFixed(6));
    const schoolHours = isSchoolSchedule(now);

    const reading = await prisma.reading.create({
      data: {
        zoneId: zone.id,
        deviceId: payload.deviceId,
        currentAmps: payload.currentAmps,
        voltageVolts: payload.voltageVolts,
        powerKw: payload.powerKw,
        powerFactor: payload.powerFactor,
        tariffSoles: payload.tariffSoles,
        energyKwh,
        costSoles,
        source: "live",
        isSchoolHours: schoolHours,
        recordedAt: now
      }
    });

    await prisma.zone.update({
      where: { id: zone.id },
      data: {
        online: true,
        lastSync: now,
        ...(payload.wifiRssi !== undefined ? { wifiRssi: payload.wifiRssi } : {})
      }
    });

    const threshold = zone.threshold ?? {
      maxAmps: 32,
      minVoltage: 205,
      maxVoltage: 240,
      nightMaxKw: 0.35
    };

    const createdAlerts = await evaluateAlerts(
      {
        zoneId: zone.id,
        zoneName: zone.name,
        currentAmps: payload.currentAmps,
        voltageVolts: payload.voltageVolts,
        powerKw: payload.powerKw,
        recordedAt: now
      },
      threshold
    );

    if (Math.random() < 0.01) {
      await prisma.reading
        .deleteMany({
          where: { source: "live", recordedAt: { lt: new Date(Date.now() - 6 * 60 * 60 * 1000) } }
        })
        .catch(() => undefined);
    }

    return NextResponse.json({
      ok: true,
      readingId: reading.id,
      zone: zone.code,
      schoolHours,
      alertsCreated: createdAlerts.length,
      alerts: createdAlerts.map((alert) => ({ severity: alert.severity, title: alert.title })),
      receivedAt: now.toISOString()
    });
  } catch (error) {
    console.error("[EnerClass telemetry]", error);
    return NextResponse.json({ error: "No se pudo procesar la trama de telemetría." }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    endpoint: "/api/iot/telemetry",
    method: "POST",
    contentType: "application/json",
    expectedPayload: {
      deviceId: "ESP32-LP-01",
      zone: "COMPUTO | TALLERES | ALUMBRADO | ADMINISTRACION",
      currentAmps: 12.84,
      voltageVolts: 220.4,
      powerKw: 2.69,
      powerFactor: 0.95,
      tariffSoles: 0.715
    }
  });
}
