"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, CheckCircle2, Crown, Eye, EyeOff, Gauge, Landmark, Leaf, Loader2, Lock, Mail, Radio, ShieldCheck, Wrench, Zap } from "lucide-react";
import { toast } from "sonner";
import { ROLES, type RoleKey } from "@/lib/constants";
import { NetworkBanner } from "@/components/network-banner";
import { cn } from "@/lib/utils";

const roleIcons: Record<RoleKey, React.ElementType> = {
  DIRECCION: Crown,
  ADMINISTRACION: Landmark,
  CIST: Wrench
};

export function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [quickRole, setQuickRole] = useState<RoleKey | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function login(nextEmail: string, nextPassword: string, role?: RoleKey) {
    setError(null);
    setLoading(true);
    if (role) setQuickRole(role);
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: nextEmail, password: nextPassword })
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data.error ?? "No se pudo iniciar sesión.");
        return;
      }
      toast.success(`Bienvenido(a), ${data.user.name.split(" ").slice(-2).join(" ")}`);
      router.replace("/dashboard");
      router.refresh();
    } catch {
      setError("No se pudo conectar con el servidor. Intente nuevamente.");
    } finally {
      setLoading(false);
      setQuickRole(null);
    }
  }

  function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!email.trim() || !password) {
      setError("Ingrese su correo institucional y contraseña.");
      return;
    }
    void login(email.trim(), password);
  }

  return (
    <div className="flex min-h-screen bg-[#f5f7fa] dark:bg-[#060c16]">
      <div className="relative hidden w-[48%] overflow-hidden bg-[#06101d] lg:flex xl:w-[52%]">
        <div className="absolute inset-0 bg-grid-dark opacity-60" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_25%_15%,rgba(16,185,129,0.24),transparent_48%),radial-gradient(ellipse_at_90%_90%,rgba(6,182,212,0.13),transparent_45%)]" />
        <div className="absolute -left-32 top-1/3 h-80 w-80 rounded-full bg-brand-500/10 blur-3xl" />
        <div className="relative z-10 flex w-full flex-col justify-between p-10 xl:p-14">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-brand-400 to-teal-600 shadow-[0_8px_24px_-8px_rgba(16,185,129,0.9)]">
              <Zap className="h-6 w-6 fill-white text-white" />
            </div>
            <div>
              <p className="text-xl font-bold tracking-tight text-white">
                Ener<span className="text-brand-400">Class</span>
              </p>
              <p className="text-[9.5px] font-medium uppercase tracking-[0.18em] text-slate-500">Gestión eléctrica institucional</p>
            </div>
          </div>

          <div className="max-w-xl">
            <span className="inline-flex items-center gap-2 rounded-full border border-brand-400/20 bg-brand-500/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.15em] text-brand-300">
              <Landmark className="h-3 w-3" /> I.E. N° 2001 «Leoncio Prado»
            </span>
            <h1 className="mt-5 text-balance text-[40px] font-bold leading-[1.08] tracking-tight text-white xl:text-[48px]">
              Control del consumo eléctrico.
              <br />
              <span className="bg-gradient-to-r from-brand-300 via-emerald-300 to-teal-200 bg-clip-text text-transparent">Más recursos para la enseñanza.</span>
            </h1>
            <p className="mt-5 max-w-md text-[14px] leading-relaxed text-slate-400">
              EnerClass registra el consumo de los cuatro tableros de la I.E. N° 2001 «Leoncio Prado», en Rímac, Lima. La información permite detectar gastos innecesarios y sustentar decisiones de mantenimiento y presupuesto.
            </p>

            <div className="mt-9 grid max-w-lg grid-cols-2 gap-3">
              {[
                { icon: Radio, label: "4 tableros conectados", value: "Sensores SCT-013" },
                { icon: Gauge, label: "Ahorro del periodo", value: "18% frente a la línea base" },
                { icon: Leaf, label: "Impacto ambiental", value: "ODS 7 y ODS 13" },
                { icon: ShieldCheck, label: "Avisos automáticos", value: "Permanentes, 24/7" }
              ].map((item) => (
                <div key={item.label} className="rounded-xl border border-white/[0.07] bg-white/[0.035] p-3.5 backdrop-blur-sm">
                  <item.icon className="h-4 w-4 text-brand-400" />
                  <p className="mt-2.5 text-[11px] font-semibold text-slate-200">{item.label}</p>
                  <p className="mt-0.5 text-[10px] text-slate-500">{item.value}</p>
                </div>
              ))}
            </div>

            <div className="mt-6 flex max-w-lg items-center gap-3 rounded-xl border border-white/[0.07] bg-gradient-to-r from-brand-500/[0.09] to-transparent p-4">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-500/15">
                <Zap className="h-4 w-4 text-brand-300" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Ahorro mensual estimado</p>
                  <p className="text-sm font-bold text-brand-300">S/ 486.20</p>
                </div>
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/10">
                  <div className="h-full w-[72%] rounded-full bg-gradient-to-r from-brand-500 to-emerald-300" />
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between text-[10px] text-slate-600">
            <span>© 2026 EnerClass · I.E. N° 2001 Leoncio Prado</span>
            <span className="inline-flex items-center gap-1.5">
              <span className="glow-dot" /> Servicio disponible
            </span>
          </div>
        </div>
      </div>

      <div className="relative flex w-full flex-col justify-center px-5 py-8 sm:px-10 lg:w-[52%] xl:w-[48%]">
        <div className="pointer-events-none absolute inset-0 bg-grid opacity-40 dark:bg-grid-dark dark:opacity-30" />
        <div className="relative mx-auto w-full max-w-[480px]">
          <div className="mb-8 flex items-center gap-3 lg:hidden">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-brand-400 to-teal-600">
              <Zap className="h-5 w-5 fill-white text-white" />
            </div>
            <div>
              <p className="text-lg font-bold tracking-tight text-slate-900 dark:text-white">
                Ener<span className="text-brand-600 dark:text-brand-400">Class</span>
              </p>
              <p className="text-[9px] uppercase tracking-[0.16em] text-slate-500">I.E. N° 2001 Leoncio Prado</p>
            </div>
          </div>

          <div className="mb-7">
            <p className="eyebrow mb-2">Acceso institucional</p>
            <h2 className="text-[28px] font-bold tracking-tight text-slate-900 dark:text-white sm:text-[32px]">Bienvenido a EnerClass</h2>
            <p className="mt-2 text-sm leading-relaxed text-slate-500 dark:text-slate-400">
              Ingrese con su cuenta institucional o use un perfil de demostración para recorrer el sistema.
            </p>
          </div>

          <NetworkBanner variant="login" />

          <div className="mb-6">
            <div className="mb-2.5 flex items-center justify-between">
              <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">Perfiles de demostración</p>
              <span className="rounded-full border border-brand-500/20 bg-brand-500/10 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-brand-700 dark:text-brand-300">
                1 clic
              </span>
            </div>
            <div className="space-y-2">
              {(Object.keys(ROLES) as RoleKey[]).map((key) => {
                const role = ROLES[key];
                const RoleIcon = roleIcons[key];
                const isActive = quickRole === key;
                return (
                  <button
                    key={key}
                    type="button"
                    disabled={loading}
                    onClick={() => void login(role.email, role.password, key)}
                    className={cn(
                      "group flex w-full items-center gap-3 rounded-xl border border-slate-200 bg-white p-3 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:border-brand-500/40 hover:shadow-md disabled:opacity-70 dark:border-white/[0.08] dark:bg-white/[0.03] dark:hover:border-brand-500/40",
                      isActive && "border-brand-500/50 ring-2 ring-brand-500/20"
                    )}
                  >
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-600 transition group-hover:bg-brand-500/10 group-hover:text-brand-600 dark:bg-white/[0.05] dark:text-slate-300 dark:group-hover:text-brand-400">
                      {isActive ? <Loader2 className="h-4 w-4 animate-spin" /> : <RoleIcon className="h-4 w-4" />}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[12px] font-semibold text-slate-800 dark:text-slate-100">{role.label}</span>
                      <span className="mt-0.5 block truncate font-mono text-[9.5px] text-slate-400 dark:text-slate-500">
                        {role.email} · {role.password}
                      </span>
                    </span>
                    <ArrowRight className="h-4 w-4 shrink-0 text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-brand-500 dark:text-slate-600" />
                  </button>
                );
              })}
            </div>
          </div>

          <div className="mb-5 flex items-center gap-3">
            <div className="h-px flex-1 bg-slate-200 dark:bg-white/10" />
            <span className="text-[9.5px] font-semibold uppercase tracking-wider text-slate-400">o ingrese con su cuenta</span>
            <div className="h-px flex-1 bg-slate-200 dark:bg-white/10" />
          </div>

          <form onSubmit={onSubmit} className="space-y-4">
            <div>
              <label htmlFor="email" className="label">
                Correo institucional
              </label>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="usuario@leoncioprado.edu.pe"
                  className="input h-11 pl-10"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between">
                <label htmlFor="password" className="label">
                  Contraseña
                </label>
                <button
                  type="button"
                  onClick={() => toast.info("Solicite el restablecimiento al responsable CIST del plantel.")}
                  className="mb-1.5 text-[10px] font-semibold text-brand-600 hover:underline dark:text-brand-400"
                >
                  ¿Olvidó su contraseña?
                </button>
              </div>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="••••••••••••"
                  className="input h-11 px-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((value) => !value)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                  aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {error ? (
              <div className="rounded-xl border border-rose-500/20 bg-rose-500/[0.07] px-3.5 py-2.5 text-[11.5px] font-medium text-rose-600 dark:text-rose-400">
                {error}
              </div>
            ) : null}

            <label className="flex cursor-pointer items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400">
              <input type="checkbox" defaultChecked className="h-3.5 w-3.5 rounded border-slate-300 text-brand-600 focus:ring-brand-500 dark:border-white/20 dark:bg-white/5" />
              Mantener sesión activa por 7 días
            </label>

            <button type="submit" disabled={loading} className="btn-primary h-11 w-full text-[13px]">
              {loading && !quickRole ? <Loader2 className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4" />}
              {loading && !quickRole ? "Verificando credenciales…" : "Ingresar al sistema"}
            </button>
          </form>

          <div className="mt-6 flex items-center justify-center gap-1.5 text-[9.5px] text-slate-400 dark:text-slate-600">
            <CheckCircle2 className="h-3 w-3 text-brand-500" />
            Conexión segura · Sistema institucional EnerClass v1.0 · 2026
          </div>
        </div>
      </div>
    </div>
  );
}
