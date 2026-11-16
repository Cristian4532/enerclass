"use client";

import { memo } from "react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { EnergyTooltip } from "@/components/charts/chart-tooltip";
import type { FinanceData } from "@/lib/types";

function sameWeeks(a: FinanceData["weeks"], b: FinanceData["weeks"]) {
  if (a === b) return true;
  if (a.length !== b.length) return false;
  return a.every((week, index) => {
    const other = b[index];
    return week.label === other.label && week.currentSoles === other.currentSoles && week.baselineSoles === other.baselineSoles;
  });
}

export const FinanceBarChart = memo(
  function FinanceBarChart({ weekly }: { weekly: FinanceData["weeks"] }) {
    return (
      <div className="h-[280px] p-4 text-slate-400 dark:text-slate-500 sm:p-6">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={weekly} margin={{ top: 8, right: 8, left: -8, bottom: 0 }} barGap={4}>
            <CartesianGrid strokeDasharray="3 3" stroke="currentColor" opacity={0.16} vertical={false} />
            <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: "currentColor", fontSize: 10 }} dy={8} />
            <YAxis axisLine={false} tickLine={false} tick={{ fill: "currentColor", fontSize: 10 }} tickFormatter={(value) => `S/${value}`} width={54} />
            <Tooltip content={<EnergyTooltip unit="S/" />} cursor={{ fill: "rgba(148,163,184,0.08)" }} />
            <Bar dataKey="baselineSoles" name="Sin EnerClass" fill="#cbd5e1" radius={[5, 5, 0, 0]} maxBarSize={30} isAnimationActive={false} />
            <Bar dataKey="currentSoles" name="Con EnerClass" fill="#10b981" radius={[5, 5, 0, 0]} maxBarSize={30} isAnimationActive={false} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    );
  },
  (prev, next) => sameWeeks(prev.weekly, next.weekly)
);
