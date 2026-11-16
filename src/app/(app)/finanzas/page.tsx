"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { Calculator, DoorOpen, Gauge, Info, Landmark, Leaf, Receipt, RefreshCcw, TrendingDown, Users, Wallet, Zap } from "lucide-react";
import { useApiData } from "@/hooks/use-api-data";
import { Badge, Card, CardHeader, ErrorState, PageHeader, Skeleton, StatCard } from "@/components/ui";
import { DEMAND_CHARGE, FIXED_CHARGE } from "@/lib/constants";
import type { FinanceData } from "@/lib/types";
import { cn, formatInteger, formatKwh, formatNumber, formatSoles } from "@/lib/utils";

const FinanceBarChart = dynamic(() => import("@/components/charts/finance-bar-chart").then((mod) => mod.FinanceBarChart), {
  ssr: false,
  loading: () => <div className="h-[280px] w-full animate-pulse rounded-lg bg-slate-100/70 dark:bg-white/[0.03]" />
});

function buildBill(kwh: number, demandKw: number, tariff: number, igv: number) {
  const energyCharge = kwh * tariff;
  const demandCharge = demandKw * DEMAND_CHARGE;
  const subtotal = energyCharge + demandCharge + FIXED_CHARGE;
  const igvAmount = subtotal * igv;
  return {
    energyCharge,
    demandCharge,
    fixed: FIXED_CHARGE,
    subtotal,
    igv: igvAmount,
    total: subtotal + igvAmount
  };
}

export default function FinancePage() {
  const { data, loading, error, refresh, refreshing } = useApiData<FinanceData>("/api/finance", { interval: 60000 });
  const [tariff, setTariff] = useState<number | null>(null);
  const [students, setStudents] = useState<number | null>(null);
  const [classrooms, setClassrooms] = useState<number | null>(null);

  const simulation = useMemo(() => {
    if (!data) return null;
    const currentTariff = tariff ?? data.base.tariff;
    const currentStudents = students ?? data.base.students;
    const currentClassrooms = classrooms ?? data.base.classrooms;
    const optimized = buildBill(data.base.kwh, data.base.maxDemandKw, currentTariff, data.base.igv);
    const baseline = buildBill(data.base.baselineKwh, data.base.maxDemandKw * 1.12, currentTariff, data.base.igv);
    const weekly = data.weeks.map((week) => ({
      ...week,
      currentSoles: week.currentKwh * currentTariff * (1 + data.base.igv),
      baselineSoles: week.baselineKwh * currentTariff * (1 + data.base.igv)
    }));
    return {
      tariff: currentTariff,
      students: currentStudents,
      classrooms: currentClassrooms,
      optimized,
      baseline,
      saving: baseline.total - optimized.total,
      yearlySaving: (baseline.total - optimized.total) * 12,
      savingPct: baseline.total > 0 ? ((baseline.total - optimized.total) / baseline.total) * 100 : 0,
      kwhPerStudent: data.base.kwh / currentStudents,
      solesPerClassroom: optimized.total / currentClassrooms,
      costPerKwh: optimized.total / data.base.kwh,
      weekly
    };
  }, [data, tariff, students, classrooms]);

  if (loading && !data) return <FinanceSkeleton />;
  if (error && !data) return <ErrorState message={error} onRetry={refresh} />;
  if (!data || !simulation) return <FinanceSkeleton />;

  return (
    <div className="animate-fade-up">
      <PageHeader
        eyebrow="Administración · Tesorería"
        title="Costos y facturación del servicio eléctrico"
        description="Estimación del recibo mensual de la I.E. N° 2001 «Leoncio Prado», comparación con el escenario sin mejoras y cálculo del gasto por estudiante y por aula."
        icon={<Landmark className="h-5 w-5" />}
        actions={
          <>
            <Badge className="h-8 border-brand-500/20 bg-brand-500/10 px-3 text-brand-700 dark:text-brand-400" dot="bg-brand-500">
              Tarifa BT3 · IGV 18%
            </Badge>
            <button onClick={refresh} disabled={refreshing} className="btn-secondary btn-sm">
              <RefreshCcw className={cn("h-3.5 w-3.5", refreshing && "animate-spin")} /> Actualizar
            </button>
            <Link href="/reportes" className="btn-primary btn-sm">
              <Receipt className="h-3.5 w-3.5" /> Reporte de costos
            </Link>
          </>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Ahorro mensual estimado"
          value={formatSoles(simulation.saving)}
          icon={<TrendingDown className="h-5 w-5" />}
          hint={`${formatNumber(simulation.savingPct, 1)}% menos que el escenario sin mejoras`}
          accent="brand"
          footer={<div className="h-1 overflow-hidden rounded-full bg-slate-100 dark:bg-white/10"><div className="h-full w-[82%] rounded-full bg-brand-500" /></div>}
        />
        <StatCard
          label="kWh por estudiante"
          value={formatNumber(simulation.kwhPerStudent, 2)}
          unit="kWh"
          icon={<Users className="h-5 w-5" />}
          hint={`${formatInteger(simulation.students)} estudiantes · ${formatKwh(data.base.kwh, 0)}`}
          accent="cyan"
        />
        <StatCard
          label="Soles por aula"
          value={formatSoles(simulation.solesPerClassroom)}
          icon={<DoorOpen className="h-5 w-5" />}
          hint={`${simulation.classrooms} aulas · indicador institucional`}
          accent="violet"
        />
        <StatCard
          label="Ahorro anual proyectado"
          value={formatSoles(simulation.yearlySaving)}
          icon={<Wallet className="h-5 w-5" />}
          hint="Proyección a 12 meses con la misma tarifa"
          accent="amber"
          trend={{ value: "18%", positive: true }}
        />
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-3">
        <div className="space-y-5 xl:col-span-2">
          <div className="grid gap-4 lg:grid-cols-2">
            <InvoiceCard
              title="Con mejoras"
              subtitle="Recibo estimado con las mejoras"
              badge="OPTIMIZADO"
              highlighted
              bill={simulation.optimized}
              kwh={data.base.kwh}
              tariff={simulation.tariff}
            />
            <InvoiceCard
              title="Sin mejoras"
              subtitle="Escenario de referencia"
              badge="LÍNEA BASE"
              bill={simulation.baseline}
              kwh={data.base.baselineKwh}
              tariff={simulation.tariff}
            />
          </div>

          <Card>
            <CardHeader
              title="Gasto semanal: sin mejoras y con mejoras"
              description="Comparativo semanal en Soles con IGV incluido"
              icon={<Receipt className="h-4 w-4" />}
              action={
                <div className="flex items-center gap-3 text-[9.5px] text-slate-400">
                  <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-slate-300 dark:bg-slate-600" /> Sin mejoras</span>
                  <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-brand-500" /> Con mejoras</span>
                </div>
              }
            />
            <FinanceBarChart weekly={simulation.weekly} />
            <div className="flex items-center justify-between border-t border-slate-100 px-5 py-3.5 text-[10px] dark:border-white/[0.06] sm:px-6">
              <span className="inline-flex items-center gap-1.5 text-slate-400"><Info className="h-3 w-3" /> Cálculo referencial: tarifa BT3, cargo por demanda y cargo fijo; incluye IGV.</span>
              <span className="hidden font-semibold text-brand-600 dark:text-brand-400 sm:block">Ahorro acumulado: {formatSoles(simulation.saving)}</span>
            </div>
          </Card>

          <Card>
            <CardHeader title="Detalle de consumo y costo por tablero" description={`Periodo: ${data.periodLabel}`} icon={<Gauge className="h-4 w-4" />} />
            <div className="table-wrap">
              <table className="table-base min-w-[760px]">
                <thead>
                  <tr>
                    <th className="th">Tablero / zona</th>
                    <th className="th text-right">Consumo (kWh)</th>
                    <th className="th text-right">Costo energía (S/)</th>
                    <th className="th text-right">Participación</th>
                    <th className="th text-right">Corriente prom.</th>
                    <th className="th text-right">Pico (kW)</th>
                  </tr>
                </thead>
                <tbody>
                  {data.byZone.map((zone) => (
                    <tr key={zone.code} className="transition hover:bg-slate-50/70 dark:hover:bg-white/[0.02]">
                      <td className="td">
                        <span className="flex items-center gap-2">
                          <span className="h-2 w-2 rounded-full" style={{ backgroundColor: zone.color }} />
                          <span className="text-[11.5px] font-semibold text-slate-700 dark:text-slate-200">{zone.name}</span>
                        </span>
                      </td>
                      <td className="td text-right font-mono text-[11px]">{formatNumber(zone.kwh, 1)}</td>
                      <td className="td text-right font-semibold text-slate-800 dark:text-slate-200">{formatSoles(zone.cost)}</td>
                      <td className="td text-right">
                        <div className="ml-auto flex w-24 items-center gap-2">
                          <div className="h-1 flex-1 overflow-hidden rounded-full bg-slate-100 dark:bg-white/10">
                            <div className="h-full rounded-full" style={{ width: `${zone.pct}%`, backgroundColor: zone.color }} />
                          </div>
                          <span className="w-8 text-right text-[10px] text-slate-400">{zone.pct}%</span>
                        </div>
                      </td>
                      <td className="td text-right font-mono text-[11px]">{formatNumber(zone.avgAmps, 2)} A</td>
                      <td className="td text-right font-mono text-[11px]">{formatNumber(zone.peakKw, 2)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-slate-50/70 dark:bg-white/[0.02]">
                    <td className="td font-semibold text-slate-800 dark:text-slate-100">Total del plantel</td>
                    <td className="td text-right font-semibold">{formatNumber(data.base.kwh, 1)}</td>
                    <td className="td text-right font-semibold">{formatSoles(simulation.optimized.total)}</td>
                    <td className="td text-right font-semibold">100%</td>
                    <td className="td" />
                    <td className="td text-right font-semibold">{formatNumber(data.base.maxDemandKw, 2)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </Card>
        </div>

        <div className="space-y-5">
          <Card>
            <CardHeader title="Simulador de facturación" description="Ajuste las variables del recibo" icon={<Calculator className="h-4 w-4" />} />
            <div className="space-y-5 p-5">
              <div>
                <div className="flex items-center justify-between">
                  <label className="label mb-0">Tarifa de energía</label>
                  <span className="font-mono text-[11px] font-semibold text-brand-600 dark:text-brand-400">S/ {simulation.tariff.toFixed(3)} / kWh</span>
                </div>
                <input
                  type="range"
                  min={0.55}
                  max={1}
                  step={0.005}
                  value={simulation.tariff}
                  onChange={(event) => setTariff(Number(event.target.value))}
                  className="mt-2.5 w-full accent-emerald-600"
                />
                <div className="mt-1 flex justify-between text-[9px] text-slate-400"><span>S/ 0.55</span><span>Osinergmin BT3</span><span>S/ 1.00</span></div>
              </div>
              <div>
                <div className="flex items-center justify-between">
                  <label className="label mb-0">Número de estudiantes</label>
                  <span className="font-mono text-[11px] font-semibold text-slate-700 dark:text-slate-200">{formatInteger(simulation.students)}</span>
                </div>
                <input
                  type="range"
                  min={400}
                  max={1200}
                  step={10}
                  value={simulation.students}
                  onChange={(event) => setStudents(Number(event.target.value))}
                  className="mt-2.5 w-full accent-emerald-600"
                />
              </div>
              <div>
                <div className="flex items-center justify-between">
                  <label className="label mb-0">Aulas en uso</label>
                  <span className="font-mono text-[11px] font-semibold text-slate-700 dark:text-slate-200">{simulation.classrooms}</span>
                </div>
                <input
                  type="range"
                  min={12}
                  max={40}
                  step={1}
                  value={simulation.classrooms}
                  onChange={(event) => setClassrooms(Number(event.target.value))}
                  className="mt-2.5 w-full accent-emerald-600"
                />
              </div>
              <div className="grid grid-cols-2 gap-2.5">
                <div className="rounded-lg bg-slate-50 p-3 dark:bg-white/[0.03]">
                  <p className="text-[9px] font-semibold uppercase tracking-wider text-slate-400">kWh / estudiante</p>
                  <p className="mt-1 text-lg font-bold text-slate-900 dark:text-white">{formatNumber(simulation.kwhPerStudent, 2)}</p>
                </div>
                <div className="rounded-lg bg-slate-50 p-3 dark:bg-white/[0.03]">
                  <p className="text-[9px] font-semibold uppercase tracking-wider text-slate-400">S/ por aula</p>
                  <p className="mt-1 text-lg font-bold text-slate-900 dark:text-white">{formatSoles(simulation.solesPerClassroom)}</p>
                </div>
                <div className="rounded-lg bg-slate-50 p-3 dark:bg-white/[0.03]">
                  <p className="text-[9px] font-semibold uppercase tracking-wider text-slate-400">Costo efectivo kWh</p>
                  <p className="mt-1 text-sm font-bold text-slate-900 dark:text-white">S/ {simulation.costPerKwh.toFixed(3)}</p>
                </div>
                <div className="rounded-lg bg-slate-50 p-3 dark:bg-white/[0.03]">
                  <p className="text-[9px] font-semibold uppercase tracking-wider text-slate-400">Ahorro anual</p>
                  <p className="mt-1 text-sm font-bold text-brand-600 dark:text-brand-400">{formatSoles(simulation.yearlySaving)}</p>
                </div>
              </div>
              <button
                onClick={() => { setTariff(null); setStudents(null); setClassrooms(null); }}
                className="w-full text-center text-[10px] font-semibold text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                Restablecer valores institucionales
              </button>
            </div>
          </Card>

          <Card className="overflow-hidden border-brand-500/20">
            <div className="bg-gradient-to-br from-brand-600 to-teal-800 p-5 text-white">
              <Leaf className="h-5 w-5 text-brand-200" />
              <p className="mt-3 text-[10px] font-bold uppercase tracking-[0.15em] text-brand-200">Impacto del ahorro</p>
              <p className="mt-1 text-2xl font-bold">{formatSoles(simulation.saving)}<span className="ml-1 text-xs font-medium text-brand-200">/ mes</span></p>
              <p className="mt-1 text-[10.5px] leading-relaxed text-brand-100/80">
                El ahorro equivale a {formatNumber(data.kpis.co2Avoided, 1)} kg de CO₂ evitados. Puede destinarse a materiales pedagógicos y mantenimiento.
              </p>
              <div className="mt-4 flex items-center gap-2 text-[10px] text-brand-100/90">
                <Zap className="h-3.5 w-3.5" /> {formatKwh(data.base.baselineKwh - data.base.kwh, 0)} de energía evitada al mes
              </div>
            </div>
          </Card>

          <Card className="card-pad">
            <div className="flex items-center gap-2">
              <Info className="h-3.5 w-3.5 text-slate-400" />
              <p className="text-[11px] font-semibold text-slate-700 dark:text-slate-200">Nota sobre el cálculo</p>
            </div>
            <p className="mt-2 text-[10px] leading-relaxed text-slate-500 dark:text-slate-400">
              Simulación referencial basada en la estructura tarifaria BT3: energía (S/ {simulation.tariff.toFixed(3)}/kWh), cargo por demanda (S/ {DEMAND_CHARGE.toFixed(2)}/kW) y cargo fijo (S/ {FIXED_CHARGE.toFixed(2)}), más IGV del 18 %. La facturación final depende del pliego tarifario vigente del concesionario.
            </p>
          </Card>
        </div>
      </div>
    </div>
  );
}

function InvoiceCard({
  title,
  subtitle,
  badge,
  bill,
  kwh,
  tariff,
  highlighted
}: {
  title: string;
  subtitle: string;
  badge: string;
  bill: { energyCharge: number; demandCharge: number; fixed: number; subtotal: number; igv: number; total: number };
  kwh: number;
  tariff: number;
  highlighted?: boolean;
}) {
  return (
    <div className={cn("relative overflow-hidden rounded-2xl border bg-white p-5 shadow-card dark:bg-[#0b1626]", highlighted ? "border-brand-500/40 ring-1 ring-brand-500/20" : "border-slate-200 dark:border-white/[0.07]")}>
      {highlighted ? <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-brand-500 to-teal-400" /> : null}
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[12px] font-semibold text-slate-900 dark:text-white">{title}</p>
          <p className="mt-0.5 text-[9.5px] text-slate-400">{subtitle}</p>
        </div>
        <Badge className={highlighted ? "border-brand-500/20 bg-brand-500/10 text-brand-700 dark:text-brand-400" : "border-slate-200 bg-slate-50 text-slate-500 dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-400"}>{badge}</Badge>
      </div>
      <div className="mt-4 rounded-lg bg-slate-50 px-3 py-2.5 dark:bg-white/[0.03]">
        <div className="flex items-baseline justify-between">
          <span className="text-[9.5px] uppercase tracking-wider text-slate-400">Total del recibo</span>
          <span className={cn("text-xl font-bold tracking-tight", highlighted ? "text-brand-600 dark:text-brand-400" : "text-slate-700 dark:text-slate-200")}>{formatSoles(bill.total)}</span>
        </div>
      </div>
      <div className="mt-3 space-y-2 text-[10.5px]">
        <div className="flex justify-between text-slate-500 dark:text-slate-400">
          <span>Energía · {formatNumber(kwh, 0)} kWh × S/ {tariff.toFixed(3)}</span>
          <span className="font-medium tabular-nums text-slate-700 dark:text-slate-200">{formatSoles(bill.energyCharge)}</span>
        </div>
        <div className="flex justify-between text-slate-500 dark:text-slate-400">
          <span>Cargo por demanda</span>
          <span className="font-medium tabular-nums text-slate-700 dark:text-slate-200">{formatSoles(bill.demandCharge)}</span>
        </div>
        <div className="flex justify-between text-slate-500 dark:text-slate-400">
          <span>Cargo fijo</span>
          <span className="font-medium tabular-nums text-slate-700 dark:text-slate-200">{formatSoles(bill.fixed)}</span>
        </div>
        <div className="flex justify-between border-t border-dashed border-slate-200 pt-2 text-slate-500 dark:border-white/10 dark:text-slate-400">
          <span>Subtotal</span>
          <span className="font-medium tabular-nums text-slate-700 dark:text-slate-200">{formatSoles(bill.subtotal)}</span>
        </div>
        <div className="flex justify-between text-slate-500 dark:text-slate-400">
          <span>IGV (18 %)</span>
          <span className="font-medium tabular-nums text-slate-700 dark:text-slate-200">{formatSoles(bill.igv)}</span>
        </div>
        <div className="flex justify-between border-t border-slate-200 pt-2 text-[11px] font-semibold dark:border-white/10">
          <span className="text-slate-700 dark:text-slate-200">Total a pagar</span>
          <span className={highlighted ? "text-brand-600 dark:text-brand-400" : "text-slate-800 dark:text-slate-200"}>{formatSoles(bill.total)}</span>
        </div>
      </div>
    </div>
  );
}

function FinanceSkeleton() {
  return (
    <div>
      <Skeleton className="h-8 w-80" />
      <Skeleton className="mt-2 h-3 w-[520px] max-w-full" />
      <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => <Skeleton key={index} className="h-32 w-full" />)}
      </div>
      <div className="mt-5 grid gap-5 xl:grid-cols-3">
        <Skeleton className="h-[460px] xl:col-span-2" />
        <Skeleton className="h-[460px]" />
      </div>
    </div>
  );
}
