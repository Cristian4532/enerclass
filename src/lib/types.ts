export type ZoneCode = "COMPUTO" | "TALLERES" | "ALUMBRADO" | "ADMINISTRACION";
export type Severity = "CRITICA" | "ADVERTENCIA" | "INFORMATIVA";
export type AlertStatus = "PENDIENTE" | "EN_REVISION" | "RESUELTA";
export type Role = "DIRECCION" | "ADMINISTRACION" | "CIST";

export type SessionUser = {
  id: string;
  name: string;
  email: string;
  role: Role;
  position: string;
};

export type ZoneLive = {
  id: string;
  code: ZoneCode;
  name: string;
  shortName: string;
  color: string;
  icon: string;
  deviceId: string;
  sensorModel: string;
  online: boolean;
  calibration: number;
  offsetVoltage: number;
  wifiRssi: number;
  lastSync: string;
  currentKw: number;
  currentAmps: number;
  voltageVolts: number;
  powerFactor: number;
  lastReadingAt: string | null;
  monthKwh: number;
  monthCost: number;
  sharePct: number;
};

export type DashboardSeriesPoint = {
  key: string;
  label: string;
  COMPUTO: number;
  TALLERES: number;
  ALUMBRADO: number;
  ADMINISTRACION: number;
  total: number;
};

export type DashboardData = {
  generatedAt: string;
  range: string;
  periodLabel: string;
  kpis: {
    currentKw: number;
    monthCost: number;
    monthKwh: number;
    baselineCost: number;
    savingsSoles: number;
    savingsPct: number;
    totalCurrent: number;
    voltage: number;
    powerFactor: number;
    pendingAlerts: number;
    criticalAlerts: number;
    co2Avoided: number;
    peakKw: number;
  };
  zones: ZoneLive[];
  series: DashboardSeriesPoint[];
  distribution: {
    code: ZoneCode;
    name: string;
    color: string;
    kwh: number;
    cost: number;
    pct: number;
  }[];
  recentAlerts: {
    id: string;
    title: string;
    severity: Severity;
    status: AlertStatus;
    zoneName: string | null;
    zoneColor: string | null;
    createdAt: string;
  }[];
};

export type AlertItem = {
  id: string;
  zoneId: string | null;
  zoneName: string | null;
  zoneCode: string | null;
  zoneColor: string | null;
  type: string;
  severity: Severity;
  title: string;
  message: string;
  value: number | null;
  threshold: number | null;
  status: AlertStatus;
  createdAt: string;
  resolvedAt: string | null;
  resolvedBy: string | null;
};

export type ThresholdItem = {
  id: string;
  zoneId: string;
  zoneName: string;
  zoneCode: string;
  zoneColor: string;
  maxAmps: number;
  minVoltage: number;
  maxVoltage: number;
  nightMaxKw: number;
  updatedAt: string;
};

export type GhostFindingItem = {
  id: string;
  zoneId: string;
  zoneName: string;
  zoneCode: ZoneCode;
  zoneColor: string;
  equipment: string;
  description: string;
  residualAmps: number;
  wastedKwh: number;
  lossSoles: number;
  status: "PENDIENTE" | "INSPECCIONADO";
  detectedAt: string;
  inspectedAt: string | null;
  inspector: string | null;
};

export type GhostData = {
  periodLabel: string;
  totals: {
    wastedKwh: number;
    lossSoles: number;
    pending: number;
    inspected: number;
    residualAmps: number;
    ghostPct: number;
    lectivoKwh: number;
    fantasmaKwh: number;
  };
  byZone: {
    code: ZoneCode;
    name: string;
    color: string;
    lectivoKwh: number;
    fantasmaKwh: number;
    residualAmps: number;
    lossSoles: number;
  }[];
  findings: GhostFindingItem[];
  findingsTotal: number;
  page: number;
  pageSize: number;
  totalPages: number;
  counts: Record<string, number>;
  lastScanAt: string | null;
};

export type FinanceData = {
  periodLabel: string;
  base: {
    kwh: number;
    baselineKwh: number;
    maxDemandKw: number;
    tariff: number;
    igv: number;
    students: number;
    classrooms: number;
    savingsRate: number;
  };
  bill: {
    optimized: BillBreakdown;
    baseline: BillBreakdown;
    monthlySaving: number;
    yearlySaving: number;
    savingPct: number;
  };
  kpis: {
    kwhPerStudent: number;
    solesPerClassroom: number;
    costPerKwh: number;
    co2Avoided: number;
  };
  byZone: {
    code: ZoneCode;
    name: string;
    color: string;
    kwh: number;
    cost: number;
    pct: number;
    avgAmps: number;
    peakKw: number;
  }[];
  weeks: {
    label: string;
    currentKwh: number;
    baselineKwh: number;
    currentSoles: number;
    baselineSoles: number;
  }[];
};

export type BillBreakdown = {
  energyKwh: number;
  energyCharge: number;
  demandCharge: number;
  fixedCharge: number;
  subtotal: number;
  igv: number;
  total: number;
};

export type SustainabilityData = {
  periodLabel: string;
  currentKwh: number;
  baselineKwh: number;
  avoidedKwh: number;
  co2Avoided: number;
  treesEquivalent: number;
  savingsRate: number;
  efficiency: {
    rating: string;
    label: string;
    kwhPerStudent: number;
    score: number;
    description: string;
    next: string;
  };
  weeks: {
    label: string;
    currentKwh: number;
    baselineKwh: number;
    co2Avoided: number;
  }[];
  equivalences: {
    carKm: number;
    ledHours: number;
    smartphones: number;
  };
  byZone: {
    code: ZoneCode;
    name: string;
    color: string;
    kwh: number;
    co2: number;
    pct: number;
  }[];
};

export type UserItem = {
  id: string;
  name: string;
  email: string;
  role: Role;
  position: string;
  active: boolean;
  createdAt: string;
};

export type TelemetryPayload = {
  deviceId: string;
  zone: ZoneCode;
  currentAmps: number;
  voltageVolts: number;
  powerKw: number;
  powerFactor: number;
  tariffSoles: number;
  intervalSeconds?: number;
  wifiRssi?: number;
};

export type ReportData = {
  meta: {
    institution: string;
    district: string;
    ugel: string;
    type: string;
    typeLabel: string;
    title: string;
    rangeLabel: string;
    from: string;
    to: string;
    generatedAt: string;
    generatedBy: string;
    generatedByPosition: string;
    days: number;
  };
  kpis: {
    totalKwh: number;
    baselineKwh: number;
    savingsKwh: number;
    totalSoles: number;
    baselineSoles: number;
    savingsSoles: number;
    savingsPct: number;
    avgDemandKw: number;
    peakKw: number;
    alertCount: number;
    criticalAlerts: number;
    co2Avoided: number;
    kwhPerStudent: number;
  };
  byZone: {
    id: string;
    code: ZoneCode;
    name: string;
    color: string;
    kwh: number;
    cost: number;
    pct: number;
    avgAmps: number;
    peakKw: number;
    co2: number;
  }[];
  alerts: {
    id: string;
    title: string;
    message: string;
    severity: Severity;
    status: AlertStatus;
    zoneName: string;
    createdAt: string;
  }[];
  series: { label: string; kwh: number; cost: number }[];
  sensors: {
    code: ZoneCode;
    name: string;
    online: boolean;
    lastSync: string;
    calibration: number;
    offsetVoltage: number;
    sensorModel: string;
    wifiRssi: number;
  }[];
  recommendations: string[];
};

export type IotStatusData = {
  deviceId: string;
  online: boolean;
  zones: ZoneLive[];
  recent: {
    id: number;
    zoneCode: ZoneCode;
    zoneName: string;
    color: string;
    payload: TelemetryPayload & { recordedAt: string; source: string };
    receivedAt: string;
  }[];
  firmwareVersion: string;
  uptimeLabel: string;
  totalReadings: number;
};

export type ReadingHistoryItem = {
  id: number;
  zoneCode: ZoneCode;
  zoneName: string;
  zoneColor: string;
  deviceId: string;
  currentAmps: number;
  voltageVolts: number;
  powerKw: number;
  powerFactor: number;
  energyKwh: number;
  costSoles: number;
  source: string;
  isSchoolHours: boolean;
  recordedAt: string;
};

export type ReadingHistoryData = {
  readings: ReadingHistoryItem[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  zones: { code: string; shortName: string }[];
};

export type NetworkInfo = {
  hostname: string;
  port: number;
  isCloud: boolean;
  localUrl: string;
  networkUrl: string | null;
  publicUrl: string | null;
  primaryInterface: string | null;
  interfaces: { name: string; address: string }[];
};
