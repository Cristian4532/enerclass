"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { CalendarDays, Check, Copy, Cpu, Download, FileCode2, History, Pause, Play, Radio, RefreshCcw, Send, Terminal, Wifi, X, Zap } from "lucide-react";
import { toast } from "sonner";
import { useApiData } from "@/hooks/use-api-data";
import { useSimulator } from "@/components/simulator-provider";
import { Badge, Button, Card, CardHeader, ErrorState, Modal, PageHeader, Progress, Skeleton } from "@/components/ui";
import { Pagination } from "@/components/pagination";
import { NetworkBanner } from "@/components/network-banner";
import { FIRMWARE_CPP, TELEMETRY_EXAMPLE } from "@/lib/firmware";
import { ZONE_THEME } from "@/lib/constants";
import type { IotStatusData, ReadingHistoryData } from "@/lib/types";
import { cn, formatDateTime, formatNumber, formatTime, timeAgo } from "@/lib/utils";
import { Icon } from "@/components/icon";

const HISTORY_PAGE_SIZE = 10;

export default function IotDevicesPage() {
  const { running, sentCount, sendOnce } = useSimulator();
  const { data, loading, error, refresh, refreshing } = useApiData<IotStatusData>("/api/iot/status", {
    interval: running ? 3000 : 15000
  });
  const [historyPage, setHistoryPage] = useState(1);
  const [historyZone, setHistoryZone] = useState("TODAS");
  const [historyFrom, setHistoryFrom] = useState("");
  const [historyTo, setHistoryTo] = useState("");

  const historyQuery = new URLSearchParams();
  if (historyZone !== "TODAS") historyQuery.set("zone", historyZone);
  if (historyFrom) historyQuery.set("from", historyFrom);
  if (historyTo) historyQuery.set("to", historyTo);
  historyQuery.set("page", String(historyPage));
  historyQuery.set("pageSize", String(HISTORY_PAGE_SIZE));

  const history = useApiData<ReadingHistoryData>(`/api/iot/history?${historyQuery.toString()}`, {
    interval: 30000
  });

  useEffect(() => {
    if (history.data && historyPage > history.data.totalPages) setHistoryPage(history.data.totalPages);
  }, [history.data, historyPage]);

  const [paused, setPaused] = useState(false);
  const [firmwareOpen, setFirmwareOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [sending, setSending] = useState(false);
  const [hiddenBefore, setHiddenBefore] = useState<number>(Number.MAX_SAFE_INTEGER);
  const consoleRef = useRef<HTMLDivElement>(null);
  const [frozen, setFrozen] = useState<IotStatusData["recent"]>([]);

  useEffect(() => {
    if (!data) return;
    if (!paused) setFrozen(data.recent);
  }, [data, paused]);

  const messages = useMemo(() => {
    return [...frozen]
      .filter((item) => item.id < hiddenBefore)
      .reverse();
  }, [frozen, hiddenBefore]);

  useEffect(() => {
    if (paused) return;
    const element = consoleRef.current;
    if (element) element.scrollTop = element.scrollHeight;
  }, [messages.length, paused]);

  async function copyFirmware() {
    try {
      await navigator.clipboard.writeText(FIRMWARE_CPP);
      setCopied(true);
      toast.success("Código del firmware copiado al portapapeles.");
      setTimeout(() => setCopied(false), 2500);
    } catch {
      toast.error("No se pudo copiar el código. Selecciónelo manualmente.");
    }
  }

  function downloadFirmware() {
    const blob = new Blob([FIRMWARE_CPP], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "EnerClass_ESP32_LeoncioPrado.ino";
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    toast.success("Firmware descargado. Ábralo con Arduino IDE o PlatformIO.");
  }

  async function copyText(value: string, message: string) {
    try {
      await navigator.clipboard.writeText(value);
      toast.success(message);
    } catch {
      toast.error("No se pudo copiar.");
    }
  }

  async function sendTest() {
    setSending(true);
    try {
      await sendOnce();
      toast.success("Trama de prueba enviada para las 4 zonas.");
      await refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No se pudo enviar la trama.");
    } finally {
      setSending(false);
    }
  }

  if (loading && !data) return <IotSkeleton />;
  if (error && !data) return <ErrorState message={error} onRetry={refresh} />;
  if (!data) return <IotSkeleton />;

  const onlineSensors = data.zones.filter((zone) => zone.online).length;

  return (
    <div className="animate-fade-up">
      <PageHeader
        eyebrow="Operación · Hardware IoT"
        title="Nodos IoT y sensores SCT-013"
        description="Supervisión del concentrador ESP32-LP-01, los cuatro sensores de corriente no invasivos y las tramas JSON recibidas por el endpoint de telemetría."
        icon={<Cpu className="h-5 w-5" />}
        actions={
          <>
            <Badge className={cn("h-8 border px-3", data.online ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400" : "border-rose-500/20 bg-rose-500/10 text-rose-600")} dot={data.online ? "bg-emerald-500" : "bg-rose-500"}>
              {data.online ? "Concentrador en línea" : "Concentrador sin conexión"}
            </Badge>
            <Button variant="secondary" size="sm" onClick={sendTest} loading={sending}>
              {!sending ? <Send className="h-3.5 w-3.5" /> : null} Enviar trama
            </Button>
            <Button size="sm" onClick={() => setFirmwareOpen(true)}>
              <FileCode2 className="h-3.5 w-3.5" /> Ver firmware C++
            </Button>
          </>
        }
      />

      <NetworkBanner />

      <Card className="relative overflow-hidden border-0 bg-[#07101d] text-white">
        <div className="absolute inset-0 bg-grid-dark opacity-50" />
        <div className="absolute -right-20 -top-24 h-64 w-64 rounded-full bg-brand-500/15 blur-3xl" />
        <div className="relative grid gap-6 p-5 sm:p-6 lg:grid-cols-[1.2fr_2fr]">
          <div className="flex items-start gap-4">
            <div className="relative flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.05]">
              <Cpu className="h-7 w-7 text-brand-400" />
              <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full border-2 border-[#07101d] bg-emerald-500">
                <span className="h-1.5 w-1.5 animate-ping rounded-full bg-white/60" />
              </span>
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500">Concentrador principal</p>
              <h2 className="mt-1 text-xl font-bold tracking-tight text-white">{data.deviceId}</h2>
              <p className="mt-1 text-[11px] text-slate-400">ESP32 DevKit V1 · Firmware {data.firmwareVersion} · 4 canales ADC</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Badge className="border-emerald-500/20 bg-emerald-500/10 text-emerald-300" dot="bg-emerald-400">
                  {onlineSensors}/4 sensores activos
                </Badge>
                <Badge className={cn("border", running ? "border-brand-500/20 bg-brand-500/10 text-brand-300" : "border-white/10 bg-white/5 text-slate-300")} dot={running ? "bg-brand-400 animate-pulse" : "bg-slate-500"}>
                  {running ? "Simulación cada 3 s" : "Sin simulación"}
                </Badge>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              { label: "Wi-Fi", value: `${data.zones[0]?.wifiRssi ?? -58} dBm`, hint: "Señal estable", icon: Wifi },
              { label: "Uptime", value: data.uptimeLabel, hint: "Historial acumulado", icon: Radio },
              { label: "Tramas", value: data.totalReadings.toLocaleString("es-PE"), hint: "Lecturas registradas", icon: Terminal },
              { label: "Tramas simuladas", value: sentCount.toLocaleString("es-PE"), hint: "Esta sesión", icon: Zap }
            ].map((item) => (
              <div key={item.label} className="rounded-xl border border-white/[0.07] bg-white/[0.035] p-3.5">
                <item.icon className="h-3.5 w-3.5 text-brand-400" />
                <p className="mt-2 text-[9px] font-semibold uppercase tracking-wider text-slate-500">{item.label}</p>
                <p className="mt-0.5 truncate text-sm font-bold text-white">{item.value}</p>
                <p className="mt-0.5 text-[9px] text-slate-600">{item.hint}</p>
              </div>
            ))}
          </div>
        </div>
        <div className="relative flex flex-col gap-2 border-t border-white/[0.06] px-5 py-3 text-[10px] text-slate-500 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <span className="inline-flex items-center gap-1.5">
            <Radio className="h-3 w-3 text-brand-400" /> Endpoint: <code className="font-mono text-slate-400">POST /api/iot/telemetry</code>
          </span>
          <span>Última sincronización: {formatDateTime(data.zones[0]?.lastSync)} · {formatTime(data.zones[0]?.lastSync)}</span>
        </div>
      </Card>

      <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {data.zones.map((zone) => {
          const signal = zone.wifiRssi >= -55 ? 4 : zone.wifiRssi >= -65 ? 3 : zone.wifiRssi >= -75 ? 2 : 1;
          return (
            <Card key={zone.id} className="card-hover overflow-hidden">
              <div className="h-1 w-full" style={{ backgroundColor: zone.color }} />
              <div className="p-5">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg" style={{ backgroundColor: `${zone.color}18`, color: zone.color }}>
                      <Icon name={zone.icon} className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-[12px] font-semibold text-slate-900 dark:text-white">{zone.shortName}</p>
                      <p className="font-mono text-[9px] text-slate-400">{zone.code}</p>
                    </div>
                  </div>
                  <Badge className={zone.online ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" : "border-slate-200 bg-slate-100 text-slate-500 dark:border-white/10 dark:bg-white/5 dark:text-slate-400"} dot={zone.online ? "bg-emerald-500" : "bg-slate-400"}>
                    {zone.online ? "Online" : "Offline"}
                  </Badge>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-[9px] font-semibold uppercase tracking-wider text-slate-400">Corriente</p>
                    <p className="mt-0.5 text-xl font-bold tracking-tight text-slate-900 dark:text-white">{formatNumber(zone.currentAmps, 2)}<span className="ml-1 text-[10px] font-medium text-slate-400">A</span></p>
                  </div>
                  <div>
                    <p className="text-[9px] font-semibold uppercase tracking-wider text-slate-400">Potencia</p>
                    <p className="mt-0.5 text-xl font-bold tracking-tight text-slate-900 dark:text-white">{formatNumber(zone.currentKw, 2)}<span className="ml-1 text-[10px] font-medium text-slate-400">kW</span></p>
                  </div>
                </div>

                <div className="mt-3.5 grid grid-cols-2 gap-x-3 gap-y-2 border-t border-slate-100 pt-3 text-[9.5px] dark:border-white/[0.06]">
                  <div className="flex justify-between gap-1">
                    <span className="text-slate-400">Tensión</span>
                    <span className="font-semibold text-slate-600 dark:text-slate-300">{formatNumber(zone.voltageVolts, 1)} V</span>
                  </div>
                  <div className="flex justify-between gap-1">
                    <span className="text-slate-400">Offset DC</span>
                    <span className="font-semibold text-slate-600 dark:text-slate-300">{formatNumber(zone.offsetVoltage, 2)} V</span>
                  </div>
                  <div className="flex justify-between gap-1">
                    <span className="text-slate-400">Calibración</span>
                    <span className="font-semibold text-slate-600 dark:text-slate-300">×{zone.calibration.toFixed(2)}</span>
                  </div>
                  <div className="flex items-end justify-end gap-1">
                    <span className="text-slate-400">RSSI</span>
                    <span className="font-semibold text-slate-600 dark:text-slate-300">{zone.wifiRssi} dBm</span>
                    <div className="flex h-3 items-end gap-0.5">
                      {[1, 2, 3, 4].map((bar) => (
                        <span key={bar} className={cn("w-0.5 rounded-sm", bar <= signal ? "bg-emerald-500" : "bg-slate-200 dark:bg-white/10")} style={{ height: `${bar * 2.5 + 2}px` }} />
                      ))}
                    </div>
                  </div>
                </div>

                <div className="mt-3 border-t border-slate-100 pt-2.5 dark:border-white/[0.06]">
                  <div className="flex items-center justify-between text-[9px] text-slate-400">
                    <span>{zone.sensorModel}</span>
                    <span>{timeAgo(zone.lastReadingAt)}</span>
                  </div>
                  <Progress value={Math.min(100, (zone.currentAmps / 40) * 100)} className="mt-2 h-1" barClassName={zone.currentAmps > 30 ? "bg-rose-500" : "bg-emerald-500"} />
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-3">
        <Card className="overflow-hidden xl:col-span-2">
          <CardHeader
            title="Consola JSON en vivo"
            description="Últimas tramas recibidas por POST /api/iot/telemetry"
            icon={<Terminal className="h-4 w-4" />}
            action={
              <div className="flex items-center gap-2">
                <Badge className={cn("border", !paused ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" : "border-amber-500/20 bg-amber-500/10 text-amber-600 dark:text-amber-400")} dot={!paused ? "bg-emerald-500 animate-pulse" : "bg-amber-500"}>
                  {!paused ? "EN VIVO" : "EN PAUSA"}
                </Badge>
                <Button variant="ghost" size="sm" onClick={() => setPaused((value) => !value)}>
                  {paused ? <Play className="h-3 w-3" /> : <Pause className="h-3 w-3" />} {paused ? "Reanudar" : "Pausar"}
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setHiddenBefore(Math.min(...frozen.map((item) => item.id)))}>
                  Limpiar
                </Button>
              </div>
            }
          />
          <div className="bg-[#050a12]">
            <div className="flex items-center gap-2 border-b border-white/[0.06] px-4 py-2.5">
              <span className="h-2.5 w-2.5 rounded-full bg-rose-500/80" />
              <span className="h-2.5 w-2.5 rounded-full bg-amber-500/80" />
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-500/80" />
              <span className="ml-2 font-mono text-[9.5px] text-slate-500">enerclass@esp32-lp-01:~$ tail -f telemetry.log</span>
              <span className="ml-auto hidden font-mono text-[9px] text-slate-600 sm:block">{messages.length} tramas</span>
            </div>
            <div ref={consoleRef} className="scrollbar-thin h-[400px] overflow-y-auto p-3 font-mono text-[10.5px] sm:p-4">
              {messages.length ? (
                messages.map((message) => (
                  <div key={message.id} className="mb-3 border-b border-white/[0.04] pb-3 last:border-0">
                    <div className="flex flex-wrap items-center gap-2 text-[9px] text-slate-500">
                      <span className="text-emerald-400">●</span>
                      <span>{formatTime(message.receivedAt)}</span>
                      <span className="rounded bg-emerald-500/10 px-1.5 py-0.5 text-emerald-400">200 OK</span>
                      <span className="rounded px-1.5 py-0.5" style={{ backgroundColor: `${message.color}18`, color: message.color }}>{message.zoneCode}</span>
                      <span className="text-slate-600">POST /api/iot/telemetry</span>
                      <span className="ml-auto text-slate-600">{message.payload.source === "live" ? "live" : "seed"}</span>
                    </div>
                    <pre className="mt-1.5 whitespace-pre-wrap break-all text-[10px] leading-[1.65] text-slate-300">{JSON.stringify(message.payload, null, 2)}</pre>
                  </div>
                ))
              ) : (
                <div className="flex h-full flex-col items-center justify-center text-center">
                  <Terminal className="h-8 w-8 text-slate-700" />
                  <p className="mt-2 text-[11px] text-slate-500">Esperando tramas del concentrador ESP32-LP-01…</p>
                  <p className="mt-1 text-[9.5px] text-slate-600">Active el simulador IoT en la barra superior para ver telemetría.</p>
                </div>
              )}
            </div>
            <div className="flex items-center justify-between border-t border-white/[0.06] px-4 py-2 font-mono text-[9px] text-slate-600">
              <span className="inline-flex items-center gap-1.5"><Wifi className="h-3 w-3 text-emerald-500" /> 115200 baud · JSON / UTF-8</span>
              <span>{running ? "streaming…" : "idle"}</span>
            </div>
          </div>
        </Card>

        <div className="space-y-5">
          <Card>
            <CardHeader title="Contrato de la API" description="Endpoint público para el firmware ESP32" icon={<FileCode2 className="h-4 w-4" />} />
            <div className="p-5">
              <div className="rounded-lg bg-slate-50 p-3 dark:bg-white/[0.03]">
                <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Método</p>
                <p className="mt-1 font-mono text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">POST /api/iot/telemetry</p>
              </div>
              <div className="mt-4 space-y-2 text-[10.5px]">
                {[
                  ["deviceId", "ESP32-LP-01"],
                  ["zone", "COMPUTO | TALLERES | ..."],
                  ["currentAmps", "number (A)"],
                  ["voltageVolts", "number (V)"],
                  ["powerKw", "number (kW)"],
                  ["powerFactor", "0.0 – 1.0"],
                  ["tariffSoles", "S/ por kWh"]
                ].map(([field, desc]) => (
                  <div key={field} className="flex items-center justify-between gap-3 border-b border-slate-100 pb-1.5 last:border-0 dark:border-white/[0.05]">
                    <code className="font-mono text-[10px] text-slate-700 dark:text-slate-300">{field}</code>
                    <span className="text-right text-[9.5px] text-slate-400">{desc}</span>
                  </div>
                ))}
              </div>
              <div className="mt-4 rounded-lg border border-slate-200 bg-white dark:border-white/10 dark:bg-[#081322]">
                <div className="flex items-center justify-between border-b border-slate-100 px-3 py-2 dark:border-white/[0.06]">
                  <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400">cURL de prueba</span>
                  <button onClick={() => void copyText(TELEMETRY_EXAMPLE, "Comando cURL copiado.")} className="text-slate-400 hover:text-brand-500">
                    <Copy className="h-3 w-3" />
                  </button>
                </div>
                <pre className="scrollbar-thin max-h-40 overflow-auto p-3 font-mono text-[9px] leading-relaxed text-slate-500 dark:text-slate-400">{TELEMETRY_EXAMPLE}</pre>
              </div>
              <Button variant="secondary" size="sm" className="mt-4 w-full" onClick={sendTest} loading={sending}>
                <Send className="h-3 w-3" /> Enviar trama de prueba
              </Button>
            </div>
          </Card>

          <Card className="border-amber-500/20 bg-gradient-to-br from-amber-50 to-white dark:from-amber-500/[0.06] dark:to-[#0b1626]">
            <div className="p-5">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-500/15 text-amber-600 dark:text-amber-400">
                <Wifi className="h-4 w-4" />
              </div>
              <p className="mt-3 text-[12px] font-semibold text-slate-900 dark:text-white">Diagnóstico de señal y calibración</p>
              <p className="mt-1.5 text-[10.5px] leading-relaxed text-slate-500 dark:text-slate-400">
                Los cuatro sensores reportan offset de 1.65 V DC. La señal Wi-Fi se mantiene entre -52 y -64 dBm, dentro del rango operativo recomendado. El factor de calibración se ajusta por canal para compensar tolerancias del burden de 33 Ω.
              </p>
              <div className="mt-3 flex flex-wrap gap-1.5">
                <Badge className="border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">ADC 12 bits</Badge>
                <Badge className="border-slate-200 bg-slate-50 text-slate-500 dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-400">SCT-013 100A/50mA</Badge>
                <Badge className="border-slate-200 bg-slate-50 text-slate-500 dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-400">Burden 33 Ω</Badge>
              </div>
            </div>
          </Card>
        </div>
      </div>

      <Card className="mt-5 overflow-hidden">
        <CardHeader
          title="Historial de lecturas"
          description="Telemetría paginada de los 4 tableros · 10 registros por página"
          icon={<History className="h-4 w-4" />}
          action={
            <div className="flex items-center gap-2">
              <Badge className="border-slate-200 bg-slate-50 text-slate-500 dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-400">
                {history.data?.total ?? 0} lecturas
              </Badge>
              <Button variant="ghost" size="sm" onClick={history.refresh} disabled={history.refreshing}>
                <RefreshCcw className={cn("h-3 w-3", history.refreshing && "animate-spin")} /> Actualizar
              </Button>
            </div>
          }
        />
        <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 px-4 py-3 dark:border-white/[0.06] sm:px-5">
          <select
            value={historyZone}
            onChange={(event) => {
              setHistoryZone(event.target.value);
              setHistoryPage(1);
            }}
            className="input h-8 w-auto px-2.5 text-[10.5px]"
            aria-label="Filtrar historial por zona"
          >
            <option value="TODAS">Todas las zonas</option>
            {history.data?.zones.map((item) => (
              <option key={item.code} value={item.code}>{item.shortName}</option>
            ))}
          </select>
          <label className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2 py-1 dark:border-white/10 dark:bg-white/[0.03]">
            <CalendarDays className="h-3.5 w-3.5 text-slate-400" />
            <input
              type="date"
              value={historyFrom}
              onChange={(event) => {
                setHistoryFrom(event.target.value);
                setHistoryPage(1);
              }}
              className="w-[112px] bg-transparent text-[10px] text-slate-600 outline-none dark:text-slate-300"
              aria-label="Historial desde"
            />
          </label>
          <span className="text-[10px] text-slate-400">a</span>
          <input
            type="date"
            value={historyTo}
            onChange={(event) => {
              setHistoryTo(event.target.value);
              setHistoryPage(1);
            }}
            className="input h-8 w-[128px] px-2 text-[10px]"
            aria-label="Historial hasta"
          />
          {historyZone !== "TODAS" || historyFrom || historyTo ? (
            <button
              onClick={() => {
                setHistoryZone("TODAS");
                setHistoryFrom("");
                setHistoryTo("");
                setHistoryPage(1);
              }}
              className="inline-flex h-8 items-center gap-1 rounded-md px-2 text-[10px] font-semibold text-slate-500 transition hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-white/[0.05]"
            >
              <X className="h-3 w-3" /> Limpiar
            </button>
          ) : null}
          <span className="ml-auto text-[10px] text-slate-400">
            Página {history.data?.page ?? 1} de {history.data?.totalPages ?? 1}
          </span>
        </div>
        <div className="table-wrap">
          <table className="table-base min-w-[820px]">
            <thead>
              <tr>
                <th className="th">Fecha y hora</th>
                <th className="th">Zona</th>
                <th className="th text-right">Corriente</th>
                <th className="th text-right">Tensión</th>
                <th className="th text-right">Potencia</th>
                <th className="th text-right">Energía</th>
                <th className="th">Fuente</th>
              </tr>
            </thead>
            <tbody>
              {history.data?.readings.map((reading) => (
                <tr key={reading.id} className="transition hover:bg-slate-50/70 dark:hover:bg-white/[0.02]">
                  <td className="td font-mono text-[10.5px] text-slate-500 dark:text-slate-400">{formatDateTime(reading.recordedAt)}</td>
                  <td className="td">
                    <span className="flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full" style={{ backgroundColor: reading.zoneColor }} />
                      <span className="text-[11px] font-semibold text-slate-700 dark:text-slate-200">{reading.zoneName}</span>
                    </span>
                  </td>
                  <td className="td text-right font-mono text-[10.5px]">{formatNumber(reading.currentAmps, 2)} A</td>
                  <td className="td text-right font-mono text-[10.5px]">{formatNumber(reading.voltageVolts, 1)} V</td>
                  <td className="td text-right font-mono text-[10.5px]">{formatNumber(reading.powerKw, 2)} kW</td>
                  <td className="td text-right font-mono text-[10.5px]">{formatNumber(reading.energyKwh, 3)} kWh</td>
                  <td className="td">
                    <Badge className={reading.source === "live" ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" : "border-slate-200 bg-slate-50 text-slate-500 dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-400"}>
                      {reading.source === "live" ? "En vivo" : "Histórico"}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {history.loading && !history.data ? (
          <div className="p-5"><Skeleton className="h-40 w-full" /></div>
        ) : !history.data?.readings.length ? (
          <div className="py-12 text-center text-xs text-slate-400">No hay lecturas para los filtros seleccionados.</div>
        ) : null}
        {history.data ? (
          <Pagination
            page={history.data.page}
            totalPages={history.data.totalPages}
            total={history.data.total}
            pageSize={history.data.pageSize}
            onPageChange={setHistoryPage}
            label="lecturas"
          />
        ) : null}
      </Card>

      <Modal
        open={firmwareOpen}
        onClose={() => setFirmwareOpen(false)}
        title="Firmware ESP32-LP-01 — Arduino / PlatformIO"
        description="Código C++ listo para cargar. Cambie WIFI_SSID, WIFI_PASSWORD y API_HOST antes de compilar."
        size="xl"
        footer={
          <>
            <Button variant="secondary" size="sm" onClick={downloadFirmware}>
              <Download className="h-3.5 w-3.5" /> Descargar .ino
            </Button>
            <Button size="sm" onClick={copyFirmware}>
              {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />} {copied ? "Copiado" : "Copiar código"}
            </Button>
          </>
        }
      >
        <div className="mb-3 flex flex-wrap items-center gap-2 rounded-lg border border-brand-500/20 bg-brand-500/[0.06] px-3 py-2 text-[10px] text-slate-500 dark:text-slate-400">
          <Cpu className="h-3.5 w-3.5 text-brand-500" />
          Endpoint configurado:
          <code className="font-mono text-brand-600 dark:text-brand-400">http://IP_DEL_SERVIDOR:3000/api/iot/telemetry</code>
          <span className="ml-auto hidden sm:inline">4 canales ADC1 · Wi-Fi + HTTPClient</span>
        </div>
        <pre className="scrollbar-thin max-h-[55vh] overflow-auto rounded-xl border border-white/10 bg-[#050a12] p-4 font-mono text-[10.5px] leading-[1.65] text-slate-300">{FIRMWARE_CPP}</pre>
      </Modal>
    </div>
  );
}

function IotSkeleton() {
  return (
    <div>
      <Skeleton className="h-8 w-72" />
      <Skeleton className="mt-2 h-3 w-[500px] max-w-full" />
      <Skeleton className="mt-6 h-44 w-full" />
      <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => <Skeleton key={index} className="h-64 w-full" />)}
      </div>
    </div>
  );
}
