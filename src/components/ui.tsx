"use client";

import { memo, useEffect } from "react";
import { createPortal } from "react-dom";
import { Loader2, X } from "lucide-react";
import { cn } from "@/lib/utils";

export function Card({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("card", className)} {...props} />;
}

export function CardHeader({
  title,
  description,
  action,
  className,
  icon
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
  icon?: React.ReactNode;
}) {
  return (
    <div className={cn("flex flex-col gap-3 border-b border-slate-100 px-5 py-4 dark:border-white/[0.06] sm:flex-row sm:items-center sm:justify-between sm:px-6", className)}>
      <div className="flex min-w-0 items-center gap-3">
        {icon ? <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-500/10 text-brand-600 dark:text-brand-400">{icon}</div> : null}
        <div className="min-w-0">
          <h3 className="truncate text-sm font-semibold text-slate-900 dark:text-white">{title}</h3>
          {description ? <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{description}</p> : null}
        </div>
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
type ButtonSize = "sm" | "md" | "lg";

export function Button({
  variant = "primary",
  size = "md",
  loading,
  className,
  children,
  disabled,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
}) {
  const variants: Record<ButtonVariant, string> = {
    primary: "btn-primary",
    secondary: "btn-secondary",
    ghost: "btn-ghost",
    danger: "btn-danger"
  };
  const sizes: Record<ButtonSize, string> = { sm: "btn-sm", md: "btn-md", lg: "btn-lg" };
  return (
    <button className={cn(variants[variant], sizes[size], className)} disabled={disabled || loading} {...props}>
      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
      {children}
    </button>
  );
}

export function Badge({
  children,
  className,
  dot
}: {
  children: React.ReactNode;
  className?: string;
  dot?: string;
}) {
  return (
    <span className={cn("badge", className)}>
      {dot ? <span className={cn("h-1.5 w-1.5 rounded-full", dot)} /> : null}
      {children}
    </span>
  );
}

export function Progress({
  value,
  max = 100,
  className,
  barClassName
}: {
  value: number;
  max?: number;
  className?: string;
  barClassName?: string;
}) {
  const pct = Math.min(100, Math.max(0, (value / max) * 100));
  return (
    <div className={cn("h-1.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-white/10", className)}>
      <div className={cn("h-full rounded-full bg-brand-500 transition-all duration-700", barClassName)} style={{ width: `${pct}%` }} />
    </div>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("skeleton", className)} />;
}

export function PageHeader({
  title,
  description,
  icon,
  actions,
  eyebrow
}: {
  title: string;
  description?: string;
  icon?: React.ReactNode;
  actions?: React.ReactNode;
  eyebrow?: string;
}) {
  return (
    <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="flex items-start gap-3.5">
        {icon ? (
          <div className="mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-brand-500/20 bg-gradient-to-br from-brand-500/15 to-teal-500/5 text-brand-600 shadow-sm dark:text-brand-400">
            {icon}
          </div>
        ) : null}
        <div>
          {eyebrow ? <p className="eyebrow mb-1">{eyebrow}</p> : null}
          <h1 className="page-title text-balance">{title}</h1>
          {description ? <p className="mt-1.5 max-w-3xl text-sm leading-relaxed text-slate-500 dark:text-slate-400">{description}</p> : null}
        </div>
      </div>
      {actions ? <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  );
}

export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  size = "md"
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  size?: "sm" | "md" | "lg" | "xl";
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previous;
    };
  }, [open, onClose]);

  if (!open || typeof document === "undefined") return null;

  const sizes = {
    sm: "max-w-md",
    md: "max-w-lg",
    lg: "max-w-2xl",
    xl: "max-w-5xl"
  };

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-end justify-center p-0 sm:items-center sm:p-6">
      <div className="absolute inset-0 bg-slate-950/55 backdrop-blur-sm" onClick={onClose} aria-hidden />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={cn(
          "relative flex max-h-[92vh] w-full flex-col overflow-hidden rounded-t-2xl border border-slate-200 bg-white shadow-2xl dark:border-white/10 dark:bg-[#0b1626] sm:rounded-2xl animate-fade-up",
          sizes[size]
        )}
      >
        <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-5 py-4 dark:border-white/[0.06] sm:px-6">
          <div>
            <h3 className="text-base font-semibold text-slate-900 dark:text-white">{title}</h3>
            {description ? <p className="mt-1 text-xs leading-relaxed text-slate-500 dark:text-slate-400">{description}</p> : null}
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-white/10 dark:hover:text-white"
            aria-label="Cerrar"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="scrollbar-thin min-h-0 flex-1 overflow-y-auto px-5 py-5 sm:px-6">{children}</div>
        {footer ? <div className="flex flex-wrap justify-end gap-2 border-t border-slate-100 bg-slate-50/60 px-5 py-3.5 dark:border-white/[0.06] dark:bg-white/[0.02] sm:px-6">{footer}</div> : null}
      </div>
    </div>,
    document.body
  );
}

export function EmptyState({ icon, title, description, action }: { icon?: React.ReactNode; title: string; description?: string; action?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-14 text-center">
      {icon ? <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-400 dark:bg-white/[0.05] dark:text-slate-500">{icon}</div> : null}
      <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">{title}</p>
      {description ? <p className="mt-1 max-w-sm text-xs leading-relaxed text-slate-500 dark:text-slate-400">{description}</p> : null}
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message?: string; onRetry?: () => void }) {
  return (
    <div className="card card-pad flex flex-col items-center justify-center py-12 text-center">
      <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-rose-500/10 text-rose-500">
        <X className="h-5 w-5" />
      </div>
      <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">No se pudieron cargar los datos</p>
      <p className="mt-1 max-w-sm text-xs text-slate-500 dark:text-slate-400">{message ?? "Verifique la conexión con el servidor."}</p>
      {onRetry ? (
        <Button variant="secondary" size="sm" className="mt-4" onClick={onRetry}>
          Reintentar
        </Button>
      ) : null}
    </div>
  );
}

type StatCardProps = {
  label: string;
  value: string | React.ReactNode;
  unit?: string;
  icon?: React.ReactNode;
  hint?: string;
  trend?: { value: string; positive?: boolean };
  accent?: "brand" | "cyan" | "amber" | "violet" | "rose" | "slate";
  footer?: React.ReactNode;
};

/**
 * Memoizado: durante la telemetría en vivo solo se repinta la tarjeta cuyo
 * valor cambia, no todo el bloque de KPIs.
 */
export const StatCard = memo(function StatCard({
  label,
  value,
  unit,
  icon,
  hint,
  trend,
  accent = "brand",
  footer
}: StatCardProps) {
  const accents: Record<string, string> = {
    brand: "bg-brand-500/10 text-brand-600 dark:text-brand-400",
    cyan: "bg-cyan-500/10 text-cyan-600 dark:text-cyan-400",
    amber: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
    violet: "bg-violet-500/10 text-violet-600 dark:text-violet-400",
    rose: "bg-rose-500/10 text-rose-600 dark:text-rose-400",
    slate: "bg-slate-500/10 text-slate-600 dark:text-slate-300"
  };

  return (
    <div className="card card-hover card-pad group relative overflow-hidden">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">{label}</p>
          <div className="mt-2 flex flex-wrap items-baseline gap-1.5">
            <span className="stat-value">{value}</span>
            {unit ? <span className="text-xs font-medium text-slate-400 dark:text-slate-500">{unit}</span> : null}
          </div>
        </div>
        {icon ? <div className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-transform group-hover:scale-105", accents[accent])}>{icon}</div> : null}
      </div>
      <div className="mt-2 flex items-center justify-between gap-2">
        <p className="text-[11px] leading-relaxed text-slate-500 dark:text-slate-400">{hint}</p>
        {trend ? (
          <span
            className={cn(
              "inline-flex items-center gap-0.5 text-[11px] font-semibold",
              trend.positive === false ? "text-rose-500" : "text-emerald-500"
            )}
          >
            {trend.value}
          </span>
        ) : null}
      </div>
      {footer ? <div className="mt-3">{footer}</div> : null}
    </div>
  );
});

export function SectionLabel({ children, className }: { children: React.ReactNode; className?: string }) {
  return <p className={cn("text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500", className)}>{children}</p>;
}

export function FieldError({ children }: { children?: React.ReactNode }) {
  if (!children) return null;
  return <p className="mt-1.5 text-[11px] font-medium text-rose-500">{children}</p>;
}
