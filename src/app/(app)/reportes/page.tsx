"use client";

import { useState } from "react";
import { AlertCircle, Building2, CalendarDays, Check, CheckCircle2, Crown, Download, FileCheck2, FileText, Landmark, Loader2, ShieldCheck, Sparkles, Wrench } from "lucide-react";
import type { jsPDF as JsPdf } from "jspdf";
import { toast } from "sonner";
import { Badge, Button, Card, CardHeader, PageHeader } from "@/components/ui";
import { REPORT_TYPES, type ReportType } from "@/lib/constants";
import { apiFetch } from "@/lib/client";
import type { ReportData } from "@/lib/types";
import { cn, formatDate, formatKwh, formatNumber, formatSoles, formatDateTime } from "@/lib/utils";

const ZONES = [
  { code: "COMPUTO", name: "Laboratorio de Cómputo e Innovación", color: "#06b6d4" },
  { code: "TALLERES", name: "Talleres de Formación Técnica", color: "#f59e0b" },
  { code: "ALUMBRADO", name: "Alumbrado General y Perimétrico", color: "#8b5cf6" },
  { code: "ADMINISTRACION", name: "Áreas Administrativas y Dirección", color: "#10b981" }
] as const;

const TYPE_ICONS: Record<ReportType, React.ElementType> = {
  ejecutivo: Crown,
  costos: Landmark,
  tecnico: Wrench
};

function isoLima(date: Date) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Lima",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(date);
}

export default function ReportsPage() {
  const today = new Date();
  const [from, setFrom] = useState(isoLima(new Date(today.getTime() - 29 * 24 * 60 * 60 * 1000)));
  const [to, setTo] = useState(isoLima(today));
  const [selectedZones, setSelectedZones] = useState<string[]>(ZONES.map((zone) => zone.code));
  const [type, setType] = useState<ReportType>("ejecutivo");
  const [includeAlerts, setIncludeAlerts] = useState(true);
  const [includeRecommendations, setIncludeRecommendations] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastReport, setLastReport] = useState<ReportData | null>(null);
  const [lastFilename, setLastFilename] = useState("");

  const minDate = isoLima(new Date(today.getTime() - 90 * 24 * 60 * 60 * 1000));

  function toggleZone(code: string) {
    setSelectedZones((current) => (current.includes(code) ? current.filter((item) => item !== code) : [...current, code]));
  }

  async function generate() {
    setError(null);
    if (!selectedZones.length) {
      setError("Seleccione al menos una zona para incluir en el reporte.");
      return;
    }
    if (new Date(`${from}T00:00:00`) >= new Date(`${to}T23:59:59`)) {
      setError("La fecha inicial debe ser anterior a la fecha final.");
      return;
    }
    setGenerating(true);
    try {
      const params = new URLSearchParams({
        from,
        to,
        type,
        zones: selectedZones.join(",")
      });
      const report = await apiFetch<ReportData>(`/api/report?${params.toString()}`);
      const filename = await buildPdf(report, { includeAlerts, includeRecommendations });
      setLastReport(report);
      setLastFilename(filename);
      toast.success("Reporte PDF generado y descargado correctamente.");
    } catch (err) {
      const message = err instanceof Error ? err.message : "No se pudo generar el reporte.";
      setError(message);
      toast.error(message);
    } finally {
      setGenerating(false);
    }
  }

  async function regenerate() {
    if (!lastReport) return;
    await buildPdf(lastReport, { includeAlerts, includeRecommendations });
    toast.success("Copia del reporte descargada.");
  }

  return (
    <div className="animate-fade-up">
      <PageHeader
        eyebrow="Documentación institucional"
        title="Generador de reportes ejecutivos PDF"
        description="Seleccione el periodo, las zonas y el enfoque del informe. EnerClass construye un documento profesional con indicadores, consumos en kWh y Soles, alertas y recomendaciones."
        icon={<FileText className="h-5 w-5" />}
        actions={
          <>
            <Badge className="h-8 border-brand-500/20 bg-brand-500/10 px-3 text-brand-700 dark:text-brand-400" dot="bg-brand-500">
              PDF profesional
            </Badge>
            <Badge className="h-8 border-slate-200 bg-white px-3 text-slate-500 dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-400">
              <ShieldCheck className="h-3 w-3" /> Datos institucionales
            </Badge>
          </>
        }
      />

      <div className="grid gap-5 xl:grid-cols-3">
        <div className="space-y-5 xl:col-span-2">
          <Card>
            <CardHeader
              title="Configuración del reporte"
              description="Los campos marcados se utilizan para construir el documento PDF"
              icon={<FileText className="h-4 w-4" />}
              action={<span className="text-[10px] text-slate-400">Periodo máximo: 90 días</span>}
            />
            <div className="space-y-6 p-5 sm:p-6">
              <section>
                <div className="mb-3 flex items-center gap-2">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-brand-500/10 text-[9px] font-bold text-brand-600 dark:text-brand-400">1</span>
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300">Rango de fechas</p>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="label">Fecha inicial</label>
                    <div className="relative">
                      <CalendarDays className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                      <input type="date" value={from} min={minDate} max={to} onChange={(event) => setFrom(event.target.value)} className="input pl-10" />
                    </div>
                  </div>
                  <div>
                    <label className="label">Fecha final</label>
                    <div className="relative">
                      <CalendarDays className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                      <input type="date" value={to} min={from} max={isoLima(today)} onChange={(event) => setTo(event.target.value)} className="input pl-10" />
                    </div>
                  </div>
                </div>
              </section>

              <section>
                <div className="mb-3 flex items-center gap-2">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-brand-500/10 text-[9px] font-bold text-brand-600 dark:text-brand-400">2</span>
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300">Zonas a incluir</p>
                  <span className="ml-auto text-[9.5px] text-slate-400">{selectedZones.length} de 4 seleccionadas</span>
                </div>
                <div className="grid gap-2 sm:grid-cols-2">
                  {ZONES.map((zone) => {
                    const active = selectedZones.includes(zone.code);
                    return (
                      <button
                        type="button"
                        key={zone.code}
                        onClick={() => toggleZone(zone.code)}
                        className={cn(
                          "flex items-center gap-3 rounded-xl border p-3 text-left transition",
                          active
                            ? "border-brand-500/40 bg-brand-500/[0.06] shadow-sm"
                            : "border-slate-200 bg-white hover:border-slate-300 dark:border-white/[0.08] dark:bg-white/[0.02]"
                        )}
                      >
                        <span className={cn("flex h-4 w-4 items-center justify-center rounded border", active ? "border-brand-500 bg-brand-500 text-white" : "border-slate-300 dark:border-white/20")}>
                          {active ? <Check className="h-3 w-3" /> : null}
                        </span>
                        <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: zone.color }} />
                        <span className="min-w-0 flex-1 truncate text-[11px] font-medium text-slate-700 dark:text-slate-200">{zone.name}</span>
                      </button>
                    );
                  })}
                </div>
              </section>

              <section>
                <div className="mb-3 flex items-center gap-2">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-brand-500/10 text-[9px] font-bold text-brand-600 dark:text-brand-400">3</span>
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300">Tipo de reporte</p>
                </div>
                <div className="grid gap-3">
                  {(Object.keys(REPORT_TYPES) as ReportType[]).map((key) => {
                    const meta = REPORT_TYPES[key];
                    const Icon = TYPE_ICONS[key];
                    const active = type === key;
                    return (
                      <label
                        key={key}
                        className={cn(
                          "flex cursor-pointer items-start gap-3 rounded-xl border p-3.5 transition",
                          active ? "border-brand-500/40 bg-brand-500/[0.05] shadow-sm" : "border-slate-200 hover:border-slate-300 dark:border-white/[0.08]"
                        )}
                      >
                        <input type="radio" name="report-type" value={key} checked={active} onChange={() => setType(key)} className="mt-1 h-3.5 w-3.5 accent-emerald-600" />
                        <span className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-lg", active ? "bg-brand-500/15 text-brand-600 dark:text-brand-400" : "bg-slate-100 text-slate-500 dark:bg-white/[0.05] dark:text-slate-400")}>
                          <Icon className="h-4 w-4" />
                        </span>
                        <span>
                          <span className="block text-[12px] font-semibold text-slate-800 dark:text-slate-100">{meta.label}</span>
                          <span className="mt-0.5 block text-[10.5px] leading-relaxed text-slate-500 dark:text-slate-400">{meta.description}</span>
                        </span>
                      </label>
                    );
                  })}
                </div>
              </section>

              <section>
                <p className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300">Contenido adicional</p>
                <div className="grid gap-2 sm:grid-cols-2">
                  <label className="flex cursor-pointer items-center gap-2.5 rounded-lg border border-slate-200 p-3 text-[11px] text-slate-600 dark:border-white/[0.08] dark:text-slate-300">
                    <input type="checkbox" checked={includeAlerts} onChange={(event) => setIncludeAlerts(event.target.checked)} className="h-3.5 w-3.5 accent-emerald-600" />
                    Historial de alertas del periodo
                  </label>
                  <label className="flex cursor-pointer items-center gap-2.5 rounded-lg border border-slate-200 p-3 text-[11px] text-slate-600 dark:border-white/[0.08] dark:text-slate-300">
                    <input type="checkbox" checked={includeRecommendations} onChange={(event) => setIncludeRecommendations(event.target.checked)} className="h-3.5 w-3.5 accent-emerald-600" />
                    Recomendaciones automáticas
                  </label>
                </div>
              </section>

              {error ? (
                <div className="flex items-start gap-2 rounded-xl border border-rose-500/20 bg-rose-500/[0.06] px-3.5 py-2.5 text-[11px] font-medium text-rose-600 dark:text-rose-400">
                  <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" /> {error}
                </div>
              ) : null}

              <div className="flex flex-col gap-3 border-t border-slate-100 pt-5 dark:border-white/[0.06] sm:flex-row sm:items-center sm:justify-between">
                <div className="text-[10px] leading-relaxed text-slate-400">
                  <p className="font-semibold text-slate-600 dark:text-slate-300">I.E. N° 2001 «Leoncio Prado» · Rímac, Lima</p>
                  <p>Sistema EnerClass · Reporte generado con datos de sensores SCT-013</p>
                </div>
                <Button onClick={generate} loading={generating} size="lg" className="shrink-0">
                  {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                  {generating ? "Construyendo PDF…" : "Generar y descargar PDF"}
                </Button>
              </div>
            </div>
          </Card>

          {lastReport ? (
            <Card>
              <CardHeader
                title="Último reporte generado"
                description={`${lastReport.meta.typeLabel} · ${lastReport.meta.rangeLabel}`}
                icon={<FileCheck2 className="h-4 w-4" />}
                action={
                  <Button variant="secondary" size="sm" onClick={() => void regenerate()}>
                    <Download className="h-3.5 w-3.5" /> Descargar nuevamente
                  </Button>
                }
              />
              <div className="grid gap-4 p-5 sm:grid-cols-4">
                <div>
                  <p className="text-[9px] font-semibold uppercase tracking-wider text-slate-400">Consumo</p>
                  <p className="mt-1 text-sm font-bold text-slate-900 dark:text-white">{formatKwh(lastReport.kpis.totalKwh, 0)}</p>
                </div>
                <div>
                  <p className="text-[9px] font-semibold uppercase tracking-wider text-slate-400">Costo estimado</p>
                  <p className="mt-1 text-sm font-bold text-slate-900 dark:text-white">{formatSoles(lastReport.kpis.totalSoles)}</p>
                </div>
                <div>
                  <p className="text-[9px] font-semibold uppercase tracking-wider text-slate-400">Ahorro</p>
                  <p className="mt-1 text-sm font-bold text-brand-600 dark:text-brand-400">{formatSoles(lastReport.kpis.savingsSoles)}</p>
                </div>
                <div>
                  <p className="text-[9px] font-semibold uppercase tracking-wider text-slate-400">Archivo</p>
                  <p className="mt-1 truncate font-mono text-[9.5px] text-slate-500 dark:text-slate-400">{lastFilename}</p>
                </div>
              </div>
            </Card>
          ) : null}
        </div>

        <div className="space-y-5">
          <Card className="overflow-hidden border-0 bg-[#07101d] text-white">
            <div className="relative p-5">
              <div className="absolute inset-0 bg-grid-dark opacity-50" />
              <div className="relative">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-500/20">
                    <Building2 className="h-4 w-4 text-brand-300" />
                  </div>
                  <div>
                    <p className="text-[11px] font-bold">I.E. N° 2001 «Leoncio Prado»</p>
                    <p className="text-[9px] text-slate-500">Rímac, Lima — Perú · UGEL 02</p>
                  </div>
                </div>
                <div className="mt-5">
                  <p className="text-[9px] font-bold uppercase tracking-[0.16em] text-brand-300">Documento institucional</p>
                  <h3 className="mt-1 text-lg font-bold leading-snug">{REPORT_TYPES[type].label}</h3>
                  <p className="mt-1.5 text-[10px] leading-relaxed text-slate-400">Encabezado oficial, indicadores de gestión, consumo por tablero y recomendaciones para la toma de decisiones.</p>
                </div>
                <div className="mt-5 space-y-2.5 border-t border-white/[0.07] pt-4 text-[10px]">
                  {[
                    "Resumen ejecutivo del periodo",
                    "KPI energéticos y económicos",
                    "Consumo por tablero en kWh y S/",
                    "Historial de alertas registradas",
                    "Recomendaciones automáticas"
                  ].map((item) => (
                    <div key={item} className="flex items-center gap-2 text-slate-300">
                      <CheckCircle2 className="h-3 w-3 shrink-0 text-brand-400" /> {item}
                    </div>
                  ))}
                </div>
                <div className="mt-5 flex items-center gap-2 rounded-lg bg-white/[0.04] px-3 py-2 text-[9px] text-slate-400">
                  <ShieldCheck className="h-3.5 w-3.5 text-brand-400" />
                  Formato A4 · Diseño institucional EnerClass
                </div>
              </div>
            </div>
          </Card>

          <Card className="card-pad">
            <div className="flex items-center gap-2">
              <Sparkles className="h-3.5 w-3.5 text-brand-500" />
              <p className="text-[11px] font-semibold text-slate-800 dark:text-slate-100">Recomendación de uso</p>
            </div>
            <p className="mt-2 text-[10px] leading-relaxed text-slate-500 dark:text-slate-400">
              Para la reunión mensual de la comisión de eficiencia energética, genere el reporte <strong className="font-semibold text-slate-700 dark:text-slate-200">Ejecutivo para Dirección</strong> con un rango de 30 días. Para conciliar la facturación con la UGEL, use el reporte de <strong className="font-semibold text-slate-700 dark:text-slate-200">Auditoría de Costos</strong>.
            </p>
            <div className="mt-3 rounded-lg bg-slate-50 px-3 py-2.5 text-[9.5px] leading-relaxed text-slate-400 dark:bg-white/[0.03]">
              Los reportes incluyen únicamente las zonas seleccionadas. Los montos en Soles son referenciales e incluyen IGV del 18 %.
            </div>
          </Card>

          {lastReport ? (
            <Card className="card-pad">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Datos del último documento</p>
              <div className="mt-3 space-y-2 text-[10px]">
                <div className="flex justify-between gap-2"><span className="text-slate-400">Generado por</span><span className="text-right font-medium text-slate-700 dark:text-slate-200">{lastReport.meta.generatedBy}</span></div>
                <div className="flex justify-between gap-2"><span className="text-slate-400">Fecha</span><span className="text-right font-medium text-slate-700 dark:text-slate-200">{formatDateTime(lastReport.meta.generatedAt)}</span></div>
                <div className="flex justify-between gap-2"><span className="text-slate-400">Zonas</span><span className="text-right font-medium text-slate-700 dark:text-slate-200">{lastReport.byZone.length}</span></div>
                <div className="flex justify-between gap-2"><span className="text-slate-400">Alertas incluidas</span><span className="text-right font-medium text-slate-700 dark:text-slate-200">{lastReport.kpis.alertCount}</span></div>
              </div>
            </Card>
          ) : null}
        </div>
      </div>
    </div>
  );
}

type PdfDocument = JsPdf & { lastAutoTable?: { finalY: number } };

async function buildPdf(report: ReportData, options: { includeAlerts: boolean; includeRecommendations: boolean }): Promise<string> {
  const [{ jsPDF }, { default: autoTable }] = await Promise.all([import("jspdf"), import("jspdf-autotable")]);

  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4", compress: true }) as PdfDocument;
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 14;
  const contentWidth = pageWidth - margin * 2;
  const BRAND: [number, number, number] = [5, 150, 105];
  const DARK: [number, number, number] = [15, 23, 42];
  const BORDER: [number, number, number] = [226, 232, 240];
  const SLATE: [number, number, number] = [71, 85, 105];
  const MUTED: [number, number, number] = [100, 116, 139];

  const num = (value: number, digits = 1) =>
    value.toLocaleString("en-US", { minimumFractionDigits: digits, maximumFractionDigits: digits });
  const kWh = (value: number, digits = 1) => `${num(value, digits)} kWh`;
  const money = (value: number) => `S/ ${num(value, 2)}`;
  const pct = (value: number) => `${num(value, 1)} %`;
  const severityLabel: Record<string, string> = { CRITICA: "Crítica", ADVERTENCIA: "Advertencia", INFORMATIVA: "Informativa" };
  const statusLabel: Record<string, string> = { PENDIENTE: "Pendiente", EN_REVISION: "En revisión", RESUELTA: "Resuelta" };

  doc.setProperties({
    title: report.meta.title,
    subject: report.meta.typeLabel,
    author: report.meta.generatedBy,
    creator: "EnerClass — I.E. N° 2001 Leoncio Prado",
    keywords: "energía, eficiencia energética, IoT, ESP32, SCT-013"
  });

  entityHeader();
  let y = 46;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(...BRAND);
  doc.text("DOCUMENTO INSTITUCIONAL · ENERCLASS", margin, y);
  y += 6.5;
  doc.setFontSize(17);
  doc.setTextColor(...DARK);
  doc.text(report.meta.title, margin, y);
  y += 6;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9.5);
  doc.setTextColor(...SLATE);
  doc.text(report.meta.rangeLabel, margin, y);
  y += 4.6;
  doc.setFontSize(7.4);
  doc.setTextColor(...MUTED);
  doc.text(`Generado por ${report.meta.generatedBy} · ${report.meta.generatedByPosition}`, margin, y);
  y += 6.5;
  doc.setDrawColor(...BORDER);
  doc.setLineWidth(0.3);
  doc.line(margin, y, pageWidth - margin, y);

  y += 6;
  const gap = 3.5;
  const cardWidth = (contentWidth - gap * 3) / 4;
  const cards: { label: string; value: string; sub: string; color: [number, number, number] }[] = [
    { label: "Consumo total", value: kWh(report.kpis.totalKwh, 1), sub: `${report.meta.days} días analizados`, color: BRAND },
    { label: "Costo estimado", value: money(report.kpis.totalSoles), sub: "Incluye IGV del 18 %", color: [2, 132, 199] },
    { label: "Ahorro económico", value: money(report.kpis.savingsSoles), sub: `${pct(report.kpis.savingsPct)} frente a línea base`, color: [13, 148, 136] },
    { label: "CO2 evitado", value: `${num(report.kpis.co2Avoided, 1)} kg`, sub: "Factor SEIN 0.45 kg/kWh", color: [139, 92, 246] }
  ];
  cards.forEach((card, index) => {
    const x = margin + index * (cardWidth + gap);
    doc.setFillColor(248, 250, 252);
    doc.roundedRect(x, y, cardWidth, 21, 1.5, 1.5, "F");
    doc.setFillColor(...card.color);
    doc.roundedRect(x, y, 1.3, 21, 0.65, 0.65, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(6.3);
    doc.setTextColor(...MUTED);
    doc.text(card.label.toUpperCase(), x + 4, y + 5.4);
    doc.setFontSize(9.6);
    doc.setTextColor(...DARK);
    doc.text(card.value, x + 4, y + 12.1);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(5.9);
    doc.setTextColor(...MUTED);
    doc.text(card.sub, x + 4, y + 17.2);
  });

  y += 27;
  doc.setFillColor(240, 253, 244);
  doc.roundedRect(margin, y, contentWidth, 14, 1.5, 1.5, "F");
  doc.setFont("helvetica", "normal");
  doc.setFontSize(6.9);
  doc.setTextColor(22, 101, 52);
  doc.text(`Demanda promedio: ${num(report.kpis.avgDemandKw, 2)} kW`, margin + 4, y + 5.2);
  doc.text(`Demanda máxima: ${num(report.kpis.peakKw, 2)} kW`, margin + 66, y + 5.2);
  doc.text(`Alertas: ${report.kpis.alertCount} (${report.kpis.criticalAlerts} críticas)`, margin + 128, y + 5.2);
  doc.text(`Consumo por estudiante: ${num(report.kpis.kwhPerStudent, 2)} kWh`, margin + 4, y + 10.3);
  doc.text(`Zonas incluidas: ${report.byZone.length} de 4`, margin + 66, y + 10.3);
  doc.text(`Días analizados: ${report.meta.days}`, margin + 128, y + 10.3);
  y += 20;

  ensureSpace(22);
  sectionHeading("Resumen ejecutivo");
  const summary =
    `Durante el periodo ${report.meta.rangeLabel}, los tableros monitoreados registraron un consumo de ${kWh(report.kpis.totalKwh, 1)}, ` +
    `equivalente a un costo estimado de ${money(report.kpis.totalSoles)} con IGV incluido. Frente a la línea base institucional se evitó el consumo de ` +
    `${kWh(report.kpis.savingsKwh, 1)}, lo que representa un ahorro de ${money(report.kpis.savingsSoles)} (${pct(report.kpis.savingsPct)}) y ` +
    `${num(report.kpis.co2Avoided, 1)} kg de CO₂ dejados de emitir. En el mismo periodo se registraron ${report.kpis.alertCount} alertas, ` +
    `${report.kpis.criticalAlerts} de ellas críticas. El detalle por tablero, el historial de eventos y las recomendaciones se presentan a continuación.`;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.6);
  doc.setTextColor(51, 65, 85);
  const summaryLines = doc.splitTextToSize(summary.replace(/CO₂/g, "CO2"), contentWidth);
  doc.text(summaryLines, margin, y);
  y += summaryLines.length * 4.15 + 7;

  ensureSpace(34);
  sectionHeading("Consumo por zona y tablero");
  autoTable(doc, {
    startY: y - 1,
    margin: { left: margin, right: margin, top: 19, bottom: 22 },
    head: [["Tablero / zona", "Consumo", "Costo (IGV inc.)", "% del total", "Demanda pico", "CO2 evitado"]],
    body: report.byZone.map((zone) => [
      zone.name,
      kWh(zone.kwh, 1),
      money(zone.cost),
      pct(zone.pct),
      `${num(zone.peakKw, 2)} kW`,
      `${num(zone.co2, 1)} kg`
    ]),
    foot: [
      [
        "TOTAL DEL PERIODO",
        kWh(report.kpis.totalKwh, 1),
        money(report.kpis.totalSoles),
        "100.0 %",
        `${num(report.kpis.peakKw, 2)} kW`,
        `${num(report.kpis.co2Avoided, 1)} kg`
      ]
    ],
    theme: "grid",
    styles: {
      font: "helvetica",
      fontSize: 7.7,
      cellPadding: 2.2,
      textColor: [51, 65, 85],
      lineColor: BORDER,
      lineWidth: 0.2,
      overflow: "linebreak"
    },
    headStyles: { fillColor: BRAND, textColor: [255, 255, 255], fontStyle: "bold", fontSize: 7.4 },
    footStyles: { fillColor: [236, 253, 245], textColor: [6, 78, 59], fontStyle: "bold" },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    columnStyles: {
      0: { cellWidth: 62, halign: "left" },
      1: { halign: "right" },
      2: { halign: "right" },
      3: { halign: "right" },
      4: { halign: "right" },
      5: { halign: "right" }
    }
  });
  y = (doc.lastAutoTable?.finalY ?? y) + 9;

  if (options.includeAlerts) {
    ensureSpace(26);
    sectionHeading(`Historial de alertas del periodo (${report.kpis.alertCount})`);
    if (!report.alerts.length) {
      doc.setFont("helvetica", "italic");
      doc.setFontSize(8);
      doc.setTextColor(...MUTED);
      doc.text("No se registraron alertas para las zonas y el periodo seleccionado.", margin, y);
      y += 8;
    } else {
      const visibleAlerts = report.alerts.slice(0, 24);
      autoTable(doc, {
        startY: y - 1,
        margin: { left: margin, right: margin, top: 19, bottom: 22 },
        head: [["Fecha", "Zona", "Alerta", "Severidad", "Estado"]],
        body: visibleAlerts.map((alert) => [
          formatDate(alert.createdAt),
          alert.zoneName,
          alert.title,
          severityLabel[alert.severity] ?? alert.severity,
          statusLabel[alert.status] ?? alert.status
        ]),
        theme: "grid",
        styles: {
          font: "helvetica",
          fontSize: 7.3,
          cellPadding: 2,
          textColor: [51, 65, 85],
          lineColor: BORDER,
          lineWidth: 0.2,
          overflow: "linebreak"
        },
        headStyles: { fillColor: [30, 41, 59], textColor: [255, 255, 255], fontStyle: "bold", fontSize: 7.2 },
        alternateRowStyles: { fillColor: [248, 250, 252] },
        columnStyles: {
          0: { cellWidth: 21 },
          1: { cellWidth: 30 },
          2: { cellWidth: 82 },
          3: { cellWidth: 24 },
          4: { cellWidth: 25 }
        }
      });
      y = (doc.lastAutoTable?.finalY ?? y) + 4;
      if (report.alerts.length > visibleAlerts.length) {
        doc.setFont("helvetica", "italic");
        doc.setFontSize(6.6);
        doc.setTextColor(...MUTED);
        doc.text(`Se listan las ${visibleAlerts.length} alertas más recientes de un total de ${report.alerts.length}.`, margin, y);
        y += 5;
      }
      y += 5;
    }
  }

  ensureSpace(30);
  sectionHeading("Estado de nodos IoT y sensores SCT-013");
  autoTable(doc, {
    startY: y - 1,
    margin: { left: margin, right: margin, top: 19, bottom: 22 },
    head: [["Nodo", "Zona", "Estado", "Última sincronización", "Calibración", "Offset", "Señal Wi-Fi"]],
    body: report.sensors.map((sensor) => [
      sensor.code,
      sensor.name,
      sensor.online ? "En línea" : "Sin conexión",
      formatDateTime(sensor.lastSync),
      `${num(sensor.calibration, 2)} A/V`,
      `${num(sensor.offsetVoltage, 2)} V`,
      `${sensor.wifiRssi} dBm`
    ]),
    theme: "grid",
    styles: {
      font: "helvetica",
      fontSize: 7.2,
      cellPadding: 2,
      textColor: [51, 65, 85],
      lineColor: BORDER,
      lineWidth: 0.2,
      overflow: "linebreak"
    },
    headStyles: { fillColor: [30, 41, 59], textColor: [255, 255, 255], fontStyle: "bold", fontSize: 7 },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    columnStyles: {
      0: { cellWidth: 24, fontStyle: "bold", fontSize: 6.4 },
      1: { cellWidth: 55 },
      2: { cellWidth: 19 },
      3: { cellWidth: 33 },
      4: { cellWidth: 19, halign: "right" },
      5: { cellWidth: 17, halign: "right" },
      6: { cellWidth: 15, halign: "right" }
    }
  });
  y = (doc.lastAutoTable?.finalY ?? y) + 9;

  if (options.includeRecommendations && report.recommendations.length) {
    ensureSpace(38);
    sectionHeading("Recomendaciones automáticas");
    report.recommendations.forEach((recommendation, index) => {
      const lines = doc.splitTextToSize(recommendation, contentWidth - 8);
      const blockHeight = lines.length * 4.1 + 3.5;
      ensureSpace(blockHeight);
      doc.setFillColor(...BRAND);
      doc.circle(margin + 2.4, y - 1.15, 2.4, "F");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(6);
      doc.setTextColor(255, 255, 255);
      doc.text(String(index + 1), margin + 2.4, y - 0.25, { align: "center" });
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8.3);
      doc.setTextColor(51, 65, 85);
      doc.text(lines, margin + 7.5, y);
      y += blockHeight;
    });
    y += 2;
  }

  ensureSpace(22);
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(margin, y, contentWidth, 18, 1.5, 1.5, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.2);
  doc.setTextColor(...SLATE);
  doc.text("Nota metodológica", margin + 4, y + 5.6);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(6.6);
  doc.setTextColor(...MUTED);
  const noteLines = doc.splitTextToSize(
    "Los consumos provienen de los sensores SCT-013 conectados al concentrador ESP32-LP-01 y se expresan en kWh. Los montos en Soles son referenciales, incluyen IGV del 18 % y se calculan con la tarifa BT3 configurada. La línea base corresponde al consumo estimado sin las medidas de eficiencia energética.",
    contentWidth - 8
  );
  doc.text(noteLines, margin + 4, y + 10.5);

  const totalPages = doc.getNumberOfPages();
  const footerDate = formatDateTime(report.meta.generatedAt);
  for (let page = 1; page <= totalPages; page += 1) {
    doc.setPage(page);
    doc.setDrawColor(...BORDER);
    doc.setLineWidth(0.2);
    doc.line(margin, pageHeight - 17, pageWidth - margin, pageHeight - 17);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(6.3);
    doc.setTextColor(148, 163, 184);
    doc.text("EnerClass · I.E. N° 2001 «Leoncio Prado» · Rímac, Lima — Perú", margin, pageHeight - 12);
    doc.text(`Documento generado el ${footerDate}`, margin, pageHeight - 8.5);
    doc.setFont("helvetica", "bold");
    doc.text(`Página ${page} de ${totalPages}`, pageWidth - margin, pageHeight - 10.5, { align: "right" });
  }

  const limaDate = (iso: string) =>
    new Intl.DateTimeFormat("en-CA", { timeZone: "America/Lima", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(iso));
  const filename = `EnerClass_${report.meta.type}_${limaDate(report.meta.from)}_${limaDate(report.meta.to)}.pdf`;
  doc.save(filename);
  return filename;

  function entityHeader() {
    doc.setFillColor(...DARK);
    doc.rect(0, 0, pageWidth, 36, "F");
    doc.setFillColor(...BRAND);
    doc.rect(0, 36, pageWidth, 1.8, "F");

    doc.setFillColor(...BRAND);
    doc.roundedRect(margin, 8, 17, 17, 3, 3, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9.5);
    doc.setTextColor(255, 255, 255);
    doc.text("EC", margin + 8.5, 18.6, { align: "center" });

    doc.setFont("helvetica", "normal");
    doc.setFontSize(6.4);
    doc.setTextColor(148, 163, 184);
    doc.text("SISTEMA DE MONITOREO ENERGÉTICO", margin + 21, 11.6);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(255, 255, 255);
    doc.text(report.meta.institution, margin + 21, 17.4);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(6.4);
    doc.setTextColor(148, 163, 184);
    doc.text(`${report.meta.district} · ${report.meta.ugel}`, margin + 21, 22.2);

    doc.setFontSize(6.2);
    doc.text("DOCUMENTO OFICIAL", pageWidth - margin, 10.8, { align: "right" });
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.2);
    doc.setTextColor(255, 255, 255);
    doc.text("EnerClass", pageWidth - margin, 16.4, { align: "right" });
    doc.setFont("helvetica", "normal");
    doc.setFontSize(6.2);
    doc.setTextColor(148, 163, 184);
    doc.text(`Generado: ${formatDateTime(report.meta.generatedAt)}`, pageWidth - margin, 21.2, { align: "right" });
  }

  function continuationHeader() {
    doc.setFillColor(...DARK);
    doc.rect(0, 0, pageWidth, 12, "F");
    doc.setFillColor(...BRAND);
    doc.rect(0, 12, pageWidth, 0.9, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.4);
    doc.setTextColor(255, 255, 255);
    doc.text("EnerClass · I.E. N° 2001 «Leoncio Prado»", margin, 7.6);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(6.8);
    doc.setTextColor(203, 213, 225);
    doc.text(report.meta.title, pageWidth - margin, 7.6, { align: "right" });
  }

  function ensureSpace(needed: number) {
    if (y + needed <= pageHeight - 23) return;
    doc.addPage();
    continuationHeader();
    y = 25;
  }

  function sectionHeading(title: string) {
    doc.setFillColor(...BRAND);
    doc.rect(margin, y - 3.1, 2.2, 4, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9.8);
    doc.setTextColor(...DARK);
    doc.text(title, margin + 4.5, y);
    y += 6;
  }
}
