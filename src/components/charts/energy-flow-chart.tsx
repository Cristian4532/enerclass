"use client";

import { memo } from "react";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { EnergyTooltip } from "@/components/charts/chart-tooltip";
import { ZONE_THEME } from "@/lib/constants";
import type { DashboardData, ZoneCode } from "@/lib/types";

const ZONE_CODES: ZoneCode[] = ["COMPUTO", "TALLERES", "ALUMBRADO", "ADMINISTRACION"];

function sameSeries(a: DashboardData["series"], b: DashboardData["series"]) {
  if (a === b) return true;
  if (a.length !== b.length || a.length === 0) return false;
  return a.every((point, index) => {
    const other = b[index];
    return (
      point.key === other.key &&
      point.total === other.total &&
      point.COMPUTO === other.COMPUTO &&
      point.TALLERES === other.TALLERES &&
      point.ALUMBRADO === other.ALUMBRADO &&
      point.ADMINISTRACION === other.ADMINISTRACION
    );
  });
}

function sameZoneMeta(a: DashboardData["zones"], b: DashboardData["zones"]) {
  if (a === b) return true;
  if (a.length !== b.length) return false;
  return a.every((zone, index) => {
    const other = b[index];
    return zone.code === other.code && zone.shortName === other.shortName && zone.color === other.color;
  });
}

/** Gráfico memoizado: si la ventana de 30 puntos no cambió, Recharts no se repinta. */
export const EnergyFlowChart = memo(
  function EnergyFlowChart({ series, zones }: { series: DashboardData["series"]; zones: DashboardData["zones"] }) {
    return (
      <div className="h-[310px] w-full text-slate-400 dark:text-slate-500">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={series} margin={{ top: 4, right: 8, left: -12, bottom: 0 }}>
            <defs>
              {ZONE_CODES.map((code) => (
                <linearGradient key={code} id={`grad-${code}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={ZONE_THEME[code].color} stopOpacity={0.4} />
                  <stop offset="95%" stopColor={ZONE_THEME[code].color} stopOpacity={0.03} />
                </linearGradient>
              ))}
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="currentColor" opacity={0.16} vertical={false} />
            <XAxis
              dataKey="label"
              axisLine={false}
              tickLine={false}
              tick={{ fill: "currentColor", fontSize: 10 }}
              minTickGap={28}
              dy={8}
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{ fill: "currentColor", fontSize: 10 }}
              tickFormatter={(value) => `${value} kW`}
              width={52}
            />
            <Tooltip content={<EnergyTooltip unit="kW" total />} cursor={{ stroke: "rgba(148,163,184,0.3)", strokeWidth: 1 }} />
            {ZONE_CODES.map((code) => (
              <Area
                key={code}
                type="monotone"
                dataKey={code}
                name={zones.find((zone) => zone.code === code)?.shortName ?? code}
                stackId="1"
                stroke={ZONE_THEME[code].color}
                strokeWidth={1.8}
                fill={`url(#grad-${code})`}
                fillOpacity={1}
                isAnimationActive={false}
                activeDot={{ r: 3, strokeWidth: 2, stroke: "#fff" }}
              />
            ))}
          </AreaChart>
        </ResponsiveContainer>
      </div>
    );
  },
  (prev, next) => sameSeries(prev.series, next.series) && sameZoneMeta(prev.zones, next.zones)
);
