import React, { useEffect, useState } from 'react';
import { ZoomableAvatar } from './ZoomableAvatar';
import { CalendarClock, CheckCircle2, ChevronDown, KeyRound, Loader2, MessageCircle, Save, Shield, UserPlus, Users, XCircle } from 'lucide-react';
import type { ClientProfile } from '../data/mockData';
import { createUserInApi, listUsersFromApi, resetUserPasswordInApi, updateUserAccessInApi, updateUserStatusInApi } from '../services/userService';
import { cleanupDemoDataInApi } from '../services/maintenanceService';

type UserStatus = 'pending' | 'active' | 'suspended' | 'rejected';

type AccessDraft = {
  status: UserStatus;
  pendingAt: string;
  activatedAt: string;
  suspendedAt: string;
  statusChangedAt: string;
  accessNote: string;
};

function toDateTimeInput(value?: string): string {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value.slice(0, 16);
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 16);
}

function fromDateTimeInput(value: string): string | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function accessDraftFromUser(user: ClientProfile): AccessDraft {
  return {
    status: (user.status || 'pending') as UserStatus,
    pendingAt: toDateTimeInput(user.pendingAt),
    activatedAt: toDateTimeInput(user.activatedAt),
    suspendedAt: toDateTimeInput(user.suspendedAt),
    statusChangedAt: toDateTimeInput(user.statusChangedAt),
    accessNote: user.accessNote || '',
  };
}


function normalizePhoneForWhatsapp(phone?: string | null): string {
  if (!phone) return '';
  return phone.replace(/[^0-9]/g, '');
}

function whatsappLink(phone?: string | null, name?: string): string | undefined {
  const digits = normalizePhoneForWhatsapp(phone);
  if (!digits || digits.length < 7) return undefined;

  const text = encodeURIComponent(
    `Hola${name ? ` ${name}` : ''}, soy del equipo Imperial Fitness. Te escribo para coordinar tu acceso y seguimiento.`,
  );
  return `https://wa.me/${digits}?text=${text}`;
}

export const UserManagementView: React.FC = () => {
  const [users, setUsers] = useState<ClientProfile[]>([]);
  const [statusFilter, setStatusFilter] = useState<UserStatus | 'all'>('pending');
  const [msg, setMsg] = useState('');
  const [loading, setLoading] = useState(false);
  const [passwordDrafts, setPasswordDrafts] = useState<Record<string, string>>({});
  const [passwordLoadingId, setPasswordLoadingId] = useState<string | null>(null);
  const [accessDrafts, setAccessDrafts] = useState<Record<string, AccessDraft>>({});
  const [accessLoadingId, setAccessLoadingId] = useState<string | null>(null);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'trainer' | 'admin'>('trainer');

  const loadUsers = async () => {
    setLoading(true);
    setMsg('');

    try {
      const data = await listUsersFromApi();
      setUsers(data);
    } catch {
      setMsg('No se pudo cargar la lista de usuarios. Intenta nuevamente.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const changeStatus = async (userId: string, status: UserStatus) => {
    try {
      const updated = await updateUserStatusInApi(userId, status);
      setUsers((prev) => prev.map((user) => (user.id === updated.id ? updated : user)));
      setAccessDrafts((prev) => ({ ...prev, [updated.id]: accessDraftFromUser(updated) }));
      setMsg(`Usuario actualizado a estado: ${status}`);
    } catch {
      setMsg('No se pudo actualizar el estado del usuario.');
    }
  };

  const createStaff = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setMsg('');

    try {
      const created = await createUserInApi({ name, email, password, role, status: 'active' });
      setUsers((prev) => [created, ...prev]);
      setName('');
      setEmail('');
      setPassword('');
      setMsg(`${role === 'trainer' ? 'Entrenador' : 'Administrador'} creado correctamente.`);
    } catch {
      setMsg('No se pudo crear la cuenta. Revisa correo duplicado o permisos.');
    }
  };

  const updatePasswordDraft = (userId: string, value: string) => {
    setPasswordDrafts((prev) => ({ ...prev, [userId]: value }));
  };

  const updateAccessDraft = (user: ClientProfile, patch: Partial<AccessDraft>) => {
    setAccessDrafts((prev) => ({
      ...prev,
      [user.id]: { ...(prev[user.id] || accessDraftFromUser(user)), ...patch },
    }));
  };

  const saveAccessDates = async (user: ClientProfile) => {
    const draft = accessDrafts[user.id] || accessDraftFromUser(user);
    if (!confirm(`¿Guardar las fechas y el estado de acceso de ${user.name}?`)) return;
    setAccessLoadingId(user.id);
    setMsg('');
    try {
      const updated = await updateUserAccessInApi(user.id, {
        status: draft.status,
        pending_at: fromDateTimeInput(draft.pendingAt),
        activated_at: fromDateTimeInput(draft.activatedAt),
        suspended_at: fromDateTimeInput(draft.suspendedAt),
        status_changed_at: fromDateTimeInput(draft.statusChangedAt),
        access_note: draft.accessNote.trim(),
      });
      setUsers((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));
      setAccessDrafts((prev) => ({ ...prev, [user.id]: accessDraftFromUser(updated) }));
      setMsg(`Fechas y acceso actualizados para ${updated.name}.`);
    } catch {
      setMsg('No se pudieron guardar las fechas de acceso. Verifica la migración 033 en Supabase.');
    } finally {
      setAccessLoadingId(null);
    }
  };

  const resetPassword = async (user: ClientProfile) => {
    const newPassword = passwordDrafts[user.id]?.trim() || '';

    if (newPassword.length < 8) {
      setMsg('La nueva contraseña debe tener mínimo 8 caracteres.');
      return;
    }

    const confirmed = confirm(`¿Actualizar la contraseña de ${user.name}?`);
    if (!confirmed) return;

    setPasswordLoadingId(user.id);
    setMsg('');

    try {
      await resetUserPasswordInApi(user.id, newPassword);
      setPasswordDrafts((prev) => ({ ...prev, [user.id]: '' }));
      setMsg(`Contraseña actualizada para ${user.name}.`);
    } catch {
      setMsg('No se pudo actualizar la contraseña. Verifica permisos o intenta nuevamente.');
    } finally {
      setPasswordLoadingId(null);
    }
  };

  const cleanupDemo = async () => {
    if (!confirm('¿Limpiar datos demo? Se conservarán usuarios base, roles, alimentos, rutinas y configuración.')) return;

    try {
      const response = await cleanupDemoDataInApi();
      setMsg(response.detail);
    } catch {
      setMsg('No se pudo limpiar datos demo.');
    }
  };

  const filtered = users.filter((user) => statusFilter === 'all' || user.status === statusFilter);

  const statusStyles: Record<UserStatus, string> = {
    pending: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
    active: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
    suspended: 'bg-red-500/15 text-red-400 border-red-500/30',
    rejected: 'bg-neutral-700/40 text-neutral-300 border-neutral-600/50',
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-6 animate-fade-in">
      <div className="rounded-2xl border border-neutral-800 bg-gradient-to-r from-neutral-950 via-neutral-900 to-neutral-950 p-6">
        <div className="inline-flex items-center gap-2 rounded-full border border-red-900/60 bg-red-950/40 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-red-400 mb-3">
          <Shield className="w-3.5 h-3.5" /> Administración privada
        </div>
        <h1 className="text-2xl md:text-3xl font-black text-white tracking-tight">Gestión de accesos, perfiles y contraseñas</h1>
        <p className="text-sm text-neutral-400 mt-2 max-w-2xl">
          Aprueba clientes, crea cuentas internas y actualiza contraseñas de administradores, entrenadores o clientes desde un solo lugar.
        </p>
      </div>

      {msg && <div className="rounded-xl border border-neutral-800 bg-neutral-950 p-3 text-xs text-neutral-300">{msg}</div>}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 rounded-2xl border border-neutral-800 bg-neutral-950 p-5">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-4">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-red-500" />
              <h2 className="text-sm font-bold uppercase tracking-wider text-white">Usuarios registrados</h2>
            </div>

            <div className="flex gap-1 flex-wrap">
              {(['pending', 'active', 'suspended', 'rejected', 'all'] as const).map((status) => (
                <button
                  key={status}
                  onClick={() => setStatusFilter(status)}
                  className={`text-[10px] px-2.5 py-1 rounded-lg font-semibold border transition-all ${
                    statusFilter === status
                      ? 'bg-red-600 text-white border-red-600'
                      : 'bg-neutral-900 text-neutral-400 border-neutral-800 hover:text-white'
                  }`}
                >
                  {status === 'all' ? 'Todos' : status}
                </button>
              ))}
            </div>
          </div>

          {loading ? (
            <div className="py-10 text-center text-xs text-neutral-500">Cargando usuarios...</div>
          ) : (
            <div className="space-y-3">
              {filtered.map((user) => {
                const userStatus = (user.status || 'pending') as UserStatus;
                const newPassword = passwordDrafts[user.id] || '';
                const isPasswordLoading = passwordLoadingId === user.id;
                const waLink = user.role === 'client' && user.whatsappOptIn !== false ? whatsappLink(user.phoneNumber, user.name) : undefined;

                return (
                  <div key={user.id} className="rounded-xl border border-neutral-800 bg-neutral-900/40 p-4 space-y-3">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <ZoomableAvatar src={user.avatar} alt={user.name} className="h-10 w-10 rounded-full" />
                        <div>
                          <span className="text-xs font-bold text-white block">{user.name}</span>
                          <span className="text-[10px] text-neutral-500 block">
                            {user.email} · {user.role}{user.phoneNumber ? ` · WhatsApp: ${user.phoneNumber}` : ''}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 flex-wrap justify-end">
                        <span className={`text-[10px] px-2 py-1 rounded-full border font-bold ${statusStyles[userStatus]}`}>
                          {user.status || 'pending'}
                        </span>
                        <button onClick={() => changeStatus(user.id, 'active')} className="text-[10px] bg-emerald-600 hover:bg-emerald-500 text-white px-2 py-1 rounded font-bold">
                          Aprobar/Reactivar
                        </button>
                        <button onClick={() => changeStatus(user.id, 'rejected')} className="text-[10px] bg-neutral-700 hover:bg-neutral-600 text-white px-2 py-1 rounded font-bold">
                          Rechazar
                        </button>
                        <button onClick={() => changeStatus(user.id, 'suspended')} className="text-[10px] bg-red-600 hover:bg-red-500 text-white px-2 py-1 rounded font-bold">
                          Suspender
                        </button>
                        {waLink && (
                          <a
                            href={waLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[10px] bg-emerald-600 hover:bg-emerald-500 text-white px-2 py-1 rounded font-bold inline-flex items-center gap-1"
                          >
                            <MessageCircle className="w-3 h-3" /> WhatsApp
                          </a>
                        )}
                      </div>
                    </div>

                    <details className="group rounded-xl border border-neutral-800 bg-black/30">
                      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 p-3 [&::-webkit-details-marker]:hidden">
                        <span className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-neutral-300">
                          <CalendarClock className="h-3.5 w-3.5 text-sky-400" /> Fechas y estado de acceso
                        </span>
                        <ChevronDown className="h-4 w-4 text-neutral-500 transition-transform group-open:rotate-180" />
                      </summary>
                      {(() => {
                        const draft = accessDrafts[user.id] || accessDraftFromUser(user);
                        return (
                          <div className="border-t border-neutral-800 p-3">
                            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
                              <label className="text-[10px] font-bold uppercase tracking-wider text-neutral-500">
                                Estado actual
                                <select value={draft.status} onChange={(e) => updateAccessDraft(user, { status: e.target.value as UserStatus })} className="mt-1 w-full rounded-lg border border-neutral-800 bg-neutral-900 p-2 text-xs text-white">
                                  <option value="pending">Pendiente de activación</option>
                                  <option value="active">Activo</option>
                                  <option value="suspended">Suspendido</option>
                                  <option value="rejected">Rechazado</option>
                                </select>
                              </label>
                              <label className="text-[10px] font-bold uppercase tracking-wider text-neutral-500">
                                Pendiente desde
                                <input type="datetime-local" value={draft.pendingAt} onChange={(e) => updateAccessDraft(user, { pendingAt: e.target.value })} className="mt-1 w-full rounded-lg border border-neutral-800 bg-neutral-900 p-2 text-xs text-white" />
                              </label>
                              <label className="text-[10px] font-bold uppercase tracking-wider text-neutral-500">
                                Fecha de activación
                                <input type="datetime-local" value={draft.activatedAt} onChange={(e) => updateAccessDraft(user, { activatedAt: e.target.value })} className="mt-1 w-full rounded-lg border border-neutral-800 bg-neutral-900 p-2 text-xs text-white" />
                              </label>
                              <label className="text-[10px] font-bold uppercase tracking-wider text-neutral-500">
                                Fecha de suspensión
                                <input type="datetime-local" value={draft.suspendedAt} onChange={(e) => updateAccessDraft(user, { suspendedAt: e.target.value })} className="mt-1 w-full rounded-lg border border-neutral-800 bg-neutral-900 p-2 text-xs text-white" />
                              </label>
                              <label className="text-[10px] font-bold uppercase tracking-wider text-neutral-500">
                                Último cambio de estado
                                <input type="datetime-local" value={draft.statusChangedAt} onChange={(e) => updateAccessDraft(user, { statusChangedAt: e.target.value })} className="mt-1 w-full rounded-lg border border-neutral-800 bg-neutral-900 p-2 text-xs text-white" />
                              </label>
                              <label className="text-[10px] font-bold uppercase tracking-wider text-neutral-500 md:col-span-2 xl:col-span-1">
                                Nota interna
                                <input value={draft.accessNote} maxLength={500} onChange={(e) => updateAccessDraft(user, { accessNote: e.target.value })} placeholder="Motivo o referencia administrativa" className="mt-1 w-full rounded-lg border border-neutral-800 bg-neutral-900 p-2 text-xs text-white" />
                              </label>
                            </div>
                            <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                              <p className="text-[10px] text-neutral-500">Estas fechas controlan el acceso de la cuenta. No modifican por sí solas el vencimiento de la membresía.</p>
                              <button type="button" onClick={() => saveAccessDates(user)} disabled={accessLoadingId === user.id} className="inline-flex items-center justify-center gap-2 rounded-lg bg-sky-600 px-3 py-2 text-xs font-black text-white hover:bg-sky-500 disabled:bg-neutral-800">
                                {accessLoadingId === user.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />} Guardar fechas
                              </button>
                            </div>
                          </div>
                        );
                      })()}
                    </details>

                    <details className="group rounded-xl border border-neutral-800 bg-black/30">
                      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 p-3 [&::-webkit-details-marker]:hidden">
                        <span className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-neutral-300"><KeyRound className="h-3.5 w-3.5 text-amber-500" /> Cambiar contraseña</span>
                        <ChevronDown className="h-4 w-4 text-neutral-500 transition-transform group-open:rotate-180" />
                      </summary>
                      <div className="border-t border-neutral-800 p-3">
                        <div className="flex flex-col gap-2 sm:flex-row">
                          <input type="password" value={newPassword} onChange={(e) => updatePasswordDraft(user.id, e.target.value)} placeholder="Nueva contraseña mínimo 8 caracteres" className="flex-1 rounded-lg border border-neutral-800 bg-neutral-900 p-2 text-xs text-white" />
                          <button onClick={() => resetPassword(user)} disabled={isPasswordLoading || newPassword.length < 8} className="flex items-center justify-center gap-2 rounded-lg bg-amber-500 px-3 py-2 text-xs font-bold text-black hover:bg-amber-400 disabled:bg-neutral-800 disabled:text-neutral-600">
                            {isPasswordLoading && <Loader2 className="h-3.5 w-3.5 animate-spin" />} Actualizar clave
                          </button>
                        </div>
                        <p className="mt-2 text-[10px] text-neutral-500">Las sesiones anteriores quedan invalidadas por seguridad.</p>
                      </div>
                    </details>
                  </div>
                );
              })}

              {filtered.length === 0 && <div className="py-10 text-center text-xs text-neutral-500">No hay usuarios con este filtro.</div>}
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-neutral-800 bg-neutral-950 p-5 h-fit">
          <div className="flex items-center gap-2 mb-4">
            <UserPlus className="w-4 h-4 text-red-500" />
            <h2 className="text-sm font-bold uppercase tracking-wider text-white">Crear cuenta interna</h2>
          </div>

          <form onSubmit={createStaff} className="space-y-3">
            <div>
              <label className="text-[10px] text-neutral-400 uppercase block mb-1">Nombre</label>
              <input value={name} onChange={(e) => setName(e.target.value)} required className="w-full bg-neutral-900 border border-neutral-800 rounded-lg p-2 text-xs text-white" />
            </div>

            <div>
              <label className="text-[10px] text-neutral-400 uppercase block mb-1">Correo</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className="w-full bg-neutral-900 border border-neutral-800 rounded-lg p-2 text-xs text-white" />
            </div>

            <div>
              <label className="text-[10px] text-neutral-400 uppercase block mb-1">Contraseña temporal</label>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} minLength={8} required className="w-full bg-neutral-900 border border-neutral-800 rounded-lg p-2 text-xs text-white" />
            </div>

            <div>
              <label className="text-[10px] text-neutral-400 uppercase block mb-1">Rol interno</label>
              <select value={role} onChange={(e) => setRole(e.target.value as 'trainer' | 'admin')} className="w-full bg-neutral-900 border border-neutral-800 rounded-lg p-2 text-xs text-white">
                <option value="trainer">Entrenador</option>
                <option value="admin">Administrador</option>
              </select>
            </div>

            <button type="submit" className="w-full bg-red-600 hover:bg-red-500 text-white text-xs font-bold py-2.5 rounded-lg flex items-center justify-center gap-2">
              <CheckCircle2 className="w-3.5 h-3.5" /> Crear activo
            </button>
          </form>

          <div className="mt-4 rounded-xl border border-amber-500/20 bg-amber-500/10 p-3 text-[11px] text-amber-200 flex gap-2">
            <XCircle className="w-4 h-4 shrink-0" />
            <span>El registro público nunca crea entrenadores ni administradores. Solo este panel puede hacerlo.</span>
          </div>

          <button onClick={cleanupDemo} className="mt-3 w-full bg-neutral-900 hover:bg-neutral-800 text-red-400 border border-red-900/40 text-xs font-bold py-2.5 rounded-lg">
            Limpiar datos demo
          </button>
        </div>
      </div>
    </div>
  );
};
