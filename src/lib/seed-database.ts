import type { PrismaClient } from "@prisma/client";

/**
 * Hashes bcrypt precalculados (costo 10) de las contraseñas demo. Se incluyen
 * como constantes para que el bundle de instrumentación/auto-seed no arrastre
 * bcryptjs (y su dependencia de `crypto`) al arrancar el servidor.
 */
const DEMO_PASSWORDS = {
  direccion: "$2a$10$VwtjIjMHC.msrvnCt24Gg.qSJe3WBQOu.WEqNdEYHaqwAxW6lj2fa",
  tesoreria: "$2a$10$rXC2D10LD65uJohH8GA/GuimZmzQUdCsk7nzYuIsNZct5HXDO.tAS",
  cist: "$2a$10$jg4W9yhuD5J51yWlEA6Yk.dYXQ4POpcKc.NUwczkNTZ4iT1B6MavC"
} as const;

export type SeedOptions = {
  /** Elimina los datos existentes antes de sembrar. */
  reset?: boolean;
  /** Imprime el resumen del proceso en consola. */
  log?: boolean;
};

const TARIFF = 0.715;
const DAYS = 30;

type ZoneSeed = {
  id: string;
  code: string;
  name: string;
  shortName: string;
  description: string;
  color: string;
  icon: string;
  calibration: number;
  wifiRssi: number;
  threshold: { maxAmps: number; minVoltage: number; maxVoltage: number; nightMaxKw: number };
  profile: { school: number; evening: number; night: number; weekend: number };
};

const ZONES: ZoneSeed[] = [
  {
    id: "zona-computo",
    code: "COMPUTO",
    name: "Laboratorio de Cómputo e Innovación",
    shortName: "Cómputo",
    description: "Laboratorio de cómputo, aula de innovación y servidores institucionales.",
    color: "#06b6d4",
    icon: "Monitor",
    calibration: 1.0,
    wifiRssi: -52,
    threshold: { maxAmps: 22, minVoltage: 208, maxVoltage: 238, nightMaxKw: 0.28 },
    profile: { school: 2.9, evening: 0.32, night: 0.1, weekend: 0.12 }
  },
  {
    id: "zona-talleres",
    code: "TALLERES",
    name: "Talleres de Formación Técnica",
    shortName: "Talleres",
    description: "Talleres de electricidad, soldadura, carpintería y confección.",
    color: "#f59e0b",
    icon: "Wrench",
    calibration: 1.03,
    wifiRssi: -61,
    threshold: { maxAmps: 32, minVoltage: 208, maxVoltage: 238, nightMaxKw: 0.35 },
    profile: { school: 4.2, evening: 0.38, night: 0.13, weekend: 0.14 }
  },
  {
    id: "zona-alumbrado",
    code: "ALUMBRADO",
    name: "Alumbrado General y Perimétrico",
    shortName: "Alumbrado",
    description: "Pabellones, patios, escaleras y alumbrado perimétrico exterior.",
    color: "#8b5cf6",
    icon: "Lightbulb",
    calibration: 0.98,
    wifiRssi: -57,
    threshold: { maxAmps: 14, minVoltage: 208, maxVoltage: 238, nightMaxKw: 0.32 },
    profile: { school: 1.85, evening: 0.72, night: 0.38, weekend: 0.33 }
  },
  {
    id: "zona-administracion",
    code: "ADMINISTRACION",
    name: "Áreas Administrativas y Dirección",
    shortName: "Administración",
    description: "Dirección, secretaría, tesorería, archivo y sala de espera.",
    color: "#10b981",
    icon: "Building2",
    calibration: 1.01,
    wifiRssi: -64,
    threshold: { maxAmps: 12, minVoltage: 208, maxVoltage: 238, nightMaxKw: 0.22 },
    profile: { school: 1.55, evening: 0.26, night: 0.08, weekend: 0.09 }
  }
];

function mulberry32(seed: number) {
  let a = seed;
  return function random() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const random = mulberry32(2001);

function limaParts(date: Date) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Lima",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    hourCycle: "h23"
  }).formatToParts(date);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  const weekday = get("weekday");
  return {
    weekday,
    isWeekend: weekday === "Sat" || weekday === "Sun",
    hour: Number(get("hour")),
    minute: Number(get("minute"))
  };
}

function powerFor(zone: ZoneSeed, date: Date) {
  const { hour, isWeekend } = limaParts(date);
  let base: number;
  const isSchoolHours = !isWeekend && hour >= 7 && hour < 18;

  if (isWeekend) {
    base = zone.profile.weekend;
  } else if (isSchoolHours) {
    base = zone.profile.school;
    if (hour >= 10 && hour < 12) base *= 1.1;
    if (hour >= 14 && hour < 16) base *= 1.08;
  } else if (hour >= 18 && hour < 21) {
    base = zone.profile.evening;
  } else {
    base = zone.profile.night;
  }

  const noise = 0.88 + random() * 0.24;
  let power = base * noise;

  if (isSchoolHours && random() < 0.055) power *= 1.22 + random() * 0.15;
  if (zone.code === "ALUMBRADO" && hour >= 18 && hour < 23) power *= 1.05;

  return { power: Math.max(0.03, Number(power.toFixed(3))), isSchoolHours };
}

export async function seedDatabase(prisma: PrismaClient, options: SeedOptions = {}) {
  const { reset = true, log = false } = options;
  if (log) console.log("🌱 Sembrando base de datos EnerClass — I.E. N° 2001 Leoncio Prado...");

  if (reset) {
    await prisma.alert.deleteMany();
    await prisma.ghostFinding.deleteMany();
    await prisma.reading.deleteMany();
    await prisma.threshold.deleteMany();
    await prisma.zone.deleteMany();
    await prisma.user.deleteMany();
    await prisma.setting.deleteMany();
  }

  await prisma.user.createMany({
    data: [
      {
        id: "user-direccion",
        name: "Mg. Carmen Rosa Salazar Vega",
        email: "direccion@leoncioprado.edu.pe",
        passwordHash: DEMO_PASSWORDS.direccion,
        role: "DIRECCION",
        position: "Directora de la I.E. N° 2001 Leoncio Prado"
      },
      {
        id: "user-tesoreria",
        name: "Lic. José Antonio Ramos Díaz",
        email: "tesoreria@leoncioprado.edu.pe",
        passwordHash: DEMO_PASSWORDS.tesoreria,
        role: "ADMINISTRACION",
        position: "Subdirección Administrativa y Tesorería"
      },
      {
        id: "user-cist",
        name: "Téc. Luis Alberto Quispe Rojas",
        email: "cist@leoncioprado.edu.pe",
        passwordHash: DEMO_PASSWORDS.cist,
        role: "CIST",
        position: "Responsable de Mantenimiento y Soporte Técnico — CIST"
      }
    ]
  });

  for (const zone of ZONES) {
    await prisma.zone.create({
      data: {
        id: zone.id,
        code: zone.code,
        name: zone.name,
        shortName: zone.shortName,
        description: zone.description,
        color: zone.color,
        icon: zone.icon,
        deviceId: "ESP32-LP-01",
        sensorModel: "SCT-013-000 · 100A / 50mA",
        calibration: zone.calibration,
        offsetVoltage: 1.65,
        wifiRssi: zone.wifiRssi,
        online: true,
        lastSync: new Date(),
        threshold: {
          create: zone.threshold
        }
      }
    });
  }

  const now = new Date();
  const currentHour = new Date(now);
  currentHour.setMinutes(0, 0, 0);

  const readings: {
    zoneId: string;
    deviceId: string;
    currentAmps: number;
    voltageVolts: number;
    powerKw: number;
    powerFactor: number;
    tariffSoles: number;
    energyKwh: number;
    costSoles: number;
    source: string;
    isSchoolHours: boolean;
    recordedAt: Date;
  }[] = [];

  const totals: Record<string, number> = { COMPUTO: 0, TALLERES: 0, ALUMBRADO: 0, ADMINISTRACION: 0 };

  for (let i = DAYS * 24 - 1; i >= 0; i--) {
    const recordedAt = new Date(currentHour.getTime() - i * 60 * 60 * 1000);
    for (const zone of ZONES) {
      const { power, isSchoolHours } = powerFor(zone, recordedAt);
      const powerFactor = Number((0.9 + random() * 0.075).toFixed(3));
      const voltageVolts = Number((218 + random() * 8).toFixed(1));
      const currentAmps = Number(((power * 1000) / (voltageVolts * powerFactor)).toFixed(2));
      const energyKwh = power;
      const costSoles = Number((energyKwh * TARIFF).toFixed(3));
      totals[zone.code] += energyKwh;

      readings.push({
        zoneId: zone.id,
        deviceId: "ESP32-LP-01",
        currentAmps,
        voltageVolts,
        powerKw: power,
        powerFactor,
        tariffSoles: TARIFF,
        energyKwh,
        costSoles,
        source: "seed",
        isSchoolHours,
        recordedAt
      });
    }
  }

  for (let i = 0; i < readings.length; i += 500) {
    await prisma.reading.createMany({ data: readings.slice(i, i + 500) });
  }

  const hoursAgo = (h: number) => new Date(Date.now() - h * 60 * 60 * 1000);
  const daysAgo = (d: number, hour = 10) => {
    const date = new Date(Date.now() - d * 24 * 60 * 60 * 1000);
    date.setHours(hour, 15, 0, 0);
    return date;
  };

  const alertSeed = [
    {
      zoneId: "zona-talleres",
      type: "SOBRECORRIENTE",
      severity: "CRITICA",
      title: "Pico de corriente en tablero de talleres",
      message: "El sensor SCT-013 del tablero de talleres registró 38.4 A, superando el umbral de 32 A. Posible sobrecarga por equipos de soldadura encendidos simultáneamente.",
      value: 38.4,
      threshold: 32,
      status: "PENDIENTE",
      createdAt: hoursAgo(2)
    },
    {
      zoneId: "zona-computo",
      type: "VOLTAJE_BAJO",
      severity: "ADVERTENCIA",
      title: "Caída de tensión en laboratorio de cómputo",
      message: "Tensión de red de 204.6 V detectada en el tablero de cómputo. Se recomienda revisar el alimentador y la puesta a tierra.",
      value: 204.6,
      threshold: 208,
      status: "PENDIENTE",
      createdAt: hoursAgo(5)
    },
    {
      zoneId: "zona-alumbrado",
      type: "FUERA_HORARIO",
      severity: "ADVERTENCIA",
      title: "Consumo nocturno elevado en alumbrado",
      message: "Consumo residual de 0.61 kW entre las 22:00 y 23:00, por encima del umbral nocturno de 0.32 kW. Revisar reflectores perimétricos.",
      value: 0.61,
      threshold: 0.32,
      status: "EN_REVISION",
      createdAt: hoursAgo(14)
    },
    {
      zoneId: "zona-talleres",
      type: "FUERA_HORARIO",
      severity: "INFORMATIVA",
      title: "Carga residual en taller de soldadura",
      message: "Se detectó 0.44 kW de consumo fuera del horario escolar. La soldadora inverter podría haber quedado en standby.",
      value: 0.44,
      threshold: 0.35,
      status: "PENDIENTE",
      createdAt: daysAgo(1, 21)
    },
    {
      zoneId: "zona-administracion",
      type: "FUERA_HORARIO",
      severity: "INFORMATIVA",
      title: "Equipos administrativos encendidos fuera de horario",
      message: "Impresoras y fotocopiadora mantuvieron 0.27 kW de carga después de las 18:30.",
      value: 0.27,
      threshold: 0.22,
      status: "RESUELTA",
      createdAt: daysAgo(2, 19),
      resolvedBy: "Téc. Luis Alberto Quispe Rojas",
      resolvedAt: daysAgo(1, 9)
    },
    {
      zoneId: "zona-alumbrado",
      type: "VOLTAJE_ALTO",
      severity: "ADVERTENCIA",
      title: "Sobretensión en alumbrado perimétrico",
      message: "Tensión de 241.8 V registrada en el circuito de alumbrado perimétrico. Verificar regulación del transformador.",
      value: 241.8,
      threshold: 238,
      status: "RESUELTA",
      createdAt: daysAgo(4, 16),
      resolvedBy: "Téc. Luis Alberto Quispe Rojas",
      resolvedAt: daysAgo(3, 11)
    },
    {
      zoneId: "zona-talleres",
      type: "SOBRECORRIENTE",
      severity: "ADVERTENCIA",
      title: "Sobrecarga temporal en taller de carpintería",
      message: "La sierra circular y el extractor operaron simultáneamente alcanzando 33.8 A. Se sugiere escalonar el encendido de equipos.",
      value: 33.8,
      threshold: 32,
      status: "RESUELTA",
      createdAt: daysAgo(6, 11),
      resolvedBy: "Téc. Luis Alberto Quispe Rojas",
      resolvedAt: daysAgo(6, 15)
    },
    {
      zoneId: "zona-computo",
      type: "FUERA_HORARIO",
      severity: "INFORMATIVA",
      title: "Consumo fantasma en laboratorio de innovación",
      message: "Carga residual de 0.31 kW durante la madrugada. Los equipos de cómputo no se apagaron por completo.",
      value: 0.31,
      threshold: 0.28,
      status: "RESUELTA",
      createdAt: daysAgo(8, 2),
      resolvedBy: "Téc. Luis Alberto Quispe Rojas",
      resolvedAt: daysAgo(8, 8)
    },
    {
      zoneId: "zona-administracion",
      type: "SOBRECORRIENTE",
      severity: "ADVERTENCIA",
      title: "Carga elevada en tablero administrativo",
      message: "Se registraron 12.9 A por el uso simultáneo de aire acondicionado y fotocopiadora. Umbral configurado: 12 A.",
      value: 12.9,
      threshold: 12,
      status: "RESUELTA",
      createdAt: daysAgo(10, 14),
      resolvedBy: "Lic. José Antonio Ramos Díaz",
      resolvedAt: daysAgo(10, 17)
    },
    {
      zoneId: null,
      type: "NODO_OFFLINE",
      severity: "CRITICA",
      title: "Nodo ESP32 sin conexión",
      message: "El concentrador ESP32-LP-01 perdió conexión Wi-Fi durante 18 minutos. Los datos se recuperaron automáticamente al restablecerse la red.",
      value: 18,
      threshold: null,
      status: "RESUELTA",
      createdAt: daysAgo(12, 8),
      resolvedBy: "Téc. Luis Alberto Quispe Rojas",
      resolvedAt: daysAgo(12, 9)
    },
    {
      zoneId: "zona-alumbrado",
      type: "FANTASMA",
      severity: "ADVERTENCIA",
      title: "Fuga energética en pabellón B",
      message: "Luminarias del pabellón B permanecieron encendidas durante el fin de semana, generando 9.8 kWh de consumo fantasma.",
      value: 9.8,
      threshold: 0.32,
      status: "RESUELTA",
      createdAt: daysAgo(15, 9),
      resolvedBy: "Téc. Luis Alberto Quispe Rojas",
      resolvedAt: daysAgo(14, 8)
    },
    {
      zoneId: "zona-talleres",
      type: "SOBRECORRIENTE",
      severity: "CRITICA",
      title: "Sobrecarga en el tablero general de talleres",
      message: "Corriente de 41.2 A detectada por más de 45 segundos. Se recomienda redistribuir las cargas trifásicas.",
      value: 41.2,
      threshold: 32,
      status: "RESUELTA",
      createdAt: daysAgo(18, 10),
      resolvedBy: "Téc. Luis Alberto Quispe Rojas",
      resolvedAt: daysAgo(17, 16)
    },
    {
      zoneId: "zona-computo",
      type: "VOLTAJE_BAJO",
      severity: "ADVERTENCIA",
      title: "Fluctuación de tensión en servidores",
      message: "Tensión mínima de 206.2 V durante 6 minutos. El UPS compensó la caída sin afectar los servicios.",
      value: 206.2,
      threshold: 208,
      status: "RESUELTA",
      createdAt: daysAgo(21, 15),
      resolvedBy: "Téc. Luis Alberto Quispe Rojas",
      resolvedAt: daysAgo(20, 10)
    },
    {
      zoneId: "zona-alumbrado",
      type: "FUERA_HORARIO",
      severity: "INFORMATIVA",
      title: "Alumbrado de escaleras encendido de madrugada",
      message: "Se detectó 0.36 kW de consumo entre 02:00 y 04:00. Programar temporizadores para apagado automático.",
      value: 0.36,
      threshold: 0.32,
      status: "RESUELTA",
      createdAt: daysAgo(23, 3),
      resolvedBy: "Téc. Luis Alberto Quispe Rojas",
      resolvedAt: daysAgo(23, 9)
    },
    {
      zoneId: "zona-administracion",
      type: "FUERA_HORARIO",
      severity: "INFORMATIVA",
      title: "Equipo de aire acondicionado en standby",
      message: "El split de dirección mantuvo 0.24 kW durante el fin de semana. Revisar la programación del termostato.",
      value: 0.24,
      threshold: 0.22,
      status: "RESUELTA",
      createdAt: daysAgo(26, 12),
      resolvedBy: "Téc. Luis Alberto Quispe Rojas",
      resolvedAt: daysAgo(25, 8)
    },
    {
      zoneId: "zona-talleres",
      type: "FUERA_HORARIO",
      severity: "ADVERTENCIA",
      title: "Consumo nocturno sostenido en taller de electricidad",
      message: "Carga residual de 0.48 kW durante tres noches consecutivas. Posible banco de baterías en carga.",
      value: 0.48,
      threshold: 0.35,
      status: "PENDIENTE",
      createdAt: daysAgo(3, 23)
    }
  ];

  await prisma.alert.createMany({ data: alertSeed as never });

  await prisma.ghostFinding.createMany({
    data: [
      {
        zoneId: "zona-computo",
        equipment: "PCs de laboratorio en standby (24 equipos)",
        description: "Fuente de alimentación de 550 W con consumo residual de 3.8 W por equipo.",
        residualAmps: 1.92,
        wastedKwh: 64.8,
        lossSoles: 46.33,
        status: "PENDIENTE",
        detectedAt: daysAgo(2, 1)
      },
      {
        zoneId: "zona-computo",
        equipment: "Proyector interactivo y cargador de laptops",
        description: "Equipos del aula de innovación conectados permanentemente a la red.",
        residualAmps: 0.46,
        wastedKwh: 15.4,
        lossSoles: 11.01,
        status: "PENDIENTE",
        detectedAt: daysAgo(4, 2)
      },
      {
        zoneId: "zona-talleres",
        equipment: "Soldadora inverter en standby",
        description: "Equipo del taller de estructuras metálicas con consumo residual continuo.",
        residualAmps: 0.88,
        wastedKwh: 42.6,
        lossSoles: 30.46,
        status: "INSPECCIONADO",
        inspectedAt: daysAgo(1, 9),
        inspector: "Téc. Luis Alberto Quispe Rojas",
        detectedAt: daysAgo(6, 1)
      },
      {
        zoneId: "zona-talleres",
        equipment: "Compresor de taller de carpintería",
        description: "Compresor de 2 HP que mantiene presión y arranca automáticamente en la madrugada.",
        residualAmps: 1.25,
        wastedKwh: 51.2,
        lossSoles: 36.61,
        status: "PENDIENTE",
        detectedAt: daysAgo(5, 3)
      },
      {
        zoneId: "zona-alumbrado",
        equipment: "Reflectores perimétricos sector A",
        description: "Seis reflectores LED de 100 W permanecen encendidos hasta las 06:30.",
        residualAmps: 2.74,
        wastedKwh: 118.5,
        lossSoles: 84.73,
        status: "PENDIENTE",
        detectedAt: daysAgo(1, 0)
      },
      {
        zoneId: "zona-alumbrado",
        equipment: "Luminarias del pabellón B",
        description: "Circuitos de iluminación sin temporizador en pasillos del segundo piso.",
        residualAmps: 1.58,
        wastedKwh: 73.9,
        lossSoles: 52.84,
        status: "INSPECCIONADO",
        inspectedAt: daysAgo(2, 10),
        inspector: "Téc. Luis Alberto Quispe Rojas",
        detectedAt: daysAgo(8, 0)
      },
      {
        zoneId: "zona-administracion",
        equipment: "Fotocopiadora y 3 impresoras láser",
        description: "Modo reposo de equipos de impresión en secretaría y tesorería.",
        residualAmps: 0.72,
        wastedKwh: 26.8,
        lossSoles: 19.16,
        status: "PENDIENTE",
        detectedAt: daysAgo(3, 2)
      },
      {
        zoneId: "zona-administracion",
        equipment: "Aire acondicionado split de dirección",
        description: "Split de 18,000 BTU con consumo residual y termostato sin programación.",
        residualAmps: 1.06,
        wastedKwh: 39.7,
        lossSoles: 28.39,
        status: "INSPECCIONADO",
        inspectedAt: daysAgo(4, 11),
        inspector: "Lic. José Antonio Ramos Díaz",
        detectedAt: daysAgo(9, 1)
      }
    ]
  });

  await prisma.setting.createMany({
    data: [
      { key: "savingsRate", value: "0.18" },
      { key: "students", value: "850" },
      { key: "classrooms", value: "24" },
      { key: "tariff", value: String(TARIFF) },
      { key: "igv", value: "0.18" },
      { key: "institutionName", value: "I.E. N° 2001 \"Leoncio Prado\"" },
      { key: "district", value: "Rímac, Lima — Perú" },
      { key: "academicYear", value: "2026" }
    ]
  });

  const totalKwh = Object.values(totals).reduce((a, b) => a + b, 0);
  if (log) {
    console.log("✅ Datos sembrados correctamente.");
    console.log(`   • 3 usuarios institucionales`);
    console.log(`   • 4 zonas / sensores SCT-013`);
    console.log(`   • ${readings.length} lecturas horarias (30 días)`);
    console.log(`   • ${alertSeed.length} alertas históricas`);
    console.log(`   • 8 hallazgos de consumo fantasma`);
    console.log(`   • Energía total 30 días: ${totalKwh.toFixed(1)} kWh`);
    console.log("\n🔑 Credenciales de acceso:");
    console.log("   Dirección:      direccion@leoncioprado.edu.pe / Direccion2026!");
    console.log("   Tesorería:      tesoreria@leoncioprado.edu.pe / Tesoreria2026!");
    console.log("   Soporte CIST:   cist@leoncioprado.edu.pe / Cist2026!");
  }

  return {
    users: 3,
    zones: ZONES.length,
    readings: readings.length,
    alerts: alertSeed.length,
    findings: 8,
    totalKwh
  };
}
