"use client";

import { formatNumber } from "@/lib/utils";

type Entry = {
  name?: string;
  value?: number | string;
  color?: string;
  dataKey?: string | number;
  payload?: Record<string, unknown>;
};

export function EnergyTooltip({
  active,
  payload,
  label,
  unit = "kW",
  total
}: {
  active?: boolean;
  payload?: Entry[];
  label?: string | number;
  unit?: string;
  total?: boolean;
}) {
  if (!active || !payload?.length) return null;
  const entries = payload.filter((entry) => typeof entry.value === "number");
  const sum = entries.reduce((acc, entry) => acc + Number(entry.value ?? 0), 0);

  return (
    <div className="min-w-[180px] rounded-xl border border-slate-200 bg-white/95 p-3 shadow-xl backdrop-blur dark:border-white/10 dark:bg-[#0b1626]/95">
      <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">{label}</p>
      <div className="space-y-1.5">
        {entries.map((entry) => (
          <div key={String(entry.dataKey ?? entry.name)} className="flex items-center justify-between gap-4 text-[11px]">
            <span className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
              <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: entry.color }} />
              {entry.name}
            </span>
            <span className="font-semibold tabular-nums text-slate-900 dark:text-white">
              {formatNumber(Number(entry.value), 2)} {unit}
            </span>
          </div>
        ))}
      </div>
      {total && entries.length > 1 ? (
        <div className="mt-2 flex items-center justify-between border-t border-slate-100 pt-2 text-[11px] dark:border-white/[0.07]">
          <span className="font-medium text-slate-500 dark:text-slate-400">Total</span>
          <span className="font-bold tabular-nums text-slate-900 dark:text-white">
            {formatNumber(sum, 2)} {unit}
          </span>
        </div>
      ) : null}
    </div>
  );
}
