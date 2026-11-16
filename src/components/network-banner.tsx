"use client";

import { useEffect, useState } from "react";
import { Check, Copy, Laptop, Wifi } from "lucide-react";
import type { NetworkInfo } from "@/lib/types";
import { cn } from "@/lib/utils";

async function copyText(value: string) {
  try {
    await navigator.clipboard.writeText(value);
    return true;
  } catch {
    try {
      const textarea = document.createElement("textarea");
      textarea.value = value;
      textarea.style.position = "fixed";
      textarea.style.opacity = "0";
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      textarea.remove();
      return true;
    } catch {
      return false;
    }
  }
}

export function NetworkBanner({ variant = "compact" }: { variant?: "compact" | "login" }) {
  const [info, setInfo] = useState<NetworkInfo | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const response = await fetch("/api/system/network-info", { cache: "no-store" });
        if (!response.ok) return;
        const data = (await response.json()) as NetworkInfo;
        if (active) setInfo(data);
      } catch {
        // Sin red local disponible: el banner simplemente no se muestra.
      }
    }
    void load();
    const interval = setInterval(load, 60000);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, []);

  const url = info?.networkUrl ?? info?.publicUrl;
  if (!info || !url) return null;

  async function onCopy() {
    if (!url) return;
    const ok = await copyText(url);
    if (!ok) return;
    setCopied(true);
    setTimeout(() => setCopied(false), 2200);
  }

  return (
    <div
      className={cn(
        "flex flex-col gap-2 rounded-xl border border-brand-500/20 bg-brand-500/[0.055] px-3.5 py-2.5 dark:border-brand-400/15 dark:bg-brand-500/[0.07] sm:flex-row sm:items-center sm:justify-between",
        variant === "login" && "mb-5"
      )}
    >
      <div className="flex min-w-0 items-center gap-2.5">
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-brand-500/15 text-brand-600 dark:text-brand-400">
          {info.isCloud ? <Laptop className="h-3.5 w-3.5" /> : <Wifi className="h-3.5 w-3.5" />}
        </span>
        <div className="min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-wider text-brand-700 dark:text-brand-300">
            {info.isCloud ? "Acceso web" : "Acceso desde otras laptops o celulares"}
          </p>
          <p className="mt-0.5 truncate font-mono text-[10.5px] text-slate-600 dark:text-slate-300">{url}</p>
        </div>
      </div>
      <div className="flex items-center gap-2 pl-9 sm:pl-0">
        <span className="hidden text-[9px] text-slate-400 dark:text-slate-500 md:inline">
          {info.isCloud ? "Mismo enlace para todos" : "Misma red Wi-Fi / hotspot"}
        </span>
        <button
          type="button"
          onClick={() => void onCopy()}
          className="inline-flex h-7 shrink-0 items-center gap-1 rounded-md border border-brand-500/25 bg-white/70 px-2 text-[9.5px] font-semibold text-brand-700 transition hover:bg-white dark:border-brand-400/20 dark:bg-white/[0.05] dark:text-brand-300"
        >
          {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
          {copied ? "Copiado" : "Copiar enlace"}
        </button>
      </div>
    </div>
  );
}
