"use client";

import { Award, Car, Leaf, Lightbulb, RefreshCcw, Smartphone, Sparkles, TreePine, Zap } from "lucide-react";
import dynamic from "next/dynamic";
import { useApiData } from "@/hooks/use-api-data";
import { Badge, Card, CardHeader, ErrorState, PageHeader, Progress, Skeleton, StatCard } from "@/components/ui";
import type { SustainabilityData } from "@/lib/types";
import { cn, formatInteger, formatKwh, formatNumber, formatSoles } from "@/lib/utils";

const SustainabilityBarChart = dynamic(
  () => import("@/components/charts/sustainability-bar-chart").then((mod) => mod.SustainabilityBarChart),
  {
    ssr: false,
    loading: () => <div className="h-[300px] w-full animate-pulse rounded-lg bg-slate-100/70 dark:bg-white/[0.03]" />
  }
);

const GRADE_STYLES: Record<string, { text: string; bg: string; hex: string }> = {
  A: { text: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-500", hex: "#10b981" },
  B: { text: "text-lime-600 dark:text-lime-400", bg: "bg-lime-500", hex: "#84cc16" },
  C: { text: "text-yellow-600 dark:text-yellow-400", bg: "bg-yellow-500", hex: "#eab308" },
  D: { text: "text-amber-600 dark:text-amber-400", bg: "bg-amber-500", hex: "#f59e0b" },
  E: { text: "text-orange-600 dark:text-orange-400", bg: "bg-orange-500", hex: "#f97316" },
  F: { text: "text-rose-600 dark:text-rose-400", bg: "bg-rose-500", hex: "#f43f5e" },
  G: { text: "text-red-700 dark:text-red-400", bg: "bg-red-600", hex: "#dc2626" }
};

export default function SustainabilityPage() {
  const { data, loading, error, refresh, refreshing } = useApiData<SustainabilityData>("/api/sustainability", { interval: 60000 });

  if (loading && !data) return <SustainabilitySkeleton />;
  if (error && !data) return <ErrorState message={error} onRetry={refresh} />;
  if (!data) return <SustainabilitySkeleton />;

  const grade = GRADE_STYLES[data.efficiency.rating] ?? GRADE_STYLES.C;
  const score = Math.min(100, Math.max(5, data.efficiency.score));

  return (
    <div className="animate-fade-up">
      <PageHeader
        eyebrow="Impacto ambiental · ODS 7 y ODS 13"
        title="Sostenibilidad e impacto ambiental"
        description="Emisiones evitadas, equivalencia en árboles y nivel de eficiencia del colegio a partir del ahorro del periodo."
        icon={<Leaf className="h-5 w-5" />}
        actions={
          <>
            <Badge className="h-8 border-emerald-500/20 bg-emerald-500/10 px-3 text-emerald-700 dark:text-emerald-400" dot="bg-emerald-500">
              ODS 7 · Energía limpia
            </Badge>
            <Badge className="h-8 border-lime-500/20 bg-lime-500/10 px-3 text-lime-700 dark:text-lime-400" dot="bg-lime-500">
              ODS 13 · Acción climática
            </Badge>
            <button onClick={refresh} disabled={refreshing} className="btn-secondary btn-sm">
              <RefreshCcw className={cn("h-3.5 w-3.5", refreshing && "animate-spin")} /> Actualizar
            </button>
          </>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="CO₂ evitado"
          value={formatNumber(data.co2Avoided, 1)}
          unit="kg CO₂e"
          icon={<Leaf className="h-5 w-5" />}
          hint="Factor de emisión referencial 0.45 kg/kWh"
          accent="brand"
          trend={{ value: "18% menos", positive: true }}
        />
        <StatCard
          label="Árboles equivalentes"
          value={formatNumber(data.treesEquivalent, 1)}
          unit="árboles"
          icon={<TreePine className="h-5 w-5" />}
          hint="Absorción media de 21.7 kg CO₂/año"
          accent="cyan"
        />
        <StatCard
          label="Energía evitada"
          value={formatNumber(data.avoidedKwh, 0)}
          unit="kWh"
          icon={<Zap className="h-5 w-5" />}
          hint={`${formatKwh(data.currentKwh, 0)} consumidos frente a ${formatKwh(data.baselineKwh, 0)} de referencia`}
          accent="amber"
        />
        <StatCard
          label="Eficiencia del plantel"
          value={data.efficiency.rating}
          icon={<Award className="h-5 w-5" />}
          hint={`${data.efficiency.label} · ${formatNumber(data.efficiency.kwhPerStudent, 2)} kWh/estudiante`}
          accent="violet"
          footer={<Progress value={score} className="h-1" />}
        />
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-3">
        <Card className="relative overflow-hidden">
          <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-emerald-500 via-lime-400 to-teal-400" />
          <CardHeader title="Nivel de eficiencia energética" description="Escala institucional A – G" icon={<Award className="h-4 w-4" />} />
          <div className="p-5">
            <div className="relative mx-auto flex h-48 w-48 items-center justify-center">
              <svg viewBox="0 0 120 120" className="absolute inset-0 h-full w-full -rotate-90">
                <circle cx="60" cy="60" r="52" fill="none" stroke="currentColor" strokeWidth="8" className="text-slate-100 dark:text-white/[0.06]" />
                <circle
                  cx="60"
                  cy="60"
                  r="52"
                  fill="none"
                  stroke={grade.hex}
                  strokeWidth="8"
                  strokeLinecap="round"
                  strokeDasharray={`${(score / 100) * 326.7} 326.7`}
                  className="transition-all duration-1000"
                />
              </svg>
              <div className="text-center">
                <p className={cn("text-[52px] font-bold leading-none tracking-tight", grade.text)}>{data.efficiency.rating}</p>
                <p className="mt-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400">{data.efficiency.label}</p>
                <p className="mt-0.5 text-[9px] text-slate-400">{score}/100</p>
              </div>
            </div>
            <div className="mt-4 grid grid-cols-7 gap-1">
              {Object.keys(GRADE_STYLES).map((letter) => (
                <div
                  key={letter}
                  className={cn(
                    "flex h-6 items-center justify-center rounded text-[9.5px] font-bold",
                    letter === data.efficiency.rating
                      ? `${GRADE_STYLES[letter].bg} text-white shadow-sm`
                      : "bg-slate-100 text-slate-400 dark:bg-white/[0.04] dark:text-slate-500"
                  )}
                >
                  {letter}
                </div>
              ))}
            </div>
            <p className="mt-4 text-[10.5px] leading-relaxed text-slate-500 dark:text-slate-400">{data.efficiency.description}</p>
            <div className="mt-3 rounded-lg bg-brand-500/[0.07] px-3 py-2.5 text-[10px] leading-relaxed text-brand-700 dark:text-brand-300">
              <Sparkles className="mr-1 inline h-3 w-3" /> {data.efficiency.next}
            </div>
          </div>
        </Card>

        <Card className="xl:col-span-2">
          <CardHeader
            title="Energía del periodo: sin mejoras y con mejoras"
            description={`Consumo semanal · ${data.periodLabel}`}
            icon={<Zap className="h-4 w-4" />}
            action={
              <div className="flex items-center gap-3 text-[9.5px] text-slate-400">
                <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-slate-300 dark:bg-slate-600" /> Sin mejoras</span>
                <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-brand-500" /> Con mejoras</span>
              </div>
            }
          />
          <SustainabilityBarChart weeks={data.weeks} />
          <div className="grid grid-cols-3 divide-x divide-slate-100 border-t border-slate-100 py-3.5 text-center dark:divide-white/[0.06] dark:border-white/[0.06]">
            <div>
              <p className="text-[9px] font-semibold uppercase tracking-wider text-slate-400">Reducción</p>
              <p className="mt-0.5 text-sm font-bold text-brand-600 dark:text-brand-400">{formatNumber(data.savingsRate, 1)}%</p>
            </div>
            <div>
              <p className="text-[9px] font-semibold uppercase tracking-wider text-slate-400">CO₂ evitado</p>
              <p className="mt-0.5 text-sm font-bold text-emerald-600 dark:text-emerald-400">{formatNumber(data.co2Avoided, 1)} kg</p>
            </div>
            <div>
              <p className="text-[9px] font-semibold uppercase tracking-wider text-slate-400">Equivalente árboles</p>
              <p className="mt-0.5 text-sm font-bold text-slate-800 dark:text-slate-200">{formatNumber(data.treesEquivalent, 1)}</p>
            </div>
          </div>
        </Card>
      </div>

      <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { icon: Car, label: "Kilómetros en auto evitados", value: formatInteger(data.equivalences.carKm), unit: "km", hint: "Emisiones promedio de un automóvil particular" },
          { icon: Lightbulb, label: "Horas de LED encendido", value: formatInteger(data.equivalences.ledHours), unit: "horas", hint: "Equivalente a un foco LED de 9 W" },
          { icon: Smartphone, label: "Cargas de smartphone", value: formatInteger(data.equivalences.smartphones), unit: "cargas", hint: "Energía equivalente a 0.02 kWh por carga" },
          { icon: TreePine, label: "Árboles absorbiendo CO₂", value: formatNumber(data.treesEquivalent, 1), unit: "árboles", hint: "Durante un año completo" }
        ].map((item) => (
          <Card key={item.label} className="card-pad">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <item.icon className="h-4 w-4" />
            </div>
            <p className="mt-3 text-[10px] font-semibold uppercase tracking-wider text-slate-400">{item.label}</p>
            <p className="mt-1 text-xl font-bold tracking-tight text-slate-900 dark:text-white">
              {item.value} <span className="text-[10px] font-medium text-slate-400">{item.unit}</span>
            </p>
            <p className="mt-1.5 text-[9.5px] leading-relaxed text-slate-400">{item.hint}</p>
          </Card>
        ))}
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        <Card className="overflow-hidden">
          <div className="flex items-start gap-4 bg-[#fcc30b] p-5 text-[#3d2f00]">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-[#3d2f00] text-2xl font-black text-[#fcc30b]">7</div>
            <div>
              <p className="text-[9px] font-bold uppercase tracking-[0.16em] opacity-70">Objetivo de Desarrollo Sostenible</p>
              <h3 className="mt-1 text-lg font-bold leading-tight">Energía asequible y no contaminante</h3>
              <p className="mt-1 text-[10.5px] leading-relaxed opacity-80">Meta 7.3: duplicar la tasa mundial de mejora de la eficiencia energética al 2030.</p>
            </div>
          </div>
          <div className="p-5">
            <div className="flex items-center justify-between text-[10px]">
              <span className="font-medium text-slate-600 dark:text-slate-300">Contribución institucional</span>
              <span className="font-bold text-slate-900 dark:text-white">{formatNumber(data.savingsRate, 1)}% de reducción</span>
            </div>
            <Progress value={data.savingsRate} max={20} className="mt-2 h-1.5" barClassName="bg-[#fcc30b]" />
            <div className="mt-3 grid grid-cols-2 gap-3">
              <div className="rounded-lg bg-amber-500/[0.07] p-3">
                <p className="text-[9px] uppercase tracking-wider text-slate-400">Energía evitada</p>
                <p className="mt-1 text-sm font-bold text-slate-900 dark:text-white">{formatKwh(data.avoidedKwh, 0)}</p>
              </div>
              <div className="rounded-lg bg-amber-500/[0.07] p-3">
                <p className="text-[9px] uppercase tracking-wider text-slate-400">Eficiencia</p>
                <p className="mt-1 text-sm font-bold text-slate-900 dark:text-white">Categoría {data.efficiency.rating}</p>
              </div>
            </div>
            <p className="mt-3 text-[10px] leading-relaxed text-slate-500 dark:text-slate-400">
              El seguimiento por tableros y la revisión de consumos fuera de horario aportan a la meta de eficiencia energética del ODS 7 en el colegio.
            </p>
          </div>
        </Card>

        <Card className="overflow-hidden">
          <div className="flex items-start gap-4 bg-[#3f7e44] p-5 text-white">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-white text-2xl font-black text-[#3f7e44]">13</div>
            <div>
              <p className="text-[9px] font-bold uppercase tracking-[0.16em] text-white/60">Objetivo de Desarrollo Sostenible</p>
              <h3 className="mt-1 text-lg font-bold leading-tight">Acción por el clima</h3>
              <p className="mt-1 text-[10.5px] leading-relaxed text-white/75">Meta 13.2: incorporar medidas relativas al cambio climático en las políticas institucionales.</p>
            </div>
          </div>
          <div className="p-5">
            <div className="flex items-center justify-between text-[10px]">
              <span className="font-medium text-slate-600 dark:text-slate-300">Huella evitada del periodo</span>
              <span className="font-bold text-emerald-600 dark:text-emerald-400">{formatNumber(data.co2Avoided, 1)} kg CO₂e</span>
            </div>
            <Progress value={Math.min(100, data.co2Avoided / 4)} className="mt-2 h-1.5" barClassName="bg-[#3f7e44]" />
            <div className="mt-3 grid grid-cols-2 gap-3">
              <div className="rounded-lg bg-emerald-500/[0.07] p-3">
                <p className="text-[9px] uppercase tracking-wider text-slate-400">Árboles equivalentes</p>
                <p className="mt-1 text-sm font-bold text-slate-900 dark:text-white">{formatNumber(data.treesEquivalent, 1)}</p>
              </div>
              <div className="rounded-lg bg-emerald-500/[0.07] p-3">
                <p className="text-[9px] uppercase tracking-wider text-slate-400">Ahorro económico</p>
                <p className="mt-1 text-sm font-bold text-slate-900 dark:text-white">{formatSoles(data.avoidedKwh * 0.715)}</p>
              </div>
            </div>
            <p className="mt-3 text-[10px] leading-relaxed text-slate-500 dark:text-slate-400">
              La reducción de kWh disminuye las emisiones asociadas al Sistema Eléctrico Interconectado Nacional (SEIN).
            </p>
          </div>
        </Card>
      </div>

      <Card className="mt-5">
        <CardHeader title="Aporte por tablero a la reducción de emisiones" description="CO₂ evitado estimado en los últimos 30 días" icon={<Leaf className="h-4 w-4" />} />
        <div className="grid gap-5 p-5 sm:grid-cols-2 lg:grid-cols-4">
          {data.byZone.map((zone) => (
            <div key={zone.code} className="rounded-xl border border-slate-100 p-4 dark:border-white/[0.06]">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-[11px] font-semibold text-slate-700 dark:text-slate-200">
                  <span className="h-2 w-2 rounded-full" style={{ backgroundColor: zone.color }} />
                  {zone.name}
                </span>
                <span className="text-[9px] font-semibold text-slate-400">{zone.pct}%</span>
              </div>
              <p className="mt-3 text-lg font-bold text-slate-900 dark:text-white">{formatNumber(zone.co2, 1)} <span className="text-[10px] font-medium text-slate-400">kg CO₂</span></p>
              <p className="text-[9.5px] text-slate-400">{formatKwh(zone.kwh, 0)} consumidos</p>
              <div className="mt-2.5 h-1 overflow-hidden rounded-full bg-slate-100 dark:bg-white/10">
                <div className="h-full rounded-full" style={{ width: `${zone.pct}%`, backgroundColor: zone.color }} />
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

function SustainabilitySkeleton() {
  return (
    <div>
      <Skeleton className="h-8 w-80" />
      <Skeleton className="mt-2 h-3 w-[540px] max-w-full" />
      <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => <Skeleton key={index} className="h-32 w-full" />)}
      </div>
      <div className="mt-5 grid gap-5 xl:grid-cols-3">
        <Skeleton className="h-[430px]" />
        <Skeleton className="h-[430px] xl:col-span-2" />
      </div>
    </div>
  );
}
