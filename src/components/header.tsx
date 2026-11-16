"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useTheme } from "next-themes";
import { BellRing, ChevronDown, LogOut, Menu, Moon, Radio, Settings2, Sun, Users, Zap } from "lucide-react";
import { NAV_ITEMS, ROLES, type RoleKey } from "@/lib/constants";
import { cn, initials } from "@/lib/utils";
import type { SessionUser } from "@/lib/types";
import { useSimulator } from "@/components/simulator-provider";
import { Badge } from "@/components/ui";

export function Header({ user, onMenu }: { user: SessionUser; onMenu: () => void }) {
  const pathname = usePathname();
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const { running, sentCount, toggle } = useSimulator();
  const [mounted, setMounted] = useState(false);
  const [now, setNow] = useState<Date | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [alertCount, setAlertCount] = useState(0);
  const menuRef = useRef<HTMLDivElement>(null);

  const role = ROLES[user.role as RoleKey] ?? ROLES.DIRECCION;
  const current = NAV_ITEMS.find((item) => pathname === item.href || pathname.startsWith(`${item.href}/`));

  useEffect(() => {
    setMounted(true);
    setNow(new Date());
    const interval = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    let active = true;
    async function loadCount() {
      try {
        const response = await fetch("/api/alerts/count", { cache: "no-store" });
        if (!response.ok) return;
        const data = await response.json();
        if (active) setAlertCount(Number(data.pending ?? 0));
      } catch {
        /* silencioso */
      }
    }
    void loadCount();
    const interval = setInterval(loadCount, running ? 6000 : 20000);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [running, pathname]);

  useEffect(() => {
    function onClick(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) setMenuOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  async function logout() {
    setLoggingOut(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      router.push("/login");
      router.refresh();
    } finally {
      setLoggingOut(false);
    }
  }

  const clock = now
    ? new Intl.DateTimeFormat("es-PE", {
        timeZone: "America/Lima",
        weekday: "short",
        day: "2-digit",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false
      }).format(now)
    : "";

  return (
    <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/80 backdrop-blur-xl dark:border-white/[0.07] dark:bg-[#060c16]/85">
      <div className="flex h-[72px] items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
        <div className="flex min-w-0 items-center gap-3">
          <button
            onClick={onMenu}
            className="rounded-lg border border-slate-200 bg-white p-2 text-slate-600 shadow-sm hover:bg-slate-50 dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-300 dark:hover:bg-white/[0.08] lg:hidden"
            aria-label="Abrir menú"
          >
            <Menu className="h-5 w-5" />
          </button>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <p className="truncate text-[15px] font-semibold text-slate-900 dark:text-white">{current?.label ?? "Panel principal"}</p>
              <span className="hidden rounded-md border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-slate-500 dark:border-white/[0.08] dark:bg-white/[0.03] dark:text-slate-400 sm:inline">
                {current?.section ?? "EnerClass"}
              </span>
            </div>
            <p className="hidden truncate text-[10.5px] text-slate-500 dark:text-slate-500 sm:block">I.E. N° 2001 «Leoncio Prado» · Rímac, Lima · {clock}</p>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
          <button
            onClick={toggle}
            role="switch"
            aria-checked={running}
            title="Simulador de lecturas — envía datos de prueba cada 3 segundos"
            className={cn(
              "group flex h-9 items-center gap-2 rounded-full border px-2.5 text-[11px] font-semibold transition-all",
              running
                ? "border-brand-500/40 bg-brand-500/10 text-brand-700 shadow-[0_0_20px_-8px_rgba(16,185,129,0.7)] dark:text-brand-300"
                : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50 dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-300 dark:hover:bg-white/[0.07]"
            )}
          >
            {running ? <Radio className="h-3.5 w-3.5 animate-pulse" /> : <Zap className="h-3.5 w-3.5" />}
            <span className="hidden lg:inline">Simulador de lecturas</span>
            <span className="hidden sm:inline lg:hidden">Simulador</span>
            {running ? <span className="hidden text-[9px] font-bold uppercase tracking-wider text-brand-600 dark:text-brand-400 xl:inline">{sentCount} lecturas</span> : null}
            <span className={cn("relative ml-0.5 h-[18px] w-8 rounded-full transition-colors", running ? "bg-brand-500" : "bg-slate-300 dark:bg-white/20")} style={{ height: 18, width: 32 }}>
              <span
                className={cn(
                  "absolute top-[2px] h-[14px] w-[14px] rounded-full bg-white shadow-sm transition-all duration-300",
                  running ? "left-[16px]" : "left-[2px]"
                )}
              />
            </span>
          </button>

          <Link
            href="/alertas"
            className="relative hidden rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-800 dark:text-slate-400 dark:hover:bg-white/[0.06] dark:hover:text-white sm:block"
            aria-label="Alertas pendientes"
          >
            <BellRing className="h-[18px] w-[18px]" />
            {alertCount > 0 ? (
              <span className="absolute right-0.5 top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[9px] font-bold text-white ring-2 ring-white dark:ring-[#060c16]">
                {alertCount > 9 ? "9+" : alertCount}
              </span>
            ) : null}
          </Link>

          <button
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-800 dark:text-slate-400 dark:hover:bg-white/[0.06] dark:hover:text-white"
            aria-label="Cambiar tema"
          >
            {mounted && theme === "dark" ? <Sun className="h-[18px] w-[18px]" /> : <Moon className="h-[18px] w-[18px]" />}
          </button>

          <div className="mx-1 hidden h-7 w-px bg-slate-200 dark:bg-white/10 sm:block" />

          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setMenuOpen((value) => !value)}
              className="flex items-center gap-2 rounded-xl p-1 pr-1.5 transition hover:bg-slate-100 dark:hover:bg-white/[0.05]"
              aria-expanded={menuOpen}
            >
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-brand-500 to-teal-700 text-[11px] font-bold text-white shadow-sm">
                {initials(user.name)}
              </span>
              <span className="hidden text-left md:block">
                <span className="block max-w-[150px] truncate text-[11.5px] font-semibold leading-tight text-slate-800 dark:text-slate-100">{user.name}</span>
                <span className="block text-[9.5px] text-slate-500">{role.short}</span>
              </span>
              <ChevronDown className={cn("hidden h-3.5 w-3.5 text-slate-400 transition md:block", menuOpen && "rotate-180")} />
            </button>

            {menuOpen ? (
              <div className="absolute right-0 top-[calc(100%+8px)] z-50 w-72 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl animate-fade-up dark:border-white/10 dark:bg-[#0b1626]">
                <div className="border-b border-slate-100 bg-gradient-to-br from-brand-50 to-white p-4 dark:border-white/[0.06] dark:from-brand-500/[0.08] dark:to-transparent">
                  <p className="text-sm font-semibold text-slate-900 dark:text-white">{user.name}</p>
                  <p className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">{user.email}</p>
                  <Badge className="mt-2 border-brand-500/20 bg-brand-500/10 text-brand-700 dark:text-brand-300" dot="bg-brand-500">
                    {role.label}
                  </Badge>
                </div>
                <div className="p-1.5">
                  <Link
                    href="/usuarios"
                    onClick={() => setMenuOpen(false)}
                    className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-white/[0.05]"
                  >
                    <Users className="h-4 w-4 text-slate-400" /> Usuarios y permisos
                  </Link>
                  <Link
                    href="/alertas"
                    onClick={() => setMenuOpen(false)}
                    className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-white/[0.05]"
                  >
                    <Settings2 className="h-4 w-4 text-slate-400" /> Umbrales de sensores
                  </Link>
                  <button
                    onClick={logout}
                    disabled={loggingOut}
                    className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-medium text-rose-600 hover:bg-rose-50 disabled:opacity-60 dark:text-rose-400 dark:hover:bg-rose-500/10"
                  >
                    <LogOut className="h-4 w-4" /> {loggingOut ? "Cerrando sesión…" : "Cerrar sesión"}
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </header>
  );
}
