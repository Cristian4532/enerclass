"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { CalendarDays, CheckCircle2, ClipboardCheck, Clock3, Ghost, Moon, RefreshCcw, ScanSearch, ShieldAlert, Undo2, Wallet, X, Zap } from "lucide-react";
import { toast } from "sonner";
import { useApiData } from "@/hooks/use-api-data";
import { useSimulator } from "@/components/simulator-provider";
import { Badge, Button, Card, CardHeader, ErrorState, PageHeader, StatCard, Skeleton } from "@/components/ui";
import { Pagination } from "@/components/pagination";
import { apiFetch } from "@/lib/client";
import type { GhostData, GhostFindingItem } from "@/lib/types";
import { cn, formatInteger, formatKwh, formatNumber, formatSoles, formatDateTime, timeAgo } from "@/lib/utils";

type Filter = "TODOS" | "PENDIENTE" | "INSPECCIONADO";

const PAGE_SIZE = 10;

const GhostBarChart = dynamic(() => import("@/components/charts/ghost-bar-chart").then((mod) => mod.GhostBarChart), {
  ssr: false,
  loading: () => <div className="h-[300px] w-full animate-pulse rounded-lg bg-slate-100/70 dark:bg-white/[0.03]" />
});

export default function GhostConsumptionPage() {
  const { running } = useSimulator();
  const [status, setStatus] = useState<Filter>("TODOS");
  const [zone, setZone] = useState("TODAS");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [page, setPage] = useState(1);
  const [scanning, setScanning] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const query = new URLSearchParams();
  if (status !== "TODOS") query.set("status", status);
  if (zone !== "TODAS") query.set("zone", zone);
  if (from) query.set("from", from);
  if (to) query.set("to", to);
  query.set("page", String(page));
  query.set("pageSize", String(PAGE_SIZE));

  const { data, loading, error, refresh, refreshing } = useApiData<GhostData>(`/api/ghost?${query.toString()}`, {
    interval: running ? 15000 : 45000
  });

  useEffect(() => {
    if (data && page > data.totalPages) setPage(data.totalPages);
  }, [data, page]);

  async function scan() {
    setScanning(true);
    try {
      const result = await apiFetch<{ scannedZones: number; detectedKwh: number; message: string }>("/api/ghost/scan", { method: "POST" });
      toast.success(`${result.message} ${formatKwh(result.detectedKwh)} detectados.`);
      await refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No se pudo ejecutar el barrido.");
    } finally {
      setScanning(false);
    }
  }

  async function toggleInspection(finding: GhostFindingItem) {
    setUpdatingId(finding.id);
    const next = finding.status === "PENDIENTE" ? "INSPECCIONADO" : "PENDIENTE";
    try {
      await apiFetch(`/api/ghost/${finding.id}`, { method: "PATCH", body: JSON.stringify({ status: next }) });
      toast.success(next === "INSPECCIONADO" ? "Inspección registrada correctamente." : "Hallazgo reabierto.");
      await refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No se pudo actualizar el hallazgo.");
    } finally {
      setUpdatingId(null);
    }
  }

  if (loading && !data) return <GhostSkeleton />;
  if (error && !data) return <ErrorState message={error} onRetry={refresh} />;
  if (!data) return <GhostSkeleton />;

  const { totals, byZone, findings, counts } = data;
  const totalFindings = (counts.PENDIENTE ?? 0) + (counts.INSPECCIONADO ?? 0);

  return (
    <div className="animate-fade-up">
      <PageHeader
        eyebrow="Auditoría energética · ODS 7"
        title="Detector de consumos fantasmas"
        description="Identificación de cargas residuales fuera del horario lectivo: noches de 18:00 a 07:30, fines de semana y feriados. Cada hallazgo tiene un responsable y seguimiento."
        icon={<Ghost className="h-5 w-5" />}
        actions={
          <>
            <Badge className="h-8 border-violet-500/20 bg-violet-500/10 px-3 text-violet-700 dark:text-violet-400" dot="bg-violet-500">
              Ventana nocturna activa
            </Badge>
            <Button variant="secondary" size="sm" onClick={refresh} disabled={refreshing}>
              <RefreshCcw className={cn("h-3.5 w-3.5", refreshing && "animate-spin")} /> Actualizar
            </Button>
            <Button size="sm" onClick={scan} loading={scanning}>
              {!scanning ? <ScanSearch className="h-3.5 w-3.5" /> : null} Escanear fugas
            </Button>
          </>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Pérdida económica detectada"
          value={formatSoles(totals.lossSoles)}
          icon={<Wallet className="h-5 w-5" />}
          hint="Valorizada a tarifa BT3 referencial"
          accent="rose"
          trend={{ value: `${totals.pending} por atender`, positive: false }}
        />
        <StatCard
          label="Energía desperdiciada"
          value={formatNumber(totals.wastedKwh, 1)}
          unit="kWh"
          icon={<Zap className="h-5 w-5" />}
          hint="Proyección mensual de circuitos identificados"
          accent="amber"
        />
        <StatCard
          label="Consumo fantasma"
          value={formatNumber(totals.ghostPct, 1)}
          unit="%"
          icon={<Moon className="h-5 w-5" />}
          hint="Del consumo total de los últimos 30 días"
          accent="violet"
          footer={<div className="h-1 overflow-hidden rounded-full bg-slate-100 dark:bg-white/10"><div className="h-full rounded-full bg-violet-500" style={{ width: `${Math.min(100, totals.ghostPct * 4)}%` }} /></div>}
        />
        <StatCard
          label="Circuitos detectados"
          value={totalFindings}
          icon={<ScanSearch className="h-5 w-5" />}
          hint={`${totals.inspected} inspeccionados · ${totals.pending} pendientes`}
          accent="cyan"
        />
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader
            title="Consumo lectivo vs. consumo fantasma"
            description="Energía acumulada por tablero en los últimos 30 días (kWh)"
            icon={<Zap className="h-4 w-4" />}
            action={
              <div className="flex items-center gap-3 text-[9.5px] text-slate-400">
                <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-brand-500" /> Lectivo</span>
                <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-rose-400" /> Fantasma</span>
              </div>
            }
          />
          <GhostBarChart byZone={byZone} />
          <div className="grid grid-cols-2 divide-x divide-slate-100 border-t border-slate-100 py-3.5 text-center dark:divide-white/[0.06] dark:border-white/[0.06]">
            <div>
              <p className="text-[9.5px] font-semibold uppercase tracking-wider text-slate-400">Consumo lectivo</p>
              <p className="mt-0.5 text-sm font-bold text-emerald-600 dark:text-emerald-400">{formatKwh(totals.lectivoKwh, 0)}</p>
            </div>
            <div>
              <p className="text-[9.5px] font-semibold uppercase tracking-wider text-slate-400">Consumo fuera de horario</p>
              <p className="mt-0.5 text-sm font-bold text-rose-500">{formatKwh(totals.fantasmaKwh, 0)}</p>
            </div>
          </div>
        </Card>

        <Card>
          <CardHeader title="Huella de la fuga nocturna" description="Participación del consumo fantasma" icon={<Moon className="h-4 w-4" />} />
          <div className="p-5">
            <div className="relative mx-auto flex h-44 w-44 items-center justify-center">
              <div
                className="absolute inset-0 rounded-full"
                style={{ background: `conic-gradient(#8b5cf6 ${Math.min(100, totals.ghostPct * 5)}%, rgba(148,163,184,0.13) 0)` }}
              />
              <div className="absolute inset-[13px] rounded-full bg-white dark:bg-[#0b1626]" />
              <div className="relative text-center">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Fantasma</p>
                <p className="mt-0.5 text-[30px] font-bold tracking-tight text-slate-900 dark:text-white">{formatNumber(totals.ghostPct, 1)}%</p>
                <p className="text-[9.5px] text-slate-400">del consumo total</p>
              </div>
            </div>
            <div className="mt-6 space-y-3">
              <div className="flex items-start gap-2.5 rounded-lg bg-slate-50 p-3 dark:bg-white/[0.03]">
                <Moon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-violet-500" />
                <div>
                  <p className="text-[10.5px] font-semibold text-slate-700 dark:text-slate-200">18:00 – 07:30</p>
                  <p className="mt-0.5 text-[9.5px] leading-relaxed text-slate-400">Noches, sábados, domingos y feriados del calendario escolar.</p>
                </div>
              </div>
              <div className="flex items-start gap-2.5 rounded-lg bg-slate-50 p-3 dark:bg-white/[0.03]">
                <ShieldAlert className="mt-0.5 h-3.5 w-3.5 shrink-0 text-rose-500" />
                <div>
                  <p className="text-[10.5px] font-semibold text-slate-700 dark:text-slate-200">{formatSoles(totals.lossSoles)} potencialmente recuperables</p>
                  <p className="mt-0.5 text-[9.5px] leading-relaxed text-slate-400">Si se ejecutan las inspecciones y se corrigen los circuitos identificados.</p>
                </div>
              </div>
            </div>
          </div>
        </Card>
      </div>

      <Card className="mt-5 overflow-hidden">
        <CardHeader
          title="Hallazgos de equipos y circuitos"
          description="Cargas residuales detectadas en la auditoría del periodo"
          icon={<ScanSearch className="h-4 w-4" />}
          action={
            <div className="flex flex-wrap items-center gap-2">
              {(["TODOS", "PENDIENTE", "INSPECCIONADO"] as Filter[]).map((item) => (
                <button
                  key={item}
                  onClick={() => {
                    setStatus(item);
                    setPage(1);
                  }}
                  className={cn(
                    "rounded-full border px-2.5 py-1 text-[10px] font-semibold transition",
                    status === item
                      ? "border-slate-900 bg-slate-900 text-white dark:border-brand-500 dark:bg-brand-500"
                      : "border-slate-200 bg-white text-slate-500 hover:border-slate-300 dark:border-white/10 dark:bg-white/[0.03] dark:text-slate-400"
                  )}
                >
                  {item === "TODOS" ? "Todos" : item === "PENDIENTE" ? "Pendientes" : "Inspeccionados"}
                  <span className="ml-1 opacity-60">
                    {item === "TODOS" ? totalFindings : counts[item] ?? 0}
                  </span>
                </button>
              ))}
            </div>
          }
        />
        <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 px-4 py-3 dark:border-white/[0.06] sm:px-5">
          <select
            value={zone}
            onChange={(event) => {
              setZone(event.target.value);
              setPage(1);
            }}
            className="input h-8 w-auto px-2.5 text-[10.5px]"
            aria-label="Filtrar por zona"
          >
            <option value="TODAS">Todas las zonas</option>
            {byZone.map((item) => (
              <option key={item.code} value={item.code}>{item.name}</option>
            ))}
          </select>
          <label className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2 py-1 dark:border-white/10 dark:bg-white/[0.03]">
            <CalendarDays className="h-3.5 w-3.5 text-slate-400" />
            <input
              type="date"
              value={from}
              onChange={(event) => {
                setFrom(event.target.value);
                setPage(1);
              }}
              className="w-[112px] bg-transparent text-[10px] text-slate-600 outline-none dark:text-slate-300"
              aria-label="Desde"
            />
          </label>
          <span className="text-[10px] text-slate-400">a</span>
          <input
            type="date"
            value={to}
            onChange={(event) => {
              setTo(event.target.value);
              setPage(1);
            }}
            className="input h-8 w-[128px] px-2 text-[10px]"
            aria-label="Hasta"
          />
          {status !== "TODOS" || zone !== "TODAS" || from || to ? (
            <button
              onClick={() => {
                setStatus("TODOS");
                setZone("TODAS");
                setFrom("");
                setTo("");
                setPage(1);
              }}
              className="inline-flex h-8 items-center gap-1 rounded-md px-2 text-[10px] font-semibold text-slate-500 transition hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-white/[0.05]"
            >
              <X className="h-3 w-3" /> Limpiar
            </button>
          ) : null}
          <span className="ml-auto text-[10px] text-slate-400">Página {data.page} de {data.totalPages}</span>
        </div>
        <div className="table-wrap">
          <table className="table-base min-w-[960px]">
            <thead>
              <tr>
                <th className="th">Zona / tablero</th>
                <th className="th">Equipo o circuito</th>
                <th className="th text-right">Corriente residual</th>
                <th className="th text-right">kWh desperdiciados</th>
                <th className="th text-right">Pérdida en Soles</th>
                <th className="th">Estado</th>
                <th className="th text-right">Acción</th>
              </tr>
            </thead>
            <tbody>
              {findings.map((finding) => (
                <tr key={finding.id} className={cn("transition hover:bg-slate-50/70 dark:hover:bg-white/[0.02]", finding.status === "INSPECCIONADO" && "opacity-70")}>
                  <td className="td">
                    <span className="flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full" style={{ backgroundColor: finding.zoneColor }} />
                      <span className="text-[11.5px] font-semibold text-slate-700 dark:text-slate-200">{finding.zoneName}</span>
                    </span>
                  </td>
                  <td className="td max-w-[300px]">
                    <p className="text-[11.5px] font-medium text-slate-700 dark:text-slate-200">{finding.equipment}</p>
                    <p className="mt-0.5 line-clamp-2 text-[10px] leading-relaxed text-slate-400">{finding.description}</p>
                    {finding.inspectedAt ? (
                      <p className="mt-1 inline-flex items-center gap-1 text-[9px] text-emerald-500">
                        <CheckCircle2 className="h-2.5 w-2.5" /> {finding.inspector} · {formatDateTime(finding.inspectedAt)}
                      </p>
                    ) : null}
                  </td>
                  <td className="td text-right font-mono text-[11px]">{formatNumber(finding.residualAmps, 2)} A</td>
                  <td className="td text-right font-mono text-[11px]">{formatNumber(finding.wastedKwh, 1)}</td>
                  <td className="td text-right font-semibold text-rose-500">{formatSoles(finding.lossSoles)}</td>
                  <td className="td">
                    <Badge className={finding.status === "PENDIENTE" ? "border-amber-500/20 bg-amber-500/10 text-amber-600 dark:text-amber-400" : "border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"}>
                      {finding.status === "PENDIENTE" ? "Pendiente" : "Inspeccionado"}
                    </Badge>
                  </td>
                  <td className="td text-right">
                    <Button
                      variant={finding.status === "PENDIENTE" ? "secondary" : "ghost"}
                      size="sm"
                      loading={updatingId === finding.id}
                      onClick={() => void toggleInspection(finding)}
                    >
                      {finding.status === "PENDIENTE" ? <ClipboardCheck className="h-3 w-3" /> : <Undo2 className="h-3 w-3" />}
                      {finding.status === "PENDIENTE" ? "Marcar inspección" : "Reabrir"}
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!findings.length ? (
          <div className="py-14 text-center text-xs text-slate-400">
            No hay hallazgos para los filtros seleccionados. Ejecute un nuevo barrido o limpie los filtros.
          </div>
        ) : null}
        <Pagination
          page={data.page}
          totalPages={data.totalPages}
          total={data.findingsTotal}
          pageSize={data.pageSize}
          onPageChange={setPage}
          label="hallazgos"
        />
        <div className="flex flex-col gap-2 border-t border-slate-100 px-5 py-3.5 text-[10px] text-slate-400 dark:border-white/[0.06] dark:text-slate-500 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <span className="inline-flex items-center gap-1.5">
            <Clock3 className="h-3 w-3" /> Último barrido: {data.lastScanAt ? `${timeAgo(data.lastScanAt)} · ${formatDateTime(data.lastScanAt)}` : "—"}
          </span>
          <span>Proyección mensual · {data.periodLabel} · Tarifa referencial S/ 0.715 / kWh</span>
        </div>
      </Card>

      <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {byZone.map((zone) => (
          <Card key={zone.code} className="card-pad">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full" style={{ backgroundColor: zone.color }} />
              <p className="text-[11px] font-semibold text-slate-700 dark:text-slate-200">{zone.name}</p>
              <span className="ml-auto text-[9px] text-slate-400">{formatNumber(zone.residualAmps, 2)} A</span>
            </div>
            <p className="mt-3 text-lg font-bold text-rose-500">{formatSoles(zone.lossSoles)}</p>
            <p className="text-[9.5px] text-slate-400">Pérdida fuera de horario · {formatInteger(zone.fantasmaKwh)} kWh</p>
            <div className="mt-2.5 h-1 overflow-hidden rounded-full bg-slate-100 dark:bg-white/10">
              <div className="h-full rounded-full bg-violet-500" style={{ width: `${Math.min(100, (zone.fantasmaKwh / Math.max(1, totals.fantasmaKwh)) * 100)}%` }} />
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

function GhostSkeleton() {
  return (
    <div>
      <Skeleton className="h-8 w-72" />
      <Skeleton className="mt-2 h-3 w-[520px] max-w-full" />
      <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => <Skeleton key={index} className="h-32 w-full" />)}
      </div>
      <Skeleton className="mt-5 h-[380px] w-full" />
    </div>
  );
}
