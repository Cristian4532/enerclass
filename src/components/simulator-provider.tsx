"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import type { TelemetryPayload, ZoneCode } from "@/lib/types";

const SIMULATED_ZONES: { code: ZoneCode; profile: { school: number; evening: number; night: number; weekend: number } }[] = [
  { code: "COMPUTO", profile: { school: 2.9, evening: 0.3, night: 0.1, weekend: 0.12 } },
  { code: "TALLERES", profile: { school: 4.2, evening: 0.36, night: 0.13, weekend: 0.14 } },
  { code: "ALUMBRADO", profile: { school: 1.85, evening: 0.72, night: 0.38, weekend: 0.33 } },
  { code: "ADMINISTRACION", profile: { school: 1.55, evening: 0.25, night: 0.08, weekend: 0.09 } }
];

const TARIFF = 0.715;

function limaNow() {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Lima",
    hour: "2-digit",
    minute: "2-digit",
    weekday: "short",
    hour12: false,
    hourCycle: "h23"
  }).formatToParts(new Date());
  const get = (type: string) => parts.find((part) => part.type === type)?.value ?? "0";
  const hour = Number(get("hour")) + Number(get("minute")) / 60;
  const weekday = get("weekday");
  return { hour, isWeekend: weekday === "Sat" || weekday === "Sun" };
}

function generatePayload(code: ZoneCode, profile: { school: number; evening: number; night: number; weekend: number }): TelemetryPayload {
  const { hour, isWeekend } = limaNow();
  const isSchool = !isWeekend && hour >= 7.5 && hour < 18;
  let base: number;
  if (isWeekend) base = profile.weekend;
  else if (isSchool) base = profile.school;
  else if (hour >= 18 && hour < 21) base = profile.evening;
  else base = profile.night;

  let power = base * (0.9 + Math.random() * 0.2);
  if (isSchool) power *= 1 + Math.sin(hour * 0.9) * 0.04;
  if (Math.random() < 0.004) power *= 1.35 + Math.random() * 0.18; // anomalía ocasional

  const voltage = 219 + Math.random() * 5;
  const powerFactor = 0.93 + Math.random() * 0.045;
  const currentAmps = (power * 1000) / (voltage * powerFactor);

  return {
    deviceId: "ESP32-LP-01",
    zone: code,
    currentAmps: Number(currentAmps.toFixed(2)),
    voltageVolts: Number(voltage.toFixed(1)),
    powerKw: Number(power.toFixed(3)),
    powerFactor: Number(powerFactor.toFixed(3)),
    tariffSoles: TARIFF,
    intervalSeconds: 3,
    wifiRssi: -52 - Math.floor(Math.random() * 14)
  };
}

type SimulatorContextValue = {
  running: boolean;
  sentCount: number;
  lastSentAt: string | null;
  error: string | null;
  toggle: () => void;
  sendOnce: () => Promise<void>;
};

const SimulatorContext = createContext<SimulatorContextValue | null>(null);

export function SimulatorProvider({ children }: { children: React.ReactNode }) {
  const [running, setRunning] = useState(false);
  const [sentCount, setSentCount] = useState(0);
  const [lastSentAt, setLastSentAt] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const inFlight = useRef(false);

  const sendOnce = useCallback(async () => {
    if (inFlight.current) return;
    inFlight.current = true;
    try {
      const batch = SIMULATED_ZONES.map((zone) => generatePayload(zone.code, zone.profile));
      const results = await Promise.allSettled(
        batch.map(async (payload) => {
          const response = await fetch("/api/iot/telemetry", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
          });
          if (!response.ok) {
            const data = await response.json().catch(() => ({}));
            throw new Error(data.error ?? `Error ${response.status}`);
          }
          return response.json();
        })
      );
      const failures = results.filter((result) => result.status === "rejected");
      setSentCount((count) => count + batch.length);
      setLastSentAt(new Date().toISOString());
      setError(failures.length ? "Algunas tramas no pudieron enviarse. Reintentando…" : null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al enviar telemetría simulada");
    } finally {
      inFlight.current = false;
    }
  }, []);

  useEffect(() => {
    if (!running) return;
    void sendOnce();
    const interval = setInterval(() => {
      if (document.visibilityState === "visible") void sendOnce();
    }, 3000);
    return () => clearInterval(interval);
  }, [running, sendOnce]);

  useEffect(() => {
    if (running) {
      const onUnload = () => setRunning(false);
      window.addEventListener("beforeunload", onUnload);
      return () => window.removeEventListener("beforeunload", onUnload);
    }
  }, [running]);

  const value = useMemo<SimulatorContextValue>(
    () => ({
      running,
      sentCount,
      lastSentAt,
      error,
      toggle: () => setRunning((value) => !value),
      sendOnce
    }),
    [running, sentCount, lastSentAt, error, sendOnce]
  );

  return <SimulatorContext.Provider value={value}>{children}</SimulatorContext.Provider>;
}

export function useSimulator() {
  const context = useContext(SimulatorContext);
  if (!context) throw new Error("useSimulator debe usarse dentro de SimulatorProvider");
  return context;
}
