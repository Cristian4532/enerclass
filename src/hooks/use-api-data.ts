"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type Options = {
  interval?: number;
  enabled?: boolean;
};

export function useApiData<T>(url: string, options: Options = {}) {
  const { interval = 15000, enabled = true } = options;
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const mounted = useRef(true);
  const requestId = useRef(0);
  const controller = useRef<AbortController | null>(null);

  const refresh = useCallback(async () => {
    if (!enabled) return;
    const id = ++requestId.current;
    controller.current?.abort();
    const current = new AbortController();
    controller.current = current;
    setRefreshing(true);
    try {
      const response = await fetch(url, { cache: "no-store", signal: current.signal });
      const json = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error((json as { error?: string }).error ?? `Error ${response.status}`);
      if (mounted.current && id === requestId.current) {
        setData(json as T);
        setError(null);
      }
    } catch (err) {
      if (current.signal.aborted) return;
      if (mounted.current && id === requestId.current) {
        setError(err instanceof Error ? err.message : "Error al consultar el servidor");
      }
    } finally {
      if (mounted.current && id === requestId.current) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, [url, enabled]);

  useEffect(() => {
    mounted.current = true;
    setLoading(true);
    void refresh();
    return () => {
      mounted.current = false;
      controller.current?.abort();
    };
  }, [refresh]);

  useEffect(() => {
    if (!enabled || interval <= 0) return;
    const intervalId = setInterval(() => {
      if (document.visibilityState === "visible") void refresh();
    }, interval);
    return () => clearInterval(intervalId);
  }, [refresh, interval, enabled]);

  return { data, loading, refreshing, error, refresh, setData };
}
