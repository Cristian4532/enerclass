export const INSTITUTION = {
  name: 'I.E. N° 2001 "Leoncio Prado"',
  shortName: "Leoncio Prado",
  district: "Rímac, Lima — Perú",
  sistema: "EnerClass",
  ugel: "UGEL 02 — Rímac",
  students: 850,
  classrooms: 24
};

export const SAVINGS_RATE = 0.18;
export const CO2_FACTOR = 0.45; // kg CO2 evitados por kWh (SEIN Perú, referencial)
export const TREE_ABSORPTION = 21.7; // kg CO2/año absorbidos por un árbol adulto
export const TARIFF_DEFAULT = 0.715; // S/ por kWh (referencial BT3 — Osinergmin)
export const IGV = 0.18;
export const DEMAND_CHARGE = 14.5; // S/ por kW de máxima demanda facturada
export const FIXED_CHARGE = 18.5; // S/ cargo fijo mensual
export const SCHOOL_START = "07:30";
export const SCHOOL_END = "18:00";

export const ZONE_THEME = {
  COMPUTO: { color: "#06b6d4", soft: "bg-cyan-500", text: "text-cyan-500", bg: "bg-cyan-500/10" },
  TALLERES: { color: "#f59e0b", soft: "bg-amber-500", text: "text-amber-500", bg: "bg-amber-500/10" },
  ALUMBRADO: { color: "#8b5cf6", soft: "bg-violet-500", text: "text-violet-500", bg: "bg-violet-500/10" },
  ADMINISTRACION: { color: "#10b981", soft: "bg-emerald-500", text: "text-emerald-500", bg: "bg-emerald-500/10" }
} as const;

export const ZONE_ORDER = ["COMPUTO", "TALLERES", "ALUMBRADO", "ADMINISTRACION"] as const;

export const ROLES = {
  DIRECCION: {
    label: "Dirección Institucional",
    short: "Dirección",
    description: "Vista ejecutiva, indicadores de ahorro presupuestal y reportes PDF.",
    email: "direccion@leoncioprado.edu.pe",
    password: "Direccion2026!",
    person: "Mg. Carmen Rosa Salazar Vega",
    position: "Directora de la I.E. N° 2001 Leoncio Prado",
    icon: "Crown"
  },
  ADMINISTRACION: {
    label: "Subdirección Administrativa / Tesorería",
    short: "Tesorería",
    description: "Auditoría de recibos en Soles, costos, tarifas y conciliación financiera.",
    email: "tesoreria@leoncioprado.edu.pe",
    password: "Tesoreria2026!",
    person: "Lic. José Antonio Ramos Díaz",
    position: "Subdirección Administrativa y Tesorería",
    icon: "Landmark"
  },
  CIST: {
    label: "Mantenimiento y Soporte Técnico — CIST",
    short: "Soporte CIST",
    description: "Diagnóstico de sensores SCT-013, nodos ESP32, amperaje y alertas técnicas.",
    email: "cist@leoncioprado.edu.pe",
    password: "Cist2026!",
    person: "Téc. Luis Alberto Quispe Rojas",
    position: "Responsable de Mantenimiento y Soporte Técnico — CIST",
    icon: "Wrench"
  }
} as const;

export type RoleKey = keyof typeof ROLES;

export const SEVERITIES = {
  CRITICA: { label: "Crítica", classes: "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20", dot: "bg-rose-500" },
  ADVERTENCIA: { label: "Advertencia", classes: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20", dot: "bg-amber-500" },
  INFORMATIVA: { label: "Informativa", classes: "bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20", dot: "bg-sky-500" }
} as const;

export const ALERT_STATUS = {
  PENDIENTE: { label: "Pendiente", classes: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20" },
  EN_REVISION: { label: "En revisión", classes: "bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20" },
  RESUELTA: { label: "Resuelta", classes: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20" }
} as const;

export const ALERT_TYPES: Record<string, string> = {
  SOBRECORRIENTE: "Sobrecorriente",
  VOLTAJE_ALTO: "Sobretensión",
  VOLTAJE_BAJO: "Baja tensión",
  FUERA_HORARIO: "Fuera de horario",
  NODO_OFFLINE: "Nodo sin conexión",
  FANTASMA: "Consumo fantasma"
};

export const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard", icon: "LayoutDashboard", section: "Principal" },
  { href: "/alertas", label: "Alertas inteligentes", icon: "BellRing", section: "Principal" },
  { href: "/consumo-fantasma", label: "Consumo fantasma", icon: "Ghost", section: "Energía" },
  { href: "/finanzas", label: "Finanzas y facturación", icon: "Wallet", section: "Energía" },
  { href: "/sostenibilidad", label: "Sostenibilidad ODS", icon: "Leaf", section: "Energía" },
  { href: "/dispositivos-iot", label: "Nodos IoT", icon: "Cpu", section: "Operación" },
  { href: "/reportes", label: "Reportes PDF", icon: "FileText", section: "Institución" },
  { href: "/usuarios", label: "Usuarios y roles", icon: "Users", section: "Institución" }
] as const;

export const REPORT_TYPES = {
  ejecutivo: {
    label: "Ejecutivo para Dirección",
    description: "Indicadores de ahorro, KPIs institucionales y recomendaciones estratégicas."
  },
  costos: {
    label: "Auditoría de Costos para Tesorería",
    description: "Consumo en kWh, costos en Soles, tarifas, IGV y conciliación financiera."
  },
  tecnico: {
    label: "Técnico de Mantenimiento",
    description: "Estado de nodos, sensores SCT-013, picos de corriente y alertas técnicas."
  }
} as const;

export type ReportType = keyof typeof REPORT_TYPES;
