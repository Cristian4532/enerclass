import { DEMAND_CHARGE, FIXED_CHARGE } from "@/lib/constants";
import type { BillBreakdown } from "@/lib/types";

export function buildBill(energyKwh: number, maxDemandKw: number, tariff: number, igvRate: number): BillBreakdown {
  const energyCharge = energyKwh * tariff;
  const demandCharge = Math.max(0, maxDemandKw) * DEMAND_CHARGE;
  const fixedCharge = FIXED_CHARGE;
  const subtotal = energyCharge + demandCharge + fixedCharge;
  const igv = subtotal * igvRate;
  const total = subtotal + igv;

  return {
    energyKwh: round2(energyKwh),
    energyCharge: round2(energyCharge),
    demandCharge: round2(demandCharge),
    fixedCharge: round2(fixedCharge),
    subtotal: round2(subtotal),
    igv: round2(igv),
    total: round2(total)
  };
}

export function round2(value: number) {
  return Math.round(value * 100) / 100;
}

export function efficiencyRating(kwhPerStudent: number) {
  const scale = [
    { rating: "A", max: 2.6, label: "Excelente" },
    { rating: "B", max: 3.4, label: "Muy eficiente" },
    { rating: "C", max: 4.2, label: "Eficiente" },
    { rating: "D", max: 5.2, label: "Aceptable" },
    { rating: "E", max: 6.5, label: "Mejorable" },
    { rating: "F", max: 8, label: "Ineficiente" },
    { rating: "G", max: Infinity, label: "Crítico" }
  ];

  const currentIndex = scale.findIndex((item) => kwhPerStudent <= item.max);
  const safeIndex = currentIndex === -1 ? scale.length - 1 : currentIndex;
  const current = scale[safeIndex];
  const previousMax = safeIndex > 0 ? scale[safeIndex - 1].max : 0;
  const better = safeIndex > 0 ? scale[safeIndex - 1] : null;
  const progressInBand =
    current.max === Infinity ? 0 : Math.min(100, Math.max(0, ((kwhPerStudent - previousMax) / (current.max - previousMax)) * 100));
  const score = Math.max(5, Math.min(100, Math.round(100 - safeIndex * 10 - progressInBand * 0.09)));

  return {
    rating: current.rating,
    label: current.label,
    score,
    description:
      safeIndex <= 2
        ? "El consumo por estudiante se encuentra en un rango adecuado para el colegio."
        : "El consumo por estudiante puede reducirse con cambios en el uso y la programación de los equipos.",
    next: better
      ? `Para alcanzar la categoría ${better.rating}, el consumo debe bajar a ${better.max} kWh por estudiante al mes.`
      : "Mantener el seguimiento mensual para conservar la categoría A."
  };
}
