"use client";

import { useEffect, useState } from "react";
import { AlertOctagon, AlertTriangle, BellRing, CalendarDays, CheckCircle2, Clock3, Info, RefreshCcw, Save, Search, Settings2, ShieldCheck, X } from "lucide-react";
import { toast } from "sonner";
import { useApiData } from "@/hooks/use-api-data";
import { useSimulator } from "@/components/simulator-provider";
import { Badge, Button, Card, CardHeader, ErrorState, PageHeader, Skeleton, StatCard } from "@/components/ui";
import { Pagination } from "@/components/pagination";
import { ALERT_STATUS, ALERT_TYPES, SEVERITIES } from "@/lib/constants";
import { apiFetch } from "@/lib/client";
import type { AlertItem, Severity, ThresholdItem } from "@/lib/types";
import { cn, formatNumber, formatDateTime, timeAgo } from "@/lib/utils";

type AlertsResponse = {
  alerts: AlertItem[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  counts: { bySeverity: Record<string, number>; byStatus: Record<string, number> };
  zones: { id: string; code: string; name: string; color: string }[];
};

type ThresholdsResponse = { thresholds: ThresholdItem[]; canEdit: boolean };

const severityFilters: { key: Severity | "TODAS"; label: string }[] = [
  { key: "TODAS", label: "Todas" },
  { key: "CRITICA", label: "Críticas" },
  { key: "ADVERTENCIA", label: "Advertencias" },
  { key: "INFORMATIVA", label: "Informativas" }
];

const PAGE_SIZE = 10;

export default function AlertsPage() {
  const { running } = useSimulator();
  const [severity, setSeverity] = useState<Severity | "TODAS">("TODAS");
  const [status, setStatus] = useState("TODOS");
  const [zone, setZone] = useState("TODAS");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchInput.trim());
      setPage(1);
    }, 450);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const query = new URLSearchParams();
  if (severity !== "TODAS") query.set("severity", severity);
  if (status !== "TODOS") query.set("status", status);
  if (zone !== "TODAS") query.set("zone", zone);
  if (from) query.set("from", from);
  if (to) query.set("to", to);
  if (search) query.set("q", search);
  query.set("page", String(page));
  query.set("pageSize", String(PAGE_SIZE));
  const url = `/api/alerts?${query.toString()}`;

  const { data, loading, error, refresh, refreshing } = useApiData<AlertsResponse>(url, {
    interval: running ? 5000 : 30000
  });
  const thresholds = useApiData<ThresholdsResponse>("/api/thresholds", { interval: 60000 });

  useEffect(() => {
    if (data && page > data.totalPages) setPage(data.totalPages);
  }, [data, page]);

  async function updateStatus(alert: AlertItem, nextStatus: string) {
    setUpdatingId(alert.id);
    try {
      await apiFetch(`/api/alerts/${alert.id}`, {
        method: "PATCH",
        body: JSON.stringify({ status: nextStatus })
      });
      toast.success(nextStatus === "RESUELTA" ? "Alerta marcada como resuelta." : "Estado de la alerta actualizado.");
      await refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No se pudo actualizar la alerta.");
    } finally {
      setUpdatingId(null);
    }
  }

  const counts = data?.counts;
  const filteredTotal = data?.total ?? 0;

  return (
    <div className="animate-fade-up">
      <PageHeader
        eyebrow="Motor de reglas · IoT"
        title="Centro de alertas inteligentes"
        description="Eventos de sobrecorriente, tensión y consumos fuera de horario detectados automáticamente por los sensores SCT-013 y el concentrador ESP32."
        icon={<BellRing className="h-5 w-5" />}
        actions={
          <>
            <Badge className={cn("h-8 border px-3", running ? "border-rose-500/20 bg-rose-500/10 text-rose-600 dark:text-rose-400" : "border-slate-200 bg-white text-slate-500 dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-400")} dot={running ? "bg-rose-500 animate-pulse" : "bg-slate-400"}>
              {running ? "Evaluando en vivo" : "Motor activo"}
            </Badge>
            <Button variant="secondary" size="sm" onClick={() => { void refresh(); void thresholds.refresh(); }} disabled={refreshing}>
              <RefreshCcw className={cn("h-3.5 w-3.5", refreshing && "animate-spin")} /> Actualizar
            </Button>
          </>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Alertas críticas"
          value={counts?.bySeverity.CRITICA ?? 0}
          icon={<AlertOctagon className="h-5 w-5" />}
          hint="Requieren atención inmediata"
          accent="rose"
          footer={<div className="h-1 rounded-full bg-rose-500/20"><div className="h-full rounded-full bg-rose-500" style={{ width: `${Math.min(100, (counts?.bySeverity.CRITICA ?? 0) * 25)}%` }} /></div>}
        />
        <StatCard
          label="Advertencias"
          value={counts?.bySeverity.ADVERTENCIA ?? 0}
          icon={<AlertTriangle className="h-5 w-5" />}
          hint="Revisar en la jornada técnica"
          accent="amber"
        />
        <StatCard
          label="Informativas"
          value={counts?.bySeverity.INFORMATIVA ?? 0}
          icon={<Info className="h-5 w-5" />}
          hint="Consumos fuera de horario y eventos menores"
          accent="cyan"
        />
        <StatCard
          label="Pendientes de atención"
          value={(counts?.byStatus.PENDIENTE ?? 0) + (counts?.byStatus.EN_REVISION ?? 0)}
          icon={<Clock3 className="h-5 w-5" />}
          hint={`${counts?.byStatus.RESUELTA ?? 0} alertas resueltas`}
          accent="violet"
          footer={<div className="h-1 rounded-full bg-violet-500/20"><div className="h-full w-2/3 rounded-full bg-violet-500" /></div>}
        />
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader
            title="Bandeja de alertas"
            description={`${filteredTotal} evento${filteredTotal === 1 ? "" : "s"} · página ${data?.page ?? 1} de ${data?.totalPages ?? 1}`}
            icon={<BellRing className="h-4 w-4" />}
            action={
              <div className="flex items-center gap-2 text-[10px] text-slate-400">
                <span className={cn("h-1.5 w-1.5 rounded-full", running ? "animate-pulse bg-brand-500" : "bg-slate-400")} />
                {running ? "Actualizando cada 5 s" : "Actualización automática"}
              </div>
            }
          />

          <div className="space-y-2.5 border-b border-slate-100 px-4 py-3.5 dark:border-white/[0.06] sm:px-5">
            <div className="flex flex-wrap items-center gap-1.5">
              {severityFilters.map((filter) => (
                <button
                  key={filter.key}
                  onClick={() => {
                    setSeverity(filter.key);
                    setPage(1);
                  }}
                  className={cn(
                    "rounded-full border px-3 py-1.5 text-[10.5px] font-semibold transition",
                    severity === filter.key
                      ? "border-slate-900 bg-slate-900 text-white dark:border-brand-500 dark:bg-brand-500"
                      : "border-slate-200 bg-white text-slate-500 hover:border-slate-300 dark:border-white/10 dark:bg-white/[0.03] dark:text-slate-400"
                  )}
                >
                  {filter.label}
                  {filter.key !== "TODAS" ? (
                    <span className="ml-1.5 opacity-60">{counts?.bySeverity[filter.key] ?? 0}</span>
                  ) : null}
                </button>
              ))}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative min-w-[150px] flex-1 lg:max-w-[210px]">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                <input
                  value={searchInput}
                  onChange={(event) => setSearchInput(event.target.value)}
                  placeholder="Buscar alerta…"
                  className="input h-8 pl-8 text-[11px]"
                />
                {searchInput ? (
                  <button onClick={() => setSearchInput("")} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                    <X className="h-3 w-3" />
                  </button>
                ) : null}
              </div>
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
                {data?.zones.map((item) => (
                  <option key={item.id} value={item.code}>{item.name}</option>
                ))}
              </select>
              <select
                value={status}
                onChange={(event) => {
                  setStatus(event.target.value);
                  setPage(1);
                }}
                className="input h-8 w-auto px-2.5 text-[10.5px]"
                aria-label="Filtrar por estado"
              >
                <option value="TODOS">Todos los estados</option>
                <option value="PENDIENTE">Pendiente</option>
                <option value="EN_REVISION">En revisión</option>
                <option value="RESUELTA">Resuelta</option>
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
              {severity !== "TODAS" || status !== "TODOS" || zone !== "TODAS" || from || to || search ? (
                <button
                  onClick={() => {
                    setSeverity("TODAS");
                    setStatus("TODOS");
                    setZone("TODAS");
                    setFrom("");
                    setTo("");
                    setSearchInput("");
                    setSearch("");
                    setPage(1);
                  }}
                  className="inline-flex h-8 items-center gap-1 rounded-md px-2 text-[10px] font-semibold text-slate-500 transition hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-white/[0.05]"
                >
                  <X className="h-3 w-3" /> Limpiar
                </button>
              ) : null}
            </div>
          </div>

          {loading && !data ? (
            <div className="space-y-3 p-5">
              {Array.from({ length: 5 }).map((_, index) => (
                <Skeleton key={index} className="h-24 w-full" />
              ))}
            </div>
          ) : error && !data ? (
            <div className="p-5">
              <ErrorState message={error} onRetry={refresh} />
            </div>
          ) : data?.alerts.length ? (
            <div className="divide-y divide-slate-100 dark:divide-white/[0.05]">
              {data.alerts.map((alert) => {
                const severityStyle = SEVERITIES[alert.severity] ?? SEVERITIES.INFORMATIVA;
                const statusStyle = ALERT_STATUS[alert.status] ?? ALERT_STATUS.PENDIENTE;
                const IconComp = alert.severity === "CRITICA" ? AlertOctagon : alert.severity === "ADVERTENCIA" ? AlertTriangle : Info;
                return (
                  <div key={alert.id} className="group px-4 py-4 transition hover:bg-slate-50/60 dark:hover:bg-white/[0.015] sm:px-5">
                    <div className="flex items-start gap-3">
                      <div className={cn("mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border", severityStyle.classes)}>
                        <IconComp className="h-4 w-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-[12.5px] font-semibold text-slate-900 dark:text-slate-100">{alert.title}</p>
                          <Badge className={severityStyle.classes}>{severityStyle.label}</Badge>
                          {alert.zoneName ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[9.5px] font-medium text-slate-500 dark:bg-white/[0.05] dark:text-slate-400">
                              <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: alert.zoneColor ?? "#94a3b8" }} />
                              {alert.zoneName}
                            </span>
                          ) : (
                            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[9.5px] font-medium text-slate-500 dark:bg-white/[0.05] dark:text-slate-400">Sistema</span>
                          )}
                          <span className="text-[9.5px] text-slate-400">{timeAgo(alert.createdAt)}</span>
                        </div>
                        <p className="mt-1.5 text-[11px] leading-relaxed text-slate-500 dark:text-slate-400">{alert.message}</p>
                        <div className="mt-2 flex flex-wrap items-center gap-3 text-[9.5px] text-slate-400">
                          <span className="font-medium uppercase tracking-wider">{ALERT_TYPES[alert.type] ?? alert.type}</span>
                          {alert.value !== null ? (
                            <span className="rounded-md bg-slate-100 px-1.5 py-0.5 font-mono dark:bg-white/[0.05]">
                              {formatNumber(alert.value, 2)}{alert.threshold !== null ? ` / ${formatNumber(alert.threshold, 2)}` : ""}
                            </span>
                          ) : null}
                          <span>{formatDateTime(alert.createdAt)}</span>
                          {alert.resolvedBy ? <span className="text-emerald-500">Resuelta por {alert.resolvedBy}</span> : null}
                        </div>
                      </div>
                      <div className="flex shrink-0 flex-col items-end gap-2">
                        <select
                          value={alert.status}
                          disabled={updatingId === alert.id}
                          onChange={(event) => void updateStatus(alert, event.target.value)}
                          className={cn(
                            "h-7 cursor-pointer rounded-full border px-2 text-[9.5px] font-semibold outline-none transition disabled:opacity-50",
                            statusStyle.classes
                          )}
                        >
                          <option value="PENDIENTE">Pendiente</option>
                          <option value="EN_REVISION">En revisión</option>
                          <option value="RESUELTA">Resuelta</option>
                        </select>
                        {alert.status !== "RESUELTA" ? (
                          <button
                            onClick={() => void updateStatus(alert, "RESUELTA")}
                            disabled={updatingId === alert.id}
                            className="inline-flex items-center gap-1 text-[9.5px] font-semibold text-emerald-600 hover:underline disabled:opacity-50 dark:text-emerald-400"
                          >
                            <CheckCircle2 className="h-3 w-3" /> Resolver
                          </button>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[9.5px] font-medium text-emerald-500">
                            <CheckCircle2 className="h-3 w-3" /> Atendida
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-500">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">Sin alertas para estos filtros</p>
              <p className="mt-1 text-xs text-slate-400">Los umbrales configurados no reportan eventos en este momento.</p>
            </div>
          )}

          {data ? (
            <Pagination
              page={data.page}
              totalPages={data.totalPages}
              total={data.total}
              pageSize={data.pageSize}
              onPageChange={setPage}
              label="alertas"
            />
          ) : null}
        </Card>

        <div className="space-y-5">
          <Card>
            <CardHeader title="Resumen por estado" description="Estado general del motor de alertas" icon={<Settings2 className="h-4 w-4" />} />
            <div className="space-y-3 p-5">
              {Object.entries(ALERT_STATUS).map(([key, value]) => {
                const count = counts?.byStatus[key] ?? 0;
                const total = Object.values(counts?.byStatus ?? {}).reduce((sum, item) => sum + item, 0) || 1;
                return (
                  <div key={key}>
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="flex items-center gap-2 font-medium text-slate-600 dark:text-slate-300">
                        <span className={cn("h-1.5 w-1.5 rounded-full", key === "PENDIENTE" ? "bg-amber-500" : key === "EN_REVISION" ? "bg-sky-500" : "bg-emerald-500")} />
                        {value.label}
                      </span>
                      <span className="font-semibold tabular-nums text-slate-800 dark:text-slate-200">{count}</span>
                    </div>
                    <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-slate-100 dark:bg-white/10">
                      <div
                        className={cn("h-full rounded-full", key === "PENDIENTE" ? "bg-amber-500" : key === "EN_REVISION" ? "bg-sky-500" : "bg-emerald-500")}
                        style={{ width: `${(count / total) * 100}%` }}
                      />
                    </div>
                  </div>
                );
              })}
              <div className="pt-2 text-[10px] leading-relaxed text-slate-400">
                Las alertas se evalúan automáticamente con cada trama recibida del ESP32. Un mismo evento no se duplica dentro de los 30 minutos.
              </div>
            </div>
          </Card>

          <Card className="overflow-hidden border-brand-500/20 bg-gradient-to-br from-brand-50 to-white dark:from-brand-500/[0.06] dark:to-[#0b1626]">
            <div className="p-5">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-500/15 text-brand-600 dark:text-brand-400">
                <ShieldCheck className="h-4 w-4" />
              </div>
              <p className="mt-3 text-[12px] font-semibold text-slate-900 dark:text-white">Reglas activas en los 4 tableros</p>
              <ul className="mt-2.5 space-y-1.5 text-[10.5px] leading-relaxed text-slate-500 dark:text-slate-400">
                <li>• Sobrecorriente según límite por sensor.</li>
                <li>• Tensión mínima y máxima permitida.</li>
                <li>• Consumo nocturno, fines de semana y feriados.</li>
                <li>• Deduplicación de eventos cada 30 minutos.</li>
              </ul>
            </div>
          </Card>
        </div>
      </div>

      <Card className="mt-5">
        <CardHeader
          title="Configurador de umbrales SCT-013"
          description="Límites por sensor utilizados por el motor de reglas en tiempo real"
          icon={<Settings2 className="h-4 w-4" />}
          action={
            <Badge className="border-slate-200 bg-slate-50 text-slate-500 dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-400">
              {thresholds.data?.canEdit ? "Editable · CIST / Dirección" : "Solo lectura"}
            </Badge>
          }
        />
        <div className="p-5">
          {thresholds.loading && !thresholds.data ? (
            <div className="grid gap-4 sm:grid-cols-2">
              {Array.from({ length: 4 }).map((_, index) => (
                <Skeleton key={index} className="h-56 w-full" />
              ))}
            </div>
          ) : thresholds.error && !thresholds.data ? (
            <ErrorState message={thresholds.error} onRetry={thresholds.refresh} />
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {thresholds.data?.thresholds.map((threshold) => (
                <ThresholdEditor key={threshold.id} threshold={threshold} canEdit={Boolean(thresholds.data?.canEdit)} onSaved={thresholds.refresh} />
              ))}
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}

function ThresholdEditor({ threshold, canEdit, onSaved }: { threshold: ThresholdItem; canEdit: boolean; onSaved: () => void }) {
  const [values, setValues] = useState({
    maxAmps: threshold.maxAmps,
    minVoltage: threshold.minVoltage,
    maxVoltage: threshold.maxVoltage,
    nightMaxKw: threshold.nightMaxKw
  });
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    try {
      await apiFetch("/api/thresholds", {
        method: "PUT",
        body: JSON.stringify({ zoneId: threshold.zoneId, ...values })
      });
      toast.success(`Umbrales actualizados para ${threshold.zoneName}.`);
      onSaved();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No se pudieron guardar los umbrales.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50/40 p-4 dark:border-white/[0.07] dark:bg-white/[0.02]">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: threshold.zoneColor }} />
          <div>
            <p className="text-[11.5px] font-semibold text-slate-800 dark:text-slate-100">{threshold.zoneName}</p>
            <p className="font-mono text-[9px] text-slate-400">{threshold.zoneCode} · SCT-013</p>
          </div>
        </div>
        <span className="text-[9px] text-slate-400">Act. {formatDateTime(threshold.updatedAt)}</span>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label text-[9.5px]">Máx. corriente (A)</label>
          <input
            type="number"
            step="0.5"
            disabled={!canEdit}
            value={values.maxAmps}
            onChange={(event) => setValues({ ...values, maxAmps: Number(event.target.value) })}
            className="input h-9 text-xs"
          />
        </div>
        <div>
          <label className="label text-[9.5px]">Máx. nocturno (kW)</label>
          <input
            type="number"
            step="0.01"
            disabled={!canEdit}
            value={values.nightMaxKw}
            onChange={(event) => setValues({ ...values, nightMaxKw: Number(event.target.value) })}
            className="input h-9 text-xs"
          />
        </div>
        <div>
          <label className="label text-[9.5px]">Tensión mínima (V)</label>
          <input
            type="number"
            step="1"
            disabled={!canEdit}
            value={values.minVoltage}
            onChange={(event) => setValues({ ...values, minVoltage: Number(event.target.value) })}
            className="input h-9 text-xs"
          />
        </div>
        <div>
          <label className="label text-[9.5px]">Tensión máxima (V)</label>
          <input
            type="number"
            step="1"
            disabled={!canEdit}
            value={values.maxVoltage}
            onChange={(event) => setValues({ ...values, maxVoltage: Number(event.target.value) })}
            className="input h-9 text-xs"
          />
        </div>
      </div>
      <div className="mt-3.5 flex items-center justify-between">
        <p className="text-[9px] text-slate-400">Los cambios aplican a la próxima trama.</p>
        <Button size="sm" onClick={save} disabled={!canEdit} loading={saving}>
          {!saving ? <Save className="h-3 w-3" /> : null} Guardar
        </Button>
      </div>
    </div>
  );
}
