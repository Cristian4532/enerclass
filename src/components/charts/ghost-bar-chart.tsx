"use client";

import { memo } from "react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { EnergyTooltip } from "@/components/charts/chart-tooltip";
import type { GhostData } from "@/lib/types";

function sameByZone(a: GhostData["byZone"], b: GhostData["byZone"]) {
  if (a === b) return true;
  if (a.length !== b.length) return false;
  return a.every((zone, index) => {
    const other = b[index];
    return zone.code === other.code && zone.lectivoKwh === other.lectivoKwh && zone.fantasmaKwh === other.fantasmaKwh;
  });
}

export const GhostBarChart = memo(
  function GhostBarChart({ byZone }: { byZone: GhostData["byZone"] }) {
    return (
      <div className="h-[300px] p-4 text-slate-400 dark:text-slate-500 sm:p-6">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={byZone} margin={{ top: 8, right: 8, left: -14, bottom: 0 }} barGap={4}>
            <CartesianGrid strokeDasharray="3 3" stroke="currentColor" opacity={0.16} vertical={false} />
            <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: "currentColor", fontSize: 10 }} dy={8} />
            <YAxis axisLine={false} tickLine={false} tick={{ fill: "currentColor", fontSize: 10 }} tickFormatter={(value) => `${value}`} width={44} />
            <Tooltip content={<EnergyTooltip unit="kWh" />} cursor={{ fill: "rgba(148,163,184,0.08)" }} />
            <Bar dataKey="lectivoKwh" name="Consumo lectivo" fill="#10b981" radius={[5, 5, 0, 0]} maxBarSize={34} isAnimationActive={false} />
            <Bar dataKey="fantasmaKwh" name="Fuera de horario" fill="#fb7185" radius={[5, 5, 0, 0]} maxBarSize={34} isAnimationActive={false} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    );
  },
  (prev, next) => sameByZone(prev.byZone, next.byZone)
);
