"use client";

import { useMemo, useState, type FormEvent } from "react";
import {
  AlertTriangle,
  Check,
  Crown,
  Eye,
  EyeOff,
  Landmark,
  Mail,
  Pencil,
  Plus,
  RefreshCcw,
  Search,
  ShieldCheck,
  Trash2,
  UserCheck,
  UserRound,
  Users,
  UserX,
  Wrench,
  X
} from "lucide-react";
import { toast } from "sonner";
import { useApiData } from "@/hooks/use-api-data";
import { Badge, Button, Card, CardHeader, EmptyState, ErrorState, Modal, PageHeader, Skeleton } from "@/components/ui";
import { ROLES, type RoleKey } from "@/lib/constants";
import { apiFetch } from "@/lib/client";
import type { UserItem } from "@/lib/types";
import { cn, formatDate, initials } from "@/lib/utils";

type UsersResponse = {
  users: UserItem[];
  currentUserId: string;
  canManage: boolean;
};

const ROLE_THEME: Record<
  RoleKey,
  {
    icon: React.ElementType;
    badge: string;
    avatar: string;
    iconWrap: string;
    border: string;
  }
> = {
  DIRECCION: {
    icon: Crown,
    badge: "border-brand-500/20 bg-brand-500/10 text-brand-700 dark:text-brand-400",
    avatar: "bg-brand-500/10 text-brand-600 dark:text-brand-400",
    iconWrap: "bg-brand-500/10 text-brand-600 dark:text-brand-400",
    border: "border-brand-500/30"
  },
  ADMINISTRACION: {
    icon: Landmark,
    badge: "border-amber-500/20 bg-amber-500/10 text-amber-700 dark:text-amber-400",
    avatar: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
    iconWrap: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
    border: "border-amber-500/30"
  },
  CIST: {
    icon: Wrench,
    badge: "border-cyan-500/20 bg-cyan-500/10 text-cyan-700 dark:text-cyan-400",
    avatar: "bg-cyan-500/10 text-cyan-600 dark:text-cyan-400",
    iconWrap: "bg-cyan-500/10 text-cyan-600 dark:text-cyan-400",
    border: "border-cyan-500/30"
  }
};

const PERMISSIONS: { label: string; detail: string; roles: RoleKey[] }[] = [
  {
    label: "Consultar el panel principal y los indicadores",
    detail: "Consumo en vivo, indicadores y distribución por tablero.",
    roles: ["DIRECCION", "ADMINISTRACION", "CIST"]
  },
  {
    label: "Gestionar alertas",
    detail: "Revisar, marcar en revisión y resolver eventos.",
    roles: ["DIRECCION", "ADMINISTRACION", "CIST"]
  },
  {
    label: "Editar umbrales eléctricos",
    detail: "Límites de amperaje, tensión y consumo nocturno.",
    roles: ["DIRECCION", "CIST"]
  },
  {
    label: "Revisar consumo fuera de horario",
    detail: "Registrar la revisión física de los casos detectados.",
    roles: ["DIRECCION", "ADMINISTRACION", "CIST"]
  },
  {
    label: "Descargar reportes PDF",
    detail: "Informes para Dirección, Tesorería y mantenimiento.",
    roles: ["DIRECCION", "ADMINISTRACION", "CIST"]
  },
  {
    label: "Conciliar facturación y tarifas",
    detail: "Revisión de recibos, IGV y ahorro del presupuesto.",
    roles: ["DIRECCION", "ADMINISTRACION"]
  },
  {
    label: "Configurar sensores y equipos",
    detail: "Estado de sensores SCT-013, calibración y señal Wi-Fi.",
    roles: ["DIRECCION", "CIST"]
  },
  {
    label: "Administrar usuarios y roles",
    detail: "Crear cuentas, editar roles, activar o eliminar accesos.",
    roles: ["DIRECCION", "CIST"]
  }
];

type FormState = {
  name: string;
  email: string;
  role: RoleKey;
  position: string;
  password: string;
  active: boolean;
};

const EMPTY_FORM: FormState = {
  name: "",
  email: "",
  role: "CIST",
  position: "",
  password: "",
  active: true
};

export default function UsersPage() {
  const { data, loading, error, refresh, refreshing } = useApiData<UsersResponse>("/api/users", { interval: 0 });
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<RoleKey | "TODOS">("TODOS");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<UserItem | null>(null);
  const [deleting, setDeleting] = useState<UserItem | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [showPassword, setShowPassword] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deletingBusy, setDeletingBusy] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const users = data?.users ?? [];
  const canManage = data?.canManage ?? false;
  const currentUserId = data?.currentUserId ?? "";

  const roleStats = (Object.keys(ROLES) as RoleKey[]).map((key) => {
    const assigned = users.filter((user) => user.role === key);
    return {
      key,
      label: ROLES[key].label,
      short: ROLES[key].short,
      description: ROLES[key].description,
      total: assigned.length,
      active: assigned.filter((user) => user.active).length,
      ...ROLE_THEME[key]
    };
  });

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return users.filter((user) => {
      const matchesRole = roleFilter === "TODOS" || user.role === roleFilter;
      const matchesTerm =
        !term ||
        user.name.toLowerCase().includes(term) ||
        user.email.toLowerCase().includes(term) ||
        user.position.toLowerCase().includes(term);
      return matchesRole && matchesTerm;
    });
  }, [users, search, roleFilter]);

  const activeCount = users.filter((user) => user.active).length;

  function openCreate() {
    setEditing(null);
    setForm(EMPTY_FORM);
    setFormError(null);
    setShowPassword(false);
    setModalOpen(true);
  }

  function openEdit(user: UserItem) {
    setEditing(user);
    setForm({
      name: user.name,
      email: user.email,
      role: user.role,
      position: user.position,
      password: "",
      active: user.active
    });
    setFormError(null);
    setShowPassword(false);
    setModalOpen(true);
  }

  function closeModal() {
    if (saving) return;
    setModalOpen(false);
    setEditing(null);
    setFormError(null);
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);

    if (form.name.trim().length < 4) {
      setFormError("El nombre completo debe tener al menos 4 caracteres.");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
      setFormError("Ingrese un correo electrónico válido.");
      return;
    }
    if (!editing && form.password.length < 8) {
      setFormError("La contraseña inicial debe tener al menos 8 caracteres.");
      return;
    }
    if (editing && form.password && form.password.length < 8) {
      setFormError("La nueva contraseña debe tener al menos 8 caracteres.");
      return;
    }

    setSaving(true);
    try {
      if (editing) {
        const payload: Record<string, unknown> = {
          name: form.name.trim(),
          email: form.email.trim().toLowerCase(),
          role: form.role,
          position: form.position.trim(),
          active: form.active
        };
        if (form.password) payload.password = form.password;
        await apiFetch(`/api/users/${editing.id}`, { method: "PATCH", body: JSON.stringify(payload) });
        toast.success("Usuario actualizado correctamente.");
      } else {
        await apiFetch("/api/users", {
          method: "POST",
          body: JSON.stringify({
            name: form.name.trim(),
            email: form.email.trim().toLowerCase(),
            role: form.role,
            position: form.position.trim(),
            password: form.password,
            active: form.active
          })
        });
        toast.success("Usuario creado correctamente. Ya puede iniciar sesión.");
      }
      setModalOpen(false);
      setEditing(null);
      await refresh();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "No se pudo guardar el usuario.");
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(user: UserItem) {
    setTogglingId(user.id);
    try {
      await apiFetch(`/api/users/${user.id}`, {
        method: "PATCH",
        body: JSON.stringify({ active: !user.active })
      });
      toast.success(user.active ? "Cuenta desactivada. El usuario ya no podrá ingresar." : "Cuenta reactivada correctamente.");
      await refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No se pudo cambiar el estado de la cuenta.");
    } finally {
      setTogglingId(null);
    }
  }

  async function confirmDelete() {
    if (!deleting) return;
    setDeletingBusy(true);
    try {
      await apiFetch(`/api/users/${deleting.id}`, { method: "DELETE" });
      toast.success("Usuario eliminado del directorio institucional.");
      setDeleting(null);
      await refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No se pudo eliminar el usuario.");
    } finally {
      setDeletingBusy(false);
    }
  }

  return (
    <div className="animate-fade-up">
      <PageHeader
        eyebrow="Seguridad y control de acceso"
        title="Usuarios, roles y permisos"
        description="Consulte las cuentas que acceden a EnerClass y la matriz de permisos. Cada rol define qué información puede revisar o modificar."
        icon={<Users className="h-5 w-5" />}
        actions={
          <>
            <Badge className="h-8 border-brand-500/20 bg-brand-500/10 px-3 text-brand-700 dark:text-brand-400" dot="bg-brand-500">
              {data ? `${users.length} cuentas · ${activeCount} activas` : "Cargando cuentas"}
            </Badge>
            <Button variant="secondary" size="sm" onClick={() => void refresh()} disabled={refreshing}>
              <RefreshCcw className={cn("h-3.5 w-3.5", refreshing && "animate-spin")} /> Actualizar
            </Button>
            {canManage ? (
              <Button size="sm" onClick={openCreate}>
                <Plus className="h-3.5 w-3.5" /> Nuevo usuario
              </Button>
            ) : null}
          </>
        }
      />

      {error && !data ? (
        <ErrorState message={error} onRetry={() => void refresh()} />
      ) : (
        <>
          <div className="grid gap-4 lg:grid-cols-3">
            {roleStats.map((role) => {
              const Icon = role.icon;
              const selected = roleFilter === role.key;
              return (
                <button
                  key={role.key}
                  type="button"
                  onClick={() => setRoleFilter(selected ? "TODOS" : role.key)}
                  className={cn(
                    "card card-pad card-hover group text-left transition",
                    selected && `ring-2 ring-offset-2 ring-offset-white dark:ring-offset-[#07101d] ${role.border}`
                  )}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-xl", role.iconWrap)}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <Badge className={cn("border", role.badge)}>{role.short}</Badge>
                  </div>
                  <p className="mt-3.5 text-sm font-semibold text-slate-900 dark:text-white">{role.label}</p>
                  <p className="mt-1.5 min-h-[48px] text-[10.5px] leading-relaxed text-slate-500 dark:text-slate-400">{role.description}</p>
                  <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-3 dark:border-white/[0.06]">
                    <div className="flex items-center gap-1.5 text-[10px] text-slate-400">
                      <UserCheck className="h-3 w-3" />
                      {data ? (
                        <span>
                          <strong className="font-semibold text-slate-600 dark:text-slate-300">{role.active}</strong> {role.active === 1 ? "activo" : "activos"} de {role.total}
                        </span>
                      ) : (
                        <span>Cargando cuentas…</span>
                      )}
                    </div>
                    <span className={cn("text-[10px] font-semibold", selected ? "text-brand-600 dark:text-brand-400" : "text-slate-400 group-hover:text-brand-600 dark:group-hover:text-brand-400")}>
                      {selected ? "Filtro aplicado" : "Filtrar tabla"}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>

          <div className="mt-5 flex items-start gap-2.5 rounded-xl border border-brand-500/20 bg-brand-500/[0.04] px-4 py-3 text-[10.5px] leading-relaxed text-slate-600 dark:text-slate-300">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-brand-600 dark:text-brand-400" />
            <p>
              {!data
                ? "Verificando los permisos asociados a su cuenta institucional…"
                : canManage
                  ? "Solo Dirección y Soporte CIST pueden crear, editar o desactivar cuentas. Las cuentas desactivadas conservan su historial, pero no pueden iniciar sesión. No es posible desactivar o eliminar la propia cuenta."
                  : "Su rol tiene acceso de solo lectura al directorio. Solo Dirección y Soporte CIST pueden crear, editar o desactivar cuentas de usuario."}
            </p>
          </div>

          <Card className="mt-5 overflow-hidden">
            <CardHeader
              title={`Directorio institucional${data ? ` (${filtered.length})` : ""}`}
              description="Cuentas habilitadas para el seguimiento del consumo"
              icon={<UserRound className="h-4 w-4" />}
              action={
                <div className="flex flex-wrap items-center gap-2">
                  <div className="relative">
                    <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                    <input
                      type="search"
                      value={search}
                      onChange={(event) => setSearch(event.target.value)}
                      placeholder="Buscar por nombre o correo…"
                      className="input h-9 w-52 pl-8 text-[11px] sm:w-56"
                    />
                  </div>
                  <select
                    value={roleFilter}
                    onChange={(event) => setRoleFilter(event.target.value as RoleKey | "TODOS")}
                    className="input h-9 w-auto text-[11px]"
                  >
                    <option value="TODOS">Todos los roles</option>
                    {(Object.keys(ROLES) as RoleKey[]).map((key) => (
                      <option key={key} value={key}>
                        {ROLES[key].short}
                      </option>
                    ))}
                  </select>
                </div>
              }
            />

            {loading && !data ? (
              <div className="space-y-3 p-5">
                {[0, 1, 2, 3].map((item) => (
                  <div key={item} className="flex items-center gap-3">
                    <Skeleton className="h-10 w-10 rounded-full" />
                    <div className="flex-1 space-y-1.5">
                      <Skeleton className="h-3 w-1/3" />
                      <Skeleton className="h-2.5 w-1/4" />
                    </div>
                    <Skeleton className="h-7 w-20" />
                  </div>
                ))}
              </div>
            ) : filtered.length === 0 ? (
              <EmptyState
                icon={<Users className="h-5 w-5" />}
                title="No se encontraron cuentas"
                description="Ajuste la búsqueda o el filtro de rol para ver otras cuentas del directorio."
                action={
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => {
                      setSearch("");
                      setRoleFilter("TODOS");
                    }}
                  >
                    Limpiar filtros
                  </Button>
                }
              />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[820px] border-collapse text-left">
                  <thead>
                    <tr className="border-b border-slate-100 text-[9px] font-bold uppercase tracking-wider text-slate-400 dark:border-white/[0.06]">
                      <th className="px-5 py-2.5 sm:px-6">Usuario</th>
                      <th className="px-4 py-2.5">Rol institucional</th>
                      <th className="px-4 py-2.5">Cargo</th>
                      <th className="px-4 py-2.5">Estado</th>
                      <th className="px-4 py-2.5">Alta</th>
                      <th className="px-5 py-2.5 text-right sm:px-6">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-white/[0.05]">
                    {filtered.map((user) => {
                      const theme = ROLE_THEME[user.role];
                      const Icon = theme.icon;
                      const isSelf = user.id === currentUserId;
                      const isToggling = togglingId === user.id;
                      return (
                        <tr key={user.id} className={cn("group transition hover:bg-slate-50/80 dark:hover:bg-white/[0.02]", !user.active && "opacity-60")}>
                          <td className="px-5 py-3.5 sm:px-6">
                            <div className="flex items-center gap-3">
                              <div className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[10px] font-bold", theme.avatar)}>
                                {initials(user.name)}
                              </div>
                              <div className="min-w-0">
                                <div className="flex items-center gap-1.5">
                                  <p className="truncate text-[12px] font-semibold text-slate-800 dark:text-slate-100">{user.name}</p>
                                  {isSelf ? <span className="rounded bg-brand-500/10 px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-wide text-brand-600 dark:text-brand-400">Tú</span> : null}
                                </div>
                                <p className="mt-0.5 flex items-center gap-1 text-[10px] text-slate-400">
                                  <Mail className="h-2.5 w-2.5 shrink-0" /> {user.email}
                                </p>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3.5">
                            <Badge className={cn("border", theme.badge)}>
                              <Icon className="h-3 w-3" /> {ROLES[user.role].short}
                            </Badge>
                          </td>
                          <td className="px-4 py-3.5">
                            <p className="max-w-[190px] text-[10.5px] leading-relaxed text-slate-500 dark:text-slate-400">{user.position}</p>
                          </td>
                          <td className="px-4 py-3.5">
                            <button
                              type="button"
                              onClick={() => void toggleActive(user)}
                              disabled={!canManage || isSelf || isToggling}
                              aria-pressed={user.active}
                              aria-label={user.active ? `Desactivar cuenta de ${user.name}` : `Activar cuenta de ${user.name}`}
                              className={cn(
                                "inline-flex items-center gap-1.5 rounded-full px-1.5 py-1 transition",
                                canManage && !isSelf ? "hover:bg-slate-100 dark:hover:bg-white/[0.06]" : "cursor-not-allowed",
                                isToggling && "animate-pulse"
                              )}
                              title={isSelf ? "No puede desactivar su propia cuenta" : canManage ? undefined : "Solo Dirección o CIST pueden cambiar el estado"}
                            >
                              <span className={cn("relative h-4 w-7 rounded-full transition-colors", user.active ? "bg-emerald-500" : "bg-slate-300 dark:bg-white/20")}>
                                <span
                                  className={cn(
                                    "absolute top-0.5 h-3 w-3 rounded-full bg-white shadow-sm transition-all",
                                    user.active ? "left-3.5" : "left-0.5"
                                  )}
                                />
                              </span>
                              <span className={cn("text-[9.5px] font-semibold", user.active ? "text-emerald-600 dark:text-emerald-400" : "text-slate-400")}>
                                {user.active ? "Activo" : "Inactivo"}
                              </span>
                            </button>
                          </td>
                          <td className="whitespace-nowrap px-4 py-3.5 text-[10px] text-slate-400">{formatDate(user.createdAt)}</td>
                          <td className="px-5 py-3.5 sm:px-6">
                            <div className="flex items-center justify-end gap-1">
                              <button
                                type="button"
                                onClick={() => openEdit(user)}
                                disabled={!canManage}
                                aria-label={`Editar a ${user.name}`}
                                title="Editar usuario"
                                className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 disabled:cursor-not-allowed disabled:opacity-40 dark:hover:bg-white/10 dark:hover:text-white"
                              >
                                <Pencil className="h-3.5 w-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => setDeleting(user)}
                                disabled={!canManage || isSelf}
                                aria-label={`Eliminar a ${user.name}`}
                                title={isSelf ? "No puede eliminar su propia cuenta" : "Eliminar usuario"}
                                className="rounded-lg p-1.5 text-slate-400 transition hover:bg-rose-500/10 hover:text-rose-500 disabled:cursor-not-allowed disabled:opacity-40"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            <div className="flex flex-col gap-1 border-t border-slate-100 px-5 py-3 text-[9.5px] text-slate-400 dark:border-white/[0.06] sm:flex-row sm:items-center sm:justify-between sm:px-6">
              <span>
                Mostrando {filtered.length} de {users.length} cuentas registradas
              </span>
              <span className="inline-flex items-center gap-1">
                <UserX className="h-3 w-3" /> {users.length - activeCount} cuentas inactivas sin acceso al sistema
              </span>
            </div>
          </Card>

          <Card className="mt-5 overflow-hidden">
            <CardHeader
              title="Matriz de permisos por rol"
              description="Alcance funcional de cada perfil institucional · control RBAC"
              icon={<ShieldCheck className="h-4 w-4" />}
              action={
                <Badge className="border-slate-200 bg-white text-slate-500 dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-400">
                  Validado en servidor
                </Badge>
              }
            />
            <div className="overflow-x-auto">
              <table className="w-full min-w-[680px] border-collapse text-left">
                <thead>
                  <tr className="border-b border-slate-100 dark:border-white/[0.06]">
                    <th className="px-5 py-3 text-[9px] font-bold uppercase tracking-wider text-slate-400 sm:px-6">Permiso</th>
                    {(Object.keys(ROLES) as RoleKey[]).map((key) => {
                      const Icon = ROLE_THEME[key].icon;
                      return (
                        <th key={key} className="w-[130px] px-4 py-3 text-center">
                          <span className="inline-flex flex-col items-center gap-1.5">
                            <span className={cn("flex h-7 w-7 items-center justify-center rounded-lg", ROLE_THEME[key].iconWrap)}>
                              <Icon className="h-3.5 w-3.5" />
                            </span>
                            <span className="text-[9px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">{ROLES[key].short}</span>
                          </span>
                        </th>
                      );
                    })}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-white/[0.05]">
                  {PERMISSIONS.map((permission) => (
                    <tr key={permission.label} className="transition hover:bg-slate-50/80 dark:hover:bg-white/[0.02]">
                      <td className="px-5 py-3 sm:px-6">
                        <p className="text-[11px] font-medium text-slate-700 dark:text-slate-200">{permission.label}</p>
                        <p className="mt-0.5 text-[9.5px] leading-relaxed text-slate-400">{permission.detail}</p>
                      </td>
                      {(Object.keys(ROLES) as RoleKey[]).map((key) => {
                        const allowed = permission.roles.includes(key);
                        return (
                          <td key={key} className="px-4 py-3 text-center">
                            <span
                              className={cn(
                                "inline-flex h-6 w-6 items-center justify-center rounded-full",
                                allowed
                                  ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                                  : "bg-slate-100 text-slate-300 dark:bg-white/[0.04] dark:text-slate-600"
                              )}
                              title={allowed ? "Permitido" : "No permitido"}
                              aria-label={allowed ? "Permitido" : "No permitido"}
                            >
                              {allowed ? <Check className="h-3.5 w-3.5" /> : <X className="h-3 w-3" />}
                            </span>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex items-center gap-2 border-t border-slate-100 px-5 py-3 text-[9.5px] text-slate-400 dark:border-white/[0.06] sm:px-6">
              <ShieldCheck className="h-3 w-3 text-brand-500" />
              Los permisos de edición y administración se verifican en cada solicitud al servidor, no solo en la interfaz.
            </div>
          </Card>
        </>
      )}

      <Modal
        open={modalOpen}
        onClose={closeModal}
        title={editing ? "Editar usuario institucional" : "Registrar nuevo usuario"}
        description={editing ? `Actualice los datos de acceso de ${editing.name}.` : "La cuenta podrá iniciar sesión con el correo y la contraseña definidos."}
        size="lg"
        footer={
          <>
            <Button type="button" variant="ghost" onClick={closeModal} disabled={saving}>
              Cancelar
            </Button>
            <Button type="submit" form="user-form" loading={saving}>
              {saving ? "Guardando…" : editing ? "Guardar cambios" : "Crear usuario"}
            </Button>
          </>
        }
      >
        <form id="user-form" onSubmit={submit} className="space-y-4">
          {formError ? (
            <div className="flex items-start gap-2 rounded-xl border border-rose-500/20 bg-rose-500/[0.06] px-3.5 py-2.5 text-[11px] font-medium text-rose-600 dark:text-rose-400">
              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" /> {formError}
            </div>
          ) : null}

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="label" htmlFor="user-name">
                Nombre completo
              </label>
              <input
                id="user-name"
                value={form.name}
                onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
                placeholder="Ej. Mg. Ana María Torres Ríos"
                className="input"
                autoComplete="name"
                required
              />
            </div>
            <div>
              <label className="label" htmlFor="user-email">
                Correo institucional
              </label>
              <input
                id="user-email"
                type="email"
                value={form.email}
                onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
                placeholder="usuario@leoncioprado.edu.pe"
                className="input"
                autoComplete="email"
                required
              />
            </div>
            <div>
              <label className="label" htmlFor="user-role">
                Rol institucional
              </label>
              <select
                id="user-role"
                value={form.role}
                onChange={(event) => setForm((current) => ({ ...current, role: event.target.value as RoleKey }))}
                className="input"
              >
                {(Object.keys(ROLES) as RoleKey[]).map((key) => (
                  <option key={key} value={key}>
                    {ROLES[key].label}
                  </option>
                ))}
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className="label" htmlFor="user-position">
                Cargo o función
              </label>
              <input
                id="user-position"
                value={form.position}
                onChange={(event) => setForm((current) => ({ ...current, position: event.target.value }))}
                placeholder={ROLES[form.role].position}
                className="input"
              />
              <p className="mt-1.5 text-[9.5px] text-slate-400">Si se deja vacío, se asignará el cargo institucional por defecto del rol.</p>
            </div>
            <div className="sm:col-span-2">
              <label className="label" htmlFor="user-password">
                {editing ? "Nueva contraseña (opcional)" : "Contraseña inicial"}
              </label>
              <div className="relative">
                <input
                  id="user-password"
                  type={showPassword ? "text" : "password"}
                  value={form.password}
                  onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))}
                  placeholder={editing ? "Dejar en blanco para conservar la actual" : "Mínimo 8 caracteres"}
                  className="input pr-10"
                  autoComplete="new-password"
                  required={!editing}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((value) => !value)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-white/10 dark:hover:text-white"
                  aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                >
                  {showPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                </button>
              </div>
              <p className="mt-1.5 text-[9.5px] text-slate-400">
                {editing
                  ? "Deje el campo vacío para mantener la contraseña actual. La nueva clave debe tener al menos 8 caracteres."
                  : "La contraseña debe tener al menos 8 caracteres y se almacena cifrada con bcrypt."}
              </p>
            </div>
          </div>

          <label className="flex cursor-pointer items-start gap-2.5 rounded-xl border border-slate-200 p-3 dark:border-white/[0.08]">
            <input
              type="checkbox"
              checked={form.active}
              onChange={(event) => setForm((current) => ({ ...current, active: event.target.checked }))}
              className="mt-0.5 h-3.5 w-3.5 accent-emerald-600"
            />
            <span>
              <span className="block text-[11px] font-semibold text-slate-700 dark:text-slate-200">Cuenta activa</span>
              <span className="mt-0.5 block text-[9.5px] leading-relaxed text-slate-400">Si se desactiva, el usuario conservará su historial pero no podrá iniciar sesión.</span>
            </span>
          </label>
        </form>
      </Modal>

      <Modal
        open={Boolean(deleting)}
        onClose={() => (deletingBusy ? undefined : setDeleting(null))}
        title="Eliminar usuario"
        description="Esta acción retira la cuenta del directorio institucional de forma permanente."
        size="sm"
        footer={
          <>
            <Button variant="ghost" onClick={() => setDeleting(null)} disabled={deletingBusy}>
              Cancelar
            </Button>
            <Button variant="danger" onClick={() => void confirmDelete()} loading={deletingBusy}>
              <Trash2 className="h-3.5 w-3.5" /> Eliminar cuenta
            </Button>
          </>
        }
      >
        {deleting ? (
          <div className="space-y-4">
            <div className="flex items-start gap-3 rounded-xl border border-rose-500/20 bg-rose-500/[0.05] p-3.5">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-rose-500/10 text-rose-500">
                <AlertTriangle className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <p className="text-[12px] font-semibold text-slate-800 dark:text-slate-100">{deleting.name}</p>
                <p className="mt-0.5 truncate text-[10px] text-slate-500 dark:text-slate-400">{deleting.email}</p>
                <p className="mt-1 text-[9.5px] text-rose-500">{ROLES[deleting.role].label}</p>
              </div>
            </div>
            <p className="text-[10.5px] leading-relaxed text-slate-500 dark:text-slate-400">
              ¿Confirma que desea eliminar esta cuenta? El usuario perderá el acceso inmediatamente. Si solo necesita suspender el acceso temporalmente, considere desactivar la cuenta en lugar de eliminarla.
            </p>
          </div>
        ) : null}
      </Modal>
    </div>
  );
}
