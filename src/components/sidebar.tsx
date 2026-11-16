"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { X, Zap, ShieldCheck, ArrowUpRight } from "lucide-react";
import { NAV_ITEMS, ROLES, type RoleKey } from "@/lib/constants";
import { cn, initials } from "@/lib/utils";
import { Icon } from "@/components/icon";
import type { SessionUser } from "@/lib/types";
import { Progress } from "@/components/ui";

export function Sidebar({ user, open, onClose }: { user: SessionUser; open: boolean; onClose: () => void }) {
  const pathname = usePathname();
  const sections = Array.from(new Set(NAV_ITEMS.map((item) => item.section)));
  const role = ROLES[user.role as RoleKey] ?? ROLES.DIRECCION;

  const content = (
    <div className="flex h-full flex-col">
      <div className="flex h-[72px] shrink-0 items-center justify-between gap-3 border-b border-white/[0.06] px-5">
        <Link href="/dashboard" onClick={onClose} className="group flex items-center gap-3">
          <div className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-brand-400 to-teal-600 shadow-[0_8px_20px_-8px_rgba(16,185,129,0.8)]">
            <Zap className="h-5 w-5 fill-white text-white" />
            <span className="absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full border-2 border-[#07101d] bg-emerald-300" />
          </div>
          <div>
            <p className="text-[17px] font-bold leading-none tracking-tight text-white">
              Ener<span className="text-brand-400">Class</span>
            </p>
            <p className="mt-1 text-[9.5px] font-medium uppercase tracking-[0.16em] text-slate-500">Gestión eléctrica</p>
          </div>
        </Link>
        <button onClick={onClose} className="rounded-lg p-1.5 text-slate-400 hover:bg-white/10 hover:text-white lg:hidden" aria-label="Cerrar menú">
          <X className="h-5 w-5" />
        </button>
      </div>

      <div className="mx-4 mt-4 rounded-xl border border-white/[0.06] bg-white/[0.03] p-3">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand-500/15 text-xs font-bold text-brand-300">
            {initials(user.name)}
          </div>
          <div className="min-w-0">
            <p className="truncate text-[12px] font-semibold text-slate-200">{user.name}</p>
            <p className="truncate text-[10px] text-slate-500">{role.short}</p>
          </div>
        </div>
      </div>

      <nav className="scrollbar-thin flex-1 overflow-y-auto px-3 py-4">
        {sections.map((section) => (
          <div key={section} className="mb-4">
            <p className="mb-1.5 px-3 text-[9.5px] font-bold uppercase tracking-[0.18em] text-slate-600">{section}</p>
            <div className="space-y-0.5">
              {NAV_ITEMS.filter((item) => item.section === section).map((item) => {
                const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={onClose}
                    className={cn(
                      "group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] font-medium transition-all",
                      active
                        ? "bg-gradient-to-r from-brand-500/15 to-brand-500/[0.03] text-white shadow-[inset_2px_0_0_#10b981]"
                        : "text-slate-400 hover:bg-white/[0.045] hover:text-slate-100"
                    )}
                  >
                    <Icon
                      name={item.icon}
                      className={cn("h-[17px] w-[17px] shrink-0 transition", active ? "text-brand-400" : "text-slate-500 group-hover:text-slate-300")}
                      strokeWidth={active ? 2.2 : 1.9}
                    />
                    <span className="truncate">{item.label}</span>
                    {active ? <span className="ml-auto h-1.5 w-1.5 rounded-full bg-brand-400" /> : null}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className="shrink-0 border-t border-white/[0.06] p-4">
        <div className="rounded-xl border border-brand-400/15 bg-gradient-to-br from-brand-500/10 to-transparent p-3.5">
          <div className="flex items-center justify-between">
            <p className="text-[10px] font-bold uppercase tracking-wider text-brand-300">Meta de ahorro</p>
            <span className="text-xs font-bold text-white">18%</span>
          </div>
          <Progress value={18} className="mt-2.5 h-1 bg-white/10" barClassName="bg-gradient-to-r from-brand-500 to-emerald-300" />
          <div className="mt-3 flex items-center gap-2 text-[10px] text-slate-400">
            <span className="glow-dot" />
            <span>4 de 4 sensores activos</span>
          </div>
        </div>
        <div className="mt-3 flex items-center justify-between px-1 text-[9.5px] text-slate-600">
          <span className="inline-flex items-center gap-1">
            <ShieldCheck className="h-3 w-3" /> v1.0 · 2026
          </span>
          <span className="inline-flex items-center gap-0.5 text-slate-500">
            Leoncio Prado <ArrowUpRight className="h-2.5 w-2.5" />
          </span>
        </div>
      </div>
    </div>
  );

  return (
    <>
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-72 flex-col overflow-hidden bg-[#07101d] lg:flex">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(16,185,129,0.12),transparent_55%)]" />
        <div className="relative flex h-full flex-col">{content}</div>
      </aside>

      <div className={cn("fixed inset-0 z-[90] lg:hidden", open ? "pointer-events-auto" : "pointer-events-none")}>
        <div
          className={cn("absolute inset-0 bg-slate-950/60 backdrop-blur-sm transition-opacity", open ? "opacity-100" : "opacity-0")}
          onClick={onClose}
          aria-hidden
        />
        <aside
          className={cn(
            "absolute inset-y-0 left-0 w-[300px] max-w-[86vw] overflow-hidden bg-[#07101d] shadow-2xl transition-transform duration-300 ease-out",
            open ? "translate-x-0" : "-translate-x-full"
          )}
        >
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(16,185,129,0.12),transparent_55%)]" />
          <div className="relative h-full">{content}</div>
        </aside>
      </div>
    </>
  );
}
