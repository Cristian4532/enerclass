"use client";

import { useState } from "react";
import { Sidebar } from "@/components/sidebar";
import { Header } from "@/components/header";
import { SimulatorProvider } from "@/components/simulator-provider";
import type { SessionUser } from "@/lib/types";

export function AppShell({ user, children }: { user: SessionUser; children: React.ReactNode }) {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <SimulatorProvider>
      <div className="min-h-screen">
        <Sidebar user={user} open={menuOpen} onClose={() => setMenuOpen(false)} />
        <div className="flex min-h-screen flex-col lg:pl-72">
          <Header user={user} onMenu={() => setMenuOpen(true)} />
          <main className="relative mx-auto w-full max-w-[1600px] flex-1 px-4 pb-12 pt-6 sm:px-6 lg:px-8">
            <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-64 bg-[radial-gradient(ellipse_at_top_left,rgba(16,185,129,0.055),transparent_60%)] dark:bg-[radial-gradient(ellipse_at_top_left,rgba(16,185,129,0.08),transparent_60%)]" />
            {children}
          </main>
          <footer className="border-t border-slate-200/70 px-4 py-4 text-[10px] text-slate-400 dark:border-white/[0.05] dark:text-slate-600 sm:px-6 lg:px-8">
            <div className="mx-auto flex max-w-[1600px] flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
              <p>EnerClass · Sistema de seguimiento del consumo eléctrico — I.E. N° 2001 «Leoncio Prado», Rímac.</p>
              <p>Datos de demostración · Sensores SCT-013 · ESP32-LP-01</p>
            </div>
          </footer>
        </div>
      </div>
    </SimulatorProvider>
  );
}
