"use client";

import { memo } from "react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { EnergyTooltip } from "@/components/charts/chart-tooltip";
import type { SustainabilityData } from "@/lib/types";

function sameWeeks(a: SustainabilityData["weeks"], b: SustainabilityData["weeks"]) {
  if (a === b) return true;
  if (a.length !== b.length) return false;
  return a.every((week, index) => {
    const other = b[index];
    return week.label === other.label && week.currentKwh === other.currentKwh && week.baselineKwh === other.baselineKwh;
  });
}

export const SustainabilityBarChart = memo(
  function SustainabilityBarChart({ weeks }: { weeks: SustainabilityData["weeks"] }) {
    return (
      <div className="h-[300px] p-4 text-slate-400 dark:text-slate-500 sm:p-6">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={weeks} margin={{ top: 8, right: 8, left: -14, bottom: 0 }} barGap={4}>
            <CartesianGrid strokeDasharray="3 3" stroke="currentColor" opacity={0.16} vertical={false} />
            <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: "currentColor", fontSize: 10 }} dy={8} />
            <YAxis axisLine={false} tickLine={false} tick={{ fill: "currentColor", fontSize: 10 }} tickFormatter={(value) => `${value}`} width={44} />
            <Tooltip content={<EnergyTooltip unit="kWh" />} cursor={{ fill: "rgba(148,163,184,0.08)" }} />
            <Bar dataKey="baselineKwh" name="Sin mejoras" fill="#cbd5e1" radius={[5, 5, 0, 0]} maxBarSize={34} isAnimationActive={false} />
            <Bar dataKey="currentKwh" name="Con mejoras" fill="#10b981" radius={[5, 5, 0, 0]} maxBarSize={34} isAnimationActive={false} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    );
  },
  (prev, next) => sameWeeks(prev.weeks, next.weeks)
);
