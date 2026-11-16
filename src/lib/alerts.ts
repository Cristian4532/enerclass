import "server-only";
import { prisma } from "@/lib/prisma";
import { isSchoolSchedule } from "@/lib/time";

type AlertCandidate = {
  zoneId: string;
  type: string;
  severity: "CRITICA" | "ADVERTENCIA" | "INFORMATIVA";
  title: string;
  message: string;
  value: number;
  threshold: number | null;
};

type TelemetryReading = {
  zoneId: string;
  zoneName: string;
  currentAmps: number;
  voltageVolts: number;
  powerKw: number;
  recordedAt: Date;
};

type ZoneThreshold = {
  maxAmps: number;
  minVoltage: number;
  maxVoltage: number;
  nightMaxKw: number;
};

export async function evaluateAlerts(reading: TelemetryReading, threshold: ZoneThreshold) {
  const candidates: AlertCandidate[] = [];
  const schoolHours = isSchoolSchedule(reading.recordedAt);

  if (reading.currentAmps > threshold.maxAmps) {
    const critical = reading.currentAmps > threshold.maxAmps * 1.2;
    candidates.push({
      zoneId: reading.zoneId,
      type: "SOBRECORRIENTE",
      severity: critical ? "CRITICA" : "ADVERTENCIA",
      title: critical ? "Sobrecarga crítica de corriente" : "Corriente por encima del umbral",
      message: `${reading.zoneName} registró ${reading.currentAmps.toFixed(1)} A, superando el límite configurado de ${threshold.maxAmps} A. ${
        critical ? "Se recomienda reducir la carga de forma inmediata." : "Verifique los equipos conectados al tablero."
      }`,
      value: Number(reading.currentAmps.toFixed(2)),
      threshold: threshold.maxAmps
    });
  }

  if (reading.voltageVolts > threshold.maxVoltage) {
    candidates.push({
      zoneId: reading.zoneId,
      type: "VOLTAJE_ALTO",
      severity: reading.voltageVolts > 250 ? "CRITICA" : "ADVERTENCIA",
      title: "Sobretensión en la red eléctrica",
      message: `${reading.zoneName} reportó ${reading.voltageVolts.toFixed(1)} V, por encima del máximo de ${threshold.maxVoltage} V. Riesgo para equipos sensibles.`,
      value: Number(reading.voltageVolts.toFixed(1)),
      threshold: threshold.maxVoltage
    });
  }

  if (reading.voltageVolts < threshold.minVoltage) {
    candidates.push({
      zoneId: reading.zoneId,
      type: "VOLTAJE_BAJO",
      severity: reading.voltageVolts < 195 ? "CRITICA" : "ADVERTENCIA",
      title: "Caída de tensión detectada",
      message: `${reading.zoneName} reportó ${reading.voltageVolts.toFixed(1)} V, por debajo del mínimo de ${threshold.minVoltage} V. Revise el alimentador y las conexiones.`,
      value: Number(reading.voltageVolts.toFixed(1)),
      threshold: threshold.minVoltage
    });
  }

  if (!schoolHours && reading.powerKw > threshold.nightMaxKw) {
    const warning = reading.powerKw > threshold.nightMaxKw * 2;
    candidates.push({
      zoneId: reading.zoneId,
      type: "FUERA_HORARIO",
      severity: warning ? "ADVERTENCIA" : "INFORMATIVA",
      title: "Consumo fuera del horario escolar",
      message: `${reading.zoneName} mantiene ${reading.powerKw.toFixed(2)} kW fuera de las 07:30–18:00, por encima del límite nocturno de ${threshold.nightMaxKw} kW. Posible consumo fuera de horario.`,
      value: Number(reading.powerKw.toFixed(2)),
      threshold: threshold.nightMaxKw
    });
  }

  if (!candidates.length) return [];

  const recent = await prisma.alert.findMany({
    where: {
      zoneId: reading.zoneId,
      status: { not: "RESUELTA" },
      createdAt: { gte: new Date(Date.now() - 30 * 60 * 1000) },
      type: { in: candidates.map((candidate) => candidate.type) }
    },
    select: { type: true }
  });
  const existing = new Set(recent.map((alert) => alert.type));
  const fresh = candidates.filter((candidate) => !existing.has(candidate.type));

  for (const alert of fresh) {
    await prisma.alert.create({ data: alert });
  }

  return fresh;
}
