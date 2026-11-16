"use client";

import Link from "next/link";
import dynamic from "next/dynamic";
import { memo, useMemo, useState } from "react";
import {
  Activity,
  ArrowRight,
  BellRing,
  FileText,
  Gauge,
  Leaf,
  PlugZap,
  RefreshCcw,
  Target,
  TrendingDown,
  Wallet,
  Zap,
  Clock3,
  CircleDollarSign
} from "lucide-react";
import { useApiData } from "@/hooks/use-api-data";
import { useSimulator } from "@/components/simulator-provider";
import { Badge, Button, Card, CardHeader, ErrorState, PageHeader, Progress, SectionLabel, Skeleton, StatCard } from "@/components/ui";
import { Icon } from "@/components/icon";
import { ALERT_STATUS, SEVERITIES } from "@/lib/constants";
import type { DashboardData } from "@/lib/types";
import { cn, formatNumber, formatPercent, formatSoles, formatTime, timeAgo } from "@/lib/utils";

const RANGES = [
  { key: "live", label: "Tiempo real" },
  { key: "24h", label: "24 horas" },
  { key: "7d", label: "7 días" },
  { key: "30d", label: "30 días" }
] as const;

type RangeKey = (typeof RANGES)[number]["key"];

/**
 * Recharts pesa ~100 kB. Se carga en un chunk aparte solo cuando el dashboard
 * ya está pintado; en laptops de 4 GB la primera interacción llega antes.
 */
const EnergyFlowChart = dynamic(() => import("@/components/charts/energy-flow-chart").then((mod) => mod.EnergyFlowChart), {
  ssr: false,
  loading: () => <div className="h-[310px] w-full animate-pulse rounded-lg bg-slate-100/70 dark:bg-white/[0.03]" />
});
const DistributionPie = dynamic(() => import("@/components/charts/distribution-pie").then((mod) => mod.DistributionPie), {
  ssr: false,
  loading: () => <div className="mx-5 h-[200px] animate-pulse rounded-full bg-slate-100/70 dark:bg-white/[0.03]" />
});

export default function DashboardPage() {
  const [range, setRange] = useState<RangeKey>("24h");
  const { running } = useSimulator();
  const { data, loading, error, refresh, refreshing } = useApiData<DashboardData>(`/api/dashboard?range=${range}`, {
    interval: running ? 6000 : 20000
  });
  // Debe ejecutarse antes de cualquier retorno condicional (reglas de hooks).
  // Solo se conservan los últimos 30 puntos para el gráfico en vivo.
  const series = useMemo(() => data?.series.slice(-30) ?? [], [data]);

  if (loading && !data) return <DashboardSkeleton />;
  if (error && !data) return <ErrorState message={error} onRetry={refresh} />;
  if (!data) return <DashboardSkeleton />;

  const { kpis, zones, distribution, recentAlerts } = data;
  const voltageOk = kpis.voltage >= 205 && kpis.voltage <= 240;
  const pfOk = kpis.powerFactor >= 0.9;

  return (
    <div className="animate-fade-up">
      <PageHeader
        eyebrow="Inicio · Consumo del periodo"
        title="Panel principal"
        description="Consumo de los cuatro tableros de la I.E. N° 2001 «Leoncio Prado», con lecturas en vivo, gasto acumulado y alertas del periodo."
        icon={<Zap className="h-5 w-5" />}
        actions={
          <>
            <Badge
              className={cn(
                "h-8 gap-2 border px-3",
                running
                  ? "border-brand-500/25 bg-brand-500/10 text-brand-700 dark:text-brand-300"
                  : "border-slate-200 bg-white text-slate-500 dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-400"
              )}
              dot={running ? "bg-brand-500 animate-pulse" : "bg-slate-400"}
            >
              {running ? "Simulación en vivo" : "Monitoreo activo"}
            </Badge>
            <Button variant="secondary" size="sm" onClick={refresh} disabled={refreshing}>
              <RefreshCcw className={cn("h-3.5 w-3.5", refreshing && "animate-spin")} /> Actualizar
            </Button>
            <Link href="/reportes" className="btn-primary btn-sm">
              <FileText className="h-3.5 w-3.5" /> Reporte PDF
            </Link>
          </>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
        <CurrentPowerCard value={kpis.currentKw} peak={kpis.peakKw} running={running} />
        <MonthCostCard value={kpis.monthCost} baseline={kpis.baselineCost} savingsPct={kpis.savingsPct} />
        <TotalCurrentCard value={kpis.totalCurrent} />
        <VoltageCard value={kpis.voltage} ok={voltageOk} />
        <PowerFactorCard value={kpis.powerFactor} ok={pfOk} />
        <SavingsCard pct={kpis.savingsPct} soles={kpis.savingsSoles} />
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-3">
        <Card className="overflow-hidden xl:col-span-2">
          <CardHeader
            title="Demanda eléctrica en tiempo real"
            description={`Potencia promedio por tablero · ${data.periodLabel}`}
            icon={<Activity className="h-4 w-4" />}
            action={
              <div className="flex rounded-lg border border-slate-200 bg-slate-50 p-0.5 dark:border-white/10 dark:bg-white/[0.03]">
                {RANGES.map((item) => (
                  <button
                    key={item.key}
                    onClick={() => setRange(item.key)}
                    className={cn(
                      "rounded-md px-2.5 py-1.5 text-[10.5px] font-semibold transition",
                      range === item.key
                        ? "bg-white text-slate-900 shadow-sm dark:bg-white/[0.09] dark:text-white"
                        : "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
                    )}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            }
          />
          <div className="px-4 pt-5 sm:px-6">
            <div className="mb-4 flex flex-wrap items-center gap-x-5 gap-y-2">
              {zones.map((zone) => (
                <div key={zone.code} className="flex items-center gap-1.5 text-[10.5px] font-medium text-slate-500 dark:text-slate-400">
                  <span className="h-2 w-2 rounded-full" style={{ backgroundColor: zone.color }} />
                  {zone.shortName}
                </div>
              ))}
              <span className="ml-auto hidden items-center gap-1.5 text-[10px] text-slate-400 dark:text-slate-500 sm:flex">
                <Clock3 className="h-3 w-3" /> {formatTime(data.generatedAt)}
              </span>
            </div>
            <EnergyFlowChart series={series} zones={zones} />
          </div>
          <div className="flex flex-col gap-2 border-t border-slate-100 px-5 py-3.5 text-[10px] text-slate-400 dark:border-white/[0.06] dark:text-slate-500 sm:flex-row sm:items-center sm:justify-between sm:px-6">
            <span className="inline-flex items-center gap-1.5">
              <span className={cn("h-1.5 w-1.5 rounded-full", running ? "animate-pulse bg-brand-500" : "bg-slate-400")} />
              {running ? "Lecturas de los sensores cada 3 segundos" : "Active el simulador para ver lecturas en vivo"}
            </span>
            <span>Pico del periodo: {formatNumber(kpis.peakKw, 2)} kW</span>
          </div>
        </Card>

        <Card className="flex flex-col">
          <CardHeader
            title="Distribución de carga"
            description="Consumo y costo por tablero · 30 días"
            icon={<Gauge className="h-4 w-4" />}
          />
          <DistributionPie
            distribution={distribution}
            monthCost={kpis.monthCost}
            monthKwh={kpis.monthKwh}
          />
          <div className="flex-1 space-y-3 px-5 pb-5 pt-3 sm:px-6">
            {distribution.map((item) => (
              <div key={item.code}>
                <div className="flex items-center justify-between gap-2">
                  <span className="flex min-w-0 items-center gap-2 text-[11px] font-medium text-slate-600 dark:text-slate-300">
                    <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: item.color }} />
                    <span className="truncate">{item.name}</span>
                  </span>
                  <span className="shrink-0 text-[11px] font-semibold tabular-nums text-slate-800 dark:text-slate-200">{formatPercent(item.pct)}</span>
                </div>
                <div className="mt-1.5 flex items-center gap-2">
                  <div className="h-1 flex-1 overflow-hidden rounded-full bg-slate-100 dark:bg-white/10">
                    <div className="h-full rounded-full transition-all duration-700" style={{ width: `${item.pct}%`, backgroundColor: item.color }} />
                  </div>
                  <span className="w-16 text-right text-[9.5px] tabular-nums text-slate-400">{formatSoles(item.cost)}</span>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <div className="mt-5">
        <div className="mb-3 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-slate-900 dark:text-white">Tableros monitoreados</h2>
            <p className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">Cuatro sensores de corriente conectados al equipo central ESP32-LP-01</p>
          </div>
          <Badge className="border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400" dot="bg-emerald-500">
            {zones.filter((zone) => zone.online).length}/4 en línea
          </Badge>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {zones.map((zone) => (
            <Card key={zone.id} className="card-hover group overflow-hidden">
              <div className="h-1 w-full" style={{ backgroundColor: zone.color }} />
              <div className="p-5">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg" style={{ backgroundColor: `${zone.color}18`, color: zone.color }}>
                      <Icon name={zone.icon} className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-[12px] font-semibold text-slate-900 dark:text-white">{zone.shortName}</p>
                      <p className="text-[9.5px] text-slate-400">{zone.deviceId}</p>
                    </div>
                  </div>
                  <span className={cn("h-2 w-2 rounded-full", zone.online ? "bg-emerald-500" : "bg-slate-400")} />
                </div>
                <div className="mt-4 flex items-end justify-between">
                  <div>
                    <p className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">{formatNumber(zone.currentKw, 2)}<span className="ml-1 text-[11px] font-medium text-slate-400">kW</span></p>
                    <p className="mt-0.5 text-[10.5px] text-slate-500 dark:text-slate-400">{formatNumber(zone.currentAmps, 2)} A · {formatNumber(zone.voltageVolts, 0)} V</p>
                  </div>
                  <span className="text-[9.5px] text-slate-400">{zone.sharePct}%</span>
                </div>
                <div className="mt-3 h-1 overflow-hidden rounded-full bg-slate-100 dark:bg-white/10">
                  <div className="h-full rounded-full" style={{ width: `${zone.sharePct}%`, backgroundColor: zone.color }} />
                </div>
                <div className="mt-3 flex items-center justify-between text-[9.5px] text-slate-400">
                  <span>{formatSoles(zone.monthCost)} / mes</span>
                  <span className="inline-flex items-center gap-1">
                    <Clock3 className="h-2.5 w-2.5" /> {timeAgo(zone.lastReadingAt)}
                  </span>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader
            title="Alertas recientes"
            description="Eventos generados por el motor de reglas en los últimos días"
            icon={<BellRing className="h-4 w-4" />}
            action={
              <Link href="/alertas" className="inline-flex items-center gap-1 text-[11px] font-semibold text-brand-600 hover:underline dark:text-brand-400">
                Ver todas <ArrowRight className="h-3 w-3" />
              </Link>
            }
          />
          <div className="divide-y divide-slate-100 dark:divide-white/[0.05]">
            {recentAlerts.length ? (
              recentAlerts.map((alert) => {
                const severity = SEVERITIES[alert.severity] ?? SEVERITIES.INFORMATIVA;
                const status = ALERT_STATUS[alert.status] ?? ALERT_STATUS.PENDIENTE;
                return (
                  <Link href="/alertas" key={alert.id} className="flex items-start gap-3 px-5 py-3.5 transition hover:bg-slate-50/80 dark:hover:bg-white/[0.02] sm:px-6">
                    <span className={cn("mt-1.5 h-2 w-2 shrink-0 rounded-full", severity.dot)} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[12px] font-semibold text-slate-800 dark:text-slate-200">{alert.title}</p>
                      <p className="mt-0.5 text-[10px] text-slate-400">
                        {alert.zoneName} · {timeAgo(alert.createdAt)}
                      </p>
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-1">
                      <Badge className={severity.classes}>{severity.label}</Badge>
                      <span className={cn("text-[9px] font-medium", status.classes.split(" ").slice(2, 3).join(" "))}>{status.label}</span>
                    </div>
                  </Link>
                );
              })
            ) : (
              <div className="px-6 py-10 text-center text-xs text-slate-400">No hay alertas registradas.</div>
            )}
          </div>
        </Card>

        <Card className="overflow-hidden">
          <div className="relative overflow-hidden bg-[#07101d] p-5 text-white sm:p-6">
            <div className="absolute inset-0 bg-grid-dark opacity-50" />
            <div className="absolute -right-8 -top-8 h-40 w-40 rounded-full bg-brand-500/20 blur-3xl" />
            <div className="relative">
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.15em] text-brand-300">
                  <Target className="h-3.5 w-3.5" /> Impacto del mes
                </span>
                <Badge className="border-white/10 bg-white/5 text-brand-300">Meta 18%</Badge>
              </div>
              <p className="mt-4 text-[11px] text-slate-400">Ahorro económico liberado</p>
              <p className="mt-1 text-[32px] font-bold tracking-tight text-white">{formatSoles(kpis.savingsSoles)}</p>
              <div className="mt-4 space-y-2.5">
                <div>
                  <div className="flex justify-between text-[10px]">
                    <span className="text-slate-400">Gasto con mejoras</span>
                    <span className="font-semibold text-white">{formatSoles(kpis.monthCost)}</span>
                  </div>
                  <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-white/10">
                    <div className="h-full rounded-full bg-gradient-to-r from-brand-500 to-emerald-300" style={{ width: `${100 - kpis.savingsPct}%` }} />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-[10px]">
                    <span className="text-slate-400">Escenario sin mejoras</span>
                    <span className="font-semibold text-slate-300">{formatSoles(kpis.baselineCost)}</span>
                  </div>
                  <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-white/10">
                    <div className="h-full w-full rounded-full bg-white/20" />
                  </div>
                </div>
              </div>
              <div className="mt-5 grid grid-cols-2 gap-3 border-t border-white/[0.07] pt-4">
                <div>
                  <p className="flex items-center gap-1 text-[9px] uppercase tracking-wider text-slate-500"><Leaf className="h-3 w-3 text-brand-400" /> CO₂ evitado</p>
                  <p className="mt-1 text-sm font-bold text-white">{formatNumber(kpis.co2Avoided, 1)} kg</p>
                </div>
                <div>
                  <p className="flex items-center gap-1 text-[9px] uppercase tracking-wider text-slate-500"><CircleDollarSign className="h-3 w-3 text-brand-400" /> Por aula</p>
                  <p className="mt-1 text-sm font-bold text-white">{formatSoles(kpis.monthCost / 24)}</p>
                </div>
              </div>
              <Link href="/finanzas" className="mt-5 flex items-center justify-between rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2.5 text-[11px] font-semibold text-slate-200 transition hover:bg-white/[0.08]">
                Ver costos y facturación <ArrowRight className="h-3.5 w-3.5 text-brand-400" />
              </Link>
            </div>
          </div>
          <div className="flex items-center gap-2 px-5 py-3 text-[10px] text-slate-500 dark:text-slate-400">
            <span className={cn("h-1.5 w-1.5 rounded-full", running ? "animate-pulse bg-brand-500" : "bg-slate-400")} />
            {running ? "Datos actualizándose en vivo" : "Última actualización automática"}
            <span className="ml-auto">{formatTime(data.generatedAt)}</span>
          </div>
        </Card>
      </div>

      <div className="mt-5 flex flex-col gap-3 rounded-xl border border-dashed border-slate-200 bg-white/50 px-4 py-3 text-[10px] text-slate-400 dark:border-white/10 dark:bg-white/[0.02] dark:text-slate-500 sm:flex-row sm:items-center sm:justify-between">
        <span className="inline-flex items-center gap-1.5">
          <SectionLabel>Periodo de facturación:</SectionLabel> {data.periodLabel} · Tarifa referencial BT3 S/ 0.715 / kWh
        </span>
        <span>Fuente: cuatro sensores SCT-013 y equipo ESP32 · Lecturas de 30 días y registro en vivo</span>
      </div>
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div>
      <div className="mb-6 flex items-end justify-between">
        <div>
          <Skeleton className="h-3 w-32" />
          <Skeleton className="mt-3 h-8 w-64" />
          <Skeleton className="mt-2 h-3 w-[420px] max-w-full" />
        </div>
        <Skeleton className="hidden h-8 w-32 sm:block" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
        {Array.from({ length: 6 }).map((_, index) => (
          <div key={index} className="card card-pad">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="mt-3 h-8 w-28" />
            <Skeleton className="mt-3 h-2 w-full" />
          </div>
        ))}
      </div>
      <div className="mt-5 grid gap-5 xl:grid-cols-3">
        <div className="card xl:col-span-2">
          <div className="border-b border-slate-100 p-6 dark:border-white/[0.06]">
            <Skeleton className="h-4 w-52" />
            <Skeleton className="mt-2 h-3 w-72 max-w-full" />
          </div>
          <div className="p-6">
            <Skeleton className="h-[300px] w-full" />
          </div>
        </div>
        <div className="card">
          <div className="border-b border-slate-100 p-6 dark:border-white/[0.06]">
            <Skeleton className="h-4 w-40" />
          </div>
          <div className="p-6">
            <Skeleton className="mx-auto h-[180px] w-[180px] rounded-full" />
          </div>
        </div>
      </div>
    </div>
  );
}

const KPI_ICONS = {
  current: <Zap className="h-5 w-5" />,
  cost: <Wallet className="h-5 w-5" />,
  amps: <Activity className="h-5 w-5" />,
  voltage: <PlugZap className="h-5 w-5" />,
  factor: <Gauge className="h-5 w-5" />,
  savings: <TrendingDown className="h-5 w-5" />
};

const CurrentPowerCard = memo(function CurrentPowerCard({ value, peak, running }: { value: number; peak: number; running: boolean }) {
  return (
    <StatCard
      label="Consumo actual"
      value={formatNumber(value, 2)}
      unit="kW"
      icon={KPI_ICONS.current}
      hint={running ? "Lecturas cada 3 segundos" : "Última lectura de los cuatro tableros"}
      accent="brand"
      footer={<Progress value={(value / Math.max(peak, 1)) * 100} className="h-1" />}
    />
  );
});

const MonthCostCard = memo(function MonthCostCard({ value, baseline, savingsPct }: { value: number; baseline: number; savingsPct: number }) {
  return (
    <StatCard
      label="Gasto acumulado"
      value={formatSoles(value)}
      icon={KPI_ICONS.cost}
      hint={`Sin mejoras: ${formatSoles(baseline)}`}
      accent="cyan"
      trend={{ value: `−${formatPercent(savingsPct, 0)}`, positive: true }}
    />
  );
});

const TotalCurrentCard = memo(function TotalCurrentCard({ value }: { value: number }) {
  return (
    <StatCard
      label="Corriente total"
      value={formatNumber(value, 1)}
      unit="A"
      icon={KPI_ICONS.amps}
      hint="Suma de los cuatro sensores"
      accent="amber"
      footer={<Progress value={(value / 100) * 100} className="h-1" barClassName="bg-amber-500" />}
    />
  );
});

const VoltageCard = memo(function VoltageCard({ value, ok }: { value: number; ok: boolean }) {
  return (
    <StatCard
      label="Tensión de red"
      value={formatNumber(value, 1)}
      unit="V"
      icon={KPI_ICONS.voltage}
      hint="Nominal 220 V · rango 205–240 V"
      accent="violet"
      footer={
        <div className="flex items-center gap-1.5">
          <span className={cn("h-1.5 w-1.5 rounded-full", ok ? "bg-emerald-500" : "bg-amber-500")} />
          <span className="text-[10px] font-medium text-slate-500 dark:text-slate-400">{ok ? "Tensión estable" : "Revisar tensión"}</span>
        </div>
      }
    />
  );
});

const PowerFactorCard = memo(function PowerFactorCard({ value, ok }: { value: number; ok: boolean }) {
  return (
    <StatCard
      label="Factor de potencia"
      value={formatNumber(value, 2)}
      icon={KPI_ICONS.factor}
      hint="Objetivo institucional ≥ 0.90"
      accent="rose"
      footer={<Progress value={value * 100} className="h-1" barClassName={ok ? "bg-emerald-500" : "bg-rose-500"} />}
    />
  );
});

const SavingsCard = memo(function SavingsCard({ pct, soles }: { pct: number; soles: number }) {
  return (
    <StatCard
      label="Ahorro logrado"
      value={`${formatNumber(pct, 0)}%`}
      icon={KPI_ICONS.savings}
      hint={`Ahorro estimado del periodo: S/ ${formatNumber(soles, 0)}`}
      accent="brand"
      footer={<Progress value={pct} max={25} className="h-1" />}
    />
  );
});
