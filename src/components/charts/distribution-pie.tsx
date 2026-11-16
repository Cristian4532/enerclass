"use client";

import { memo } from "react";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { EnergyTooltip } from "@/components/charts/chart-tooltip";
import type { DashboardData } from "@/lib/types";
import { formatNumber, formatSoles } from "@/lib/utils";

/** Pie memoizado por valores: evita repintar el donut mientras solo cambia un KPI. */
export const DistributionPie = memo(
  function DistributionPie({
    distribution,
    monthCost,
    monthKwh
  }: {
    distribution: DashboardData["distribution"];
    monthCost: number;
    monthKwh: number;
  }) {
    return (
      <div className="relative h-[210px] px-4 pt-3">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={distribution}
              dataKey="kwh"
              nameKey="name"
              cx="50%"
              cy="50%"
              innerRadius={63}
              outerRadius={88}
              paddingAngle={3}
              cornerRadius={5}
              stroke="none"
              isAnimationActive={false}
            >
              {distribution.map((entry) => (
                <Cell key={entry.code} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip content={<EnergyTooltip unit="kWh" />} />
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center pt-3">
          <p className="text-[9px] font-bold uppercase tracking-[0.15em] text-slate-400">Costo total</p>
          <p className="mt-0.5 text-xl font-bold tracking-tight text-slate-900 dark:text-white">{formatSoles(monthCost)}</p>
          <p className="text-[9.5px] text-slate-400">{formatNumber(monthKwh, 0)} kWh</p>
        </div>
      </div>
    );
  },
  (prev, next) => {
    if (prev.distribution === next.distribution && prev.monthCost === next.monthCost && prev.monthKwh === next.monthKwh) return true;
    if (prev.distribution.length !== next.distribution.length) return false;
    return (
      prev.monthCost === next.monthCost &&
      prev.monthKwh === next.monthKwh &&
      prev.distribution.every((item, index) => {
        const other = next.distribution[index];
        return other.code === item.code && other.kwh === item.kwh && other.cost === item.cost && other.pct === item.pct;
      })
    );
  }
);
