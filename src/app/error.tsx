"use client";

import { useEffect } from "react";
import { AlertTriangle, LayoutDashboard, RefreshCcw } from "lucide-react";

const RELOAD_KEY = "enerclass-chunk-reload";

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);

    const message = `${error.name} ${error.message}`;
    const staleChunk = /ChunkLoadError|Loading chunk|Failed to fetch dynamically imported module|Importing a module script failed/i.test(message);
    if (!staleChunk) return;

    try {
      if (!sessionStorage.getItem(RELOAD_KEY)) {
        sessionStorage.setItem(RELOAD_KEY, "1");
        window.location.reload();
      }
    } catch {
      /* almacenamiento no disponible */
    }
  }, [error]);

  function retry() {
    try {
      sessionStorage.removeItem(RELOAD_KEY);
    } catch {
      /* almacenamiento no disponible */
    }
    reset();
  }

  return (
    <div className="flex min-h-[70vh] items-center justify-center px-4 py-12">
      <div className="w-full max-w-lg rounded-2xl border border-slate-200/80 bg-white p-7 text-center shadow-card dark:border-white/[0.07] dark:bg-[#0b1626] sm:p-9">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
          <AlertTriangle className="h-5 w-5" />
        </div>
        <h1 className="mt-4 text-lg font-bold tracking-tight text-slate-900 dark:text-white">No se pudo cargar esta sección</h1>
        <p className="mt-2 text-[12px] leading-relaxed text-slate-500 dark:text-slate-400">
          Ocurrió un problema al mostrar la información. Puede volver a intentarlo; si el aviso continúa, recargue la página.
        </p>
        {error.digest ? <p className="mt-3 font-mono text-[9.5px] text-slate-400">Referencia: {error.digest}</p> : null}
        <div className="mt-6 flex flex-col justify-center gap-2 sm:flex-row">
          <button onClick={retry} className="btn-primary btn-md">
            <RefreshCcw className="h-4 w-4" /> Volver a intentar
          </button>
          <a href="/dashboard" className="btn-secondary btn-md">
            <LayoutDashboard className="h-4 w-4" /> Ir al panel principal
          </a>
        </div>
        <p className="mt-5 text-[10px] text-slate-400">I.E. N° 2001 «Leoncio Prado» · EnerClass</p>
      </div>
    </div>
  );
}
