import React, { useEffect, useState } from 'react';
import { CheckCircle2, Shield, UserPlus, Users, XCircle } from 'lucide-react';
import { ClientProfile } from '../data/mockData';
import { createUserInApi, listUsersFromApi, updateUserStatusInApi } from '../services/userService';
import { cleanupDemoDataInApi } from '../services/maintenanceService';

type UserStatus = 'pending' | 'active' | 'suspended' | 'rejected';

export const UserManagementView: React.FC = () => {
  const [users, setUsers] = useState<ClientProfile[]>([]);
  const [statusFilter, setStatusFilter] = useState<UserStatus | 'all'>('pending');
  const [msg, setMsg] = useState('');
  const [loading, setLoading] = useState(false);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'trainer' | 'admin'>('trainer');

  const loadUsers = async () => {
    setLoading(true);
    try {
      const data = await listUsersFromApi();
      setUsers(data);
    } catch {
      setMsg('No se pudo cargar usuarios desde la API. Revisa que el backend esté activo.');
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
      setUsers(prev => prev.map(u => u.id === updated.id ? updated : u));
      setMsg(`Usuario actualizado a estado: ${status}`);
    } catch {
      setMsg('No se pudo actualizar el estado del usuario.');
    }
  };

  const createStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const created = await createUserInApi({ name, email, password, role, status: 'active' });
      setUsers(prev => [created, ...prev]);
      setName('');
      setEmail('');
      setPassword('');
      setMsg(`${role === 'trainer' ? 'Entrenador' : 'Administrador'} creado correctamente.`);
    } catch {
      setMsg('No se pudo crear la cuenta. Revisa correo duplicado o permisos.');
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

  const filtered = users.filter(user => statusFilter === 'all' || user.status === statusFilter);

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
        <h1 className="text-2xl md:text-3xl font-black text-white tracking-tight">Gestión de accesos y aprobaciones</h1>
        <p className="text-sm text-neutral-400 mt-2 max-w-2xl">
          Los clientes que se registran quedan pendientes. Solo el administrador puede aprobar, rechazar, suspender, reactivar y crear cuentas de entrenadores o administradores.
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
              {(['pending', 'active', 'suspended', 'rejected', 'all'] as const).map(status => (
                <button
                  key={status}
                  onClick={() => setStatusFilter(status)}
                  className={`text-[10px] px-2.5 py-1 rounded-lg font-semibold border transition-all ${
                    statusFilter === status ? 'bg-red-600 text-white border-red-600' : 'bg-neutral-900 text-neutral-400 border-neutral-800 hover:text-white'
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
              {filtered.map(user => (
                <div key={user.id} className="rounded-xl border border-neutral-800 bg-neutral-900/40 p-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <img src={user.avatar} alt={user.name} className="w-10 h-10 rounded-full object-cover border border-neutral-700" />
                    <div>
                      <span className="text-xs font-bold text-white block">{user.name}</span>
                      <span className="text-[10px] text-neutral-500 block">{user.email} · {user.role}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap justify-end">
                    <span className={`text-[10px] px-2 py-1 rounded-full border font-bold ${statusStyles[(user.status || 'pending') as UserStatus]}`}>
                      {user.status || 'pending'}
                    </span>
                    <button onClick={() => changeStatus(user.id, 'active')} className="text-[10px] bg-emerald-600 hover:bg-emerald-500 text-white px-2 py-1 rounded font-bold">Aprobar/Reactivar</button>
                    <button onClick={() => changeStatus(user.id, 'rejected')} className="text-[10px] bg-neutral-700 hover:bg-neutral-600 text-white px-2 py-1 rounded font-bold">Rechazar</button>
                    <button onClick={() => changeStatus(user.id, 'suspended')} className="text-[10px] bg-red-600 hover:bg-red-500 text-white px-2 py-1 rounded font-bold">Suspender</button>
                  </div>
                </div>
              ))}
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
              <input value={name} onChange={e => setName(e.target.value)} required className="w-full bg-neutral-900 border border-neutral-800 rounded-lg p-2 text-xs text-white" />
            </div>
            <div>
              <label className="text-[10px] text-neutral-400 uppercase block mb-1">Correo</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} required className="w-full bg-neutral-900 border border-neutral-800 rounded-lg p-2 text-xs text-white" />
            </div>
            <div>
              <label className="text-[10px] text-neutral-400 uppercase block mb-1">Contraseña temporal</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} minLength={8} required className="w-full bg-neutral-900 border border-neutral-800 rounded-lg p-2 text-xs text-white" />
            </div>
            <div>
              <label className="text-[10px] text-neutral-400 uppercase block mb-1">Rol interno</label>
              <select value={role} onChange={e => setRole(e.target.value as 'trainer' | 'admin')} className="w-full bg-neutral-900 border border-neutral-800 rounded-lg p-2 text-xs text-white">
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