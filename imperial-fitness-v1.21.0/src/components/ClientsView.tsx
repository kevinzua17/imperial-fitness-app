import React, { useEffect, useState } from 'react';
import { ZoomableAvatar } from './ZoomableAvatar';
import { Search, UserPlus, AlertCircle, Activity, Filter, MessageCircle, Phone } from 'lucide-react';
import { ClientProfile } from '../data/mockData';
import { createUserInApi, listClientsFromApi } from '../services/userService';

interface ClientsViewProps {
  users: ClientProfile[];
  currentUser: ClientProfile;
  onAddClient: (newClient: ClientProfile) => void;
  onSelectClientForPlan: (clientId: string) => void;
}

function normalizePhoneForWhatsapp(phone?: string | null): string {
  if (!phone) return '';
  return phone.replace(/[^0-9]/g, '');
}

function whatsappLink(phone?: string | null, name?: string): string | undefined {
  const digits = normalizePhoneForWhatsapp(phone);
  if (!digits || digits.length < 7) return undefined;

  const text = encodeURIComponent(
    `Hola${name ? ` ${name}` : ''}, soy del equipo Imperial Fitness. Te escribo para hacer seguimiento a tu proceso.`,
  );
  return `https://wa.me/${digits}?text=${text}`;
}

export const ClientsView: React.FC<ClientsViewProps> = ({
  users,
  currentUser,
  onAddClient,
  onSelectClientForPlan
}) => {
  const [apiClients, setApiClients] = useState<ClientProfile[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [riskFilter, setRiskFilter] = useState<string>('all');
  
  // State for simple inline add form
  const [showAddForm, setShowAddForm] = useState(false);
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newWhatsappOptIn, setNewWhatsappOptIn] = useState(true);
  const [newRisk, setNewRisk] = useState<'Bajo' | 'Medio' | 'Alto'>('Bajo');
  const [newGoal, setNewGoal] = useState('Recomposición Global');
  const [newStreak, setNewStreak] = useState(1);
  const [msg, setMsg] = useState('');

  useEffect(() => {
    listClientsFromApi().then(setApiClients).catch(() => setApiClients([]));
  }, []);

  // Filtering logic
  const clientsOnly = apiClients.length > 0 ? apiClients : users.filter(u => u.role === 'client');
  const filtered = clientsOnly.filter(c => {
    const search = searchTerm.toLowerCase();
    const matchesSearch = c.name.toLowerCase().includes(search) ||
                          c.email.toLowerCase().includes(search) ||
                          (c.phoneNumber || '').toLowerCase().includes(search);
    const matchesRisk = riskFilter === 'all' || c.retentionRisk === riskFilter;
    return matchesSearch && matchesRisk;
  });
  const highRiskCount = clientsOnly.filter(c => c.retentionRisk === 'Alto' || (c.attendanceRate || 0) < 70).length;
  const missingBodyDataCount = clientsOnly.filter(c => !c.height || !c.weight || !c.age || !c.gender).length;
  const whatsappReadyCount = clientsOnly.filter(c => normalizePhoneForWhatsapp(c.phoneNumber).length >= 7 && c.whatsappOptIn !== false).length;

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = newName.trim();
    const cleanEmail = newEmail.trim().toLowerCase();
    const cleanPhone = newPhone.trim();
    const phoneDigits = normalizePhoneForWhatsapp(cleanPhone);

    if (!cleanName || !cleanEmail || !cleanPhone) {
      setMsg('Completa nombre, correo y WhatsApp del cliente.');
      return;
    }

    if (phoneDigits.length < 7) {
      setMsg('El WhatsApp debe incluir un número válido. Recomendado: código de país + número, ejemplo 573001112233.');
      return;
    }

    const tempPassword = crypto.randomUUID().slice(0, 10);
    createUserInApi({
      name: cleanName,
      email: cleanEmail,
      phone_number: cleanPhone,
      whatsapp_opt_in: newWhatsappOptIn ? 1 : 0,
      password: tempPassword,
      role: 'client',
      status: 'active',
      goal: newGoal,
      assigned_trainer_id: currentUser.role === 'trainer' ? Number(currentUser.id) : undefined,
    }).then((created) => {
      const createdWithRisk = {
        ...created,
        retentionRisk: newRisk,
        streak: newStreak,
        phoneNumber: created.phoneNumber || cleanPhone,
        whatsappOptIn: newWhatsappOptIn,
      };
      setApiClients(prev => [createdWithRisk, ...prev]);
      onAddClient(createdWithRisk);
      setNewName('');
      setNewEmail('');
      setNewPhone('');
      setNewWhatsappOptIn(true);
      setNewRisk('Bajo');
      setNewGoal('Recomposición Global');
      setNewStreak(1);
      setShowAddForm(false);
      setMsg(`Cliente creado. Contraseña temporal: ${tempPassword}. WhatsApp registrado: ${cleanPhone}`);
    }).catch(() => {
      setMsg('No se pudo crear el cliente. Verifica correo duplicado, permisos e intenta nuevamente.');
    });
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-6 animate-fade-in">
      
      {/* Header controls */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-xl font-bold text-white tracking-wide">
            Gestión de Clientes & Alertas Predictivas
          </h2>
          <p className="text-xs text-neutral-400 mt-0.5">
            Supervisa asiduidad, rachas de entrenamiento y previene deserciones con contacto directo por WhatsApp.
          </p>
        </div>

        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="bg-red-600 hover:bg-red-500 text-white text-xs font-semibold px-4 py-2 rounded-xl transition-all flex items-center gap-1.5 shrink-0"
        >
          <UserPlus className="w-4 h-4" /> 
          {showAddForm ? 'Cancelar Registro' : 'Añadir Cliente Directo'}
        </button>
      </div>

      {msg && <div className="rounded-xl border border-neutral-800 bg-neutral-950 p-3 text-xs text-neutral-300">{msg}</div>}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="rounded-2xl border border-neutral-800 bg-neutral-950 p-4">
          <span className="text-[10px] text-neutral-500 uppercase font-bold">Clientes cargados</span>
          <strong className="block text-3xl text-white mt-1">{clientsOnly.length}</strong>
          <p className="text-[11px] text-neutral-500 mt-1">Base visible para operación.</p>
        </div>
        <div className="rounded-2xl border border-red-900/40 bg-red-950/10 p-4">
          <span className="text-[10px] text-red-300 uppercase font-bold">Seguimiento urgente</span>
          <strong className="block text-3xl text-white mt-1">{highRiskCount}</strong>
          <p className="text-[11px] text-neutral-400 mt-1">Riesgo alto o baja asistencia.</p>
        </div>
        <div className="rounded-2xl border border-yellow-500/30 bg-yellow-950/10 p-4">
          <span className="text-[10px] text-yellow-200 uppercase font-bold">InBody incompleto</span>
          <strong className="block text-3xl text-white mt-1">{missingBodyDataCount}</strong>
          <p className="text-[11px] text-neutral-400 mt-1">Falta edad, género, talla o peso.</p>
        </div>
        <div className="rounded-2xl border border-emerald-500/30 bg-emerald-950/10 p-4">
          <span className="text-[10px] text-emerald-200 uppercase font-bold">WhatsApp listo</span>
          <strong className="block text-3xl text-white mt-1">{whatsappReadyCount}</strong>
          <p className="text-[11px] text-neutral-400 mt-1">Clientes contactables.</p>
        </div>
      </div>

      {/* Embedded Create Form */}
      {showAddForm && (
        <form onSubmit={handleCreateSubmit} className="bg-neutral-950 border border-neutral-800 rounded-xl p-4 space-y-3 animate-fade-in">
          <span className="text-xs font-bold text-white uppercase block mb-2">Crear Ficha de Socio Premium</span>
          
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-[10px] text-neutral-400 uppercase mb-1">Nombre Completo</label>
              <input
                type="text"
                placeholder="Ej. Sara Velásquez"
                value={newName}
                onChange={e => setNewName(e.target.value)}
                required
                className="w-full bg-neutral-900 border border-neutral-800 rounded-lg p-2 text-xs text-white focus:outline-none focus:border-red-600"
              />
            </div>

            <div>
              <label className="block text-[10px] text-neutral-400 uppercase mb-1">Correo Electrónico</label>
              <input
                type="email"
                placeholder="sara@imperial.co"
                value={newEmail}
                onChange={e => setNewEmail(e.target.value)}
                required
                className="w-full bg-neutral-900 border border-neutral-800 rounded-lg p-2 text-xs text-white focus:outline-none focus:border-red-600"
              />
            </div>

            <div>
              <label className="block text-[10px] text-neutral-400 uppercase mb-1">WhatsApp del cliente</label>
              <div className="relative">
                <Phone className="w-3.5 h-3.5 text-neutral-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="tel"
                  inputMode="tel"
                  placeholder="Ej. 573001112233"
                  value={newPhone}
                  onChange={e => setNewPhone(e.target.value)}
                  required
                  className="w-full bg-neutral-900 border border-neutral-800 rounded-lg py-2 pl-8 pr-2 text-xs text-white focus:outline-none focus:border-red-600"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-[10px] text-neutral-400 uppercase mb-1">Riesgo de Retención Inicial</label>
              <select
                value={newRisk}
                onChange={e => setNewRisk(e.target.value as any)}
                className="w-full bg-neutral-900 border border-neutral-800 rounded-lg p-2 text-xs text-white focus:outline-none focus:border-red-600"
              >
                <option value="Bajo">Bajo Riesgo (Asistencia &gt; 80%)</option>
                <option value="Medio">Riesgo Medio (Estancamiento)</option>
                <option value="Alto">Riesgo Alto (Caída motivacional)</option>
              </select>
            </div>

            <div>
              <label className="block text-[10px] text-neutral-400 uppercase mb-1">Objetivo del Socio</label>
              <input
                type="text"
                placeholder="Ej. Definición Muscular Extrema"
                value={newGoal}
                onChange={e => setNewGoal(e.target.value)}
                className="w-full bg-neutral-900 border border-neutral-800 rounded-lg p-2 text-xs text-white focus:outline-none focus:border-red-600"
              />
            </div>

            <div>
              <label className="block text-[10px] text-neutral-400 uppercase mb-1">Racha Inicial (Días)</label>
              <input
                type="number"
                value={newStreak}
                onChange={e => setNewStreak(Number(e.target.value))}
                min={0}
                className="w-full bg-neutral-900 border border-neutral-800 rounded-lg p-2 text-xs text-white focus:outline-none focus:border-red-600"
              />
            </div>
          </div>

          <label className="flex items-start gap-2 text-[11px] text-neutral-400">
            <input
              type="checkbox"
              checked={newWhatsappOptIn}
              onChange={(e) => setNewWhatsappOptIn(e.target.checked)}
              className="mt-0.5 accent-red-600"
            />
            El cliente autorizó comunicación y seguimiento por WhatsApp.
          </label>

          <div className="pt-2">
            <button
              type="submit"
              className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold py-2 px-4 rounded-lg transition-colors"
            >
              Confirmar y Asignar Especialista
            </button>
          </div>
        </form>
      )}

      {/* Filters and search bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-neutral-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Buscar por nombre, correo o WhatsApp de socio..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full bg-neutral-950 border border-neutral-800 rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder:text-neutral-600 focus:outline-none focus:border-red-600 transition-colors"
          />
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <Filter className="w-3.5 h-3.5 text-neutral-500" />
          <span className="text-xs text-neutral-400">Riesgo:</span>
          <select
            value={riskFilter}
            onChange={e => setRiskFilter(e.target.value)}
            className="bg-neutral-950 border border-neutral-800 rounded-xl px-2.5 py-2 text-xs text-white focus:outline-none focus:border-red-600 cursor-pointer"
          >
            <option value="all">Todos los Riesgos</option>
            <option value="Bajo">Riesgo Bajo</option>
            <option value="Medio">Riesgo Medio</option>
            <option value="Alto">Riesgo Alto ⚠️</option>
          </select>
        </div>
      </div>

      {/* Grid of clients */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map(client => {
          const isHighRisk = client.retentionRisk === 'Alto';
          const waLink = whatsappLink(client.phoneNumber, client.name);
          return (
            <div 
              key={client.id}
              className={`bg-neutral-950 border rounded-xl p-5 flex flex-col justify-between transition-all ${
                isHighRisk ? 'border-red-900/60 shadow-lg shadow-red-950/20' : 'border-neutral-800/80 hover:border-neutral-700'
              }`}
            >
              <div>
                {/* Header status */}
                <div className="flex justify-between items-start mb-3">
                  <div className="flex items-center gap-2.5">
                    <ZoomableAvatar src={client.avatar} alt={client.name} className="h-10 w-10 rounded-full" />
                    <div>
                      <span className="text-xs font-bold text-white block">{client.name}</span>
                      <span className="text-[10px] text-neutral-400 block line-clamp-1">{client.email}</span>
                    </div>
                  </div>

                  <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full uppercase shrink-0 ${
                    isHighRisk 
                      ? 'bg-red-500/20 text-red-400 border border-red-500/30 animate-pulse' 
                      : client.retentionRisk === 'Medio'
                      ? 'bg-amber-500/20 text-amber-400'
                      : 'bg-emerald-500/10 text-emerald-400'
                  }`}>
                    {client.retentionRisk}
                  </span>
                </div>

                {/* Body and Goal details */}
                <div className="bg-neutral-900/50 p-2.5 rounded-lg mb-3 text-xs space-y-1.5">
                  <div className="flex justify-between gap-2">
                    <span className="text-neutral-500 text-[10px] uppercase font-light">Objetivo:</span>
                    <span className="text-white font-medium text-[11px] text-right">{client.goal || 'No definido'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-neutral-500 text-[10px] uppercase font-light">Asistencia:</span>
                    <span className={`font-bold text-[11px] ${client.attendanceRate > 75 ? 'text-emerald-400' : 'text-red-400'}`}>
                      {client.attendanceRate}%
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-neutral-500 text-[10px] uppercase font-light">Racha actual:</span>
                    <span className="text-amber-400 font-bold text-[11px]">{client.streak || 0} días</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-neutral-500 text-[10px] uppercase font-light">WhatsApp:</span>
                    <span className="text-neutral-300 text-[11px]">{client.phoneNumber || 'sin registrar'}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 pt-2 mt-2 border-t border-neutral-800/70">
                    <div className="rounded-lg bg-black/30 p-2">
                      <span className="block text-[9px] text-neutral-500 uppercase">Peso / talla</span>
                      <strong className="text-xs text-white">{client.weight || '—'} kg · {client.height || '—'} cm</strong>
                    </div>
                    <div className="rounded-lg bg-black/30 p-2">
                      <span className="block text-[9px] text-neutral-500 uppercase">Edad / género</span>
                      <strong className="text-xs text-white">{client.age || '—'} · {client.gender || '—'}</strong>
                    </div>
                    <div className="rounded-lg bg-black/30 p-2">
                      <span className="block text-[9px] text-neutral-500 uppercase">Músculo</span>
                      <strong className="text-xs text-emerald-300">{client.muscleMass || '—'} kg</strong>
                    </div>
                    <div className="rounded-lg bg-black/30 p-2">
                      <span className="block text-[9px] text-neutral-500 uppercase">Grasa</span>
                      <strong className="text-xs text-red-300">{client.bodyFat || '—'}%</strong>
                    </div>
                  </div>
                </div>

                <div className="text-[10px] text-neutral-500 flex items-center gap-1">
                  <Activity className="w-3 h-3 text-neutral-400" />
                  <span>Nivel: {client.experienceLevel} • Última visita: {client.lastAttendance}</span>
                </div>
              </div>

              {/* Action items */}
              <div className="mt-4 pt-3 border-t border-neutral-900 flex flex-col sm:flex-row gap-2">
                <button
                  onClick={() => onSelectClientForPlan(client.id)}
                  className="flex-1 bg-red-950/40 hover:bg-red-900/60 text-red-400 border border-red-900/50 text-[10px] font-semibold py-1.5 rounded transition-colors text-center block"
                >
                  Ajustar Dieta / Rutina
                </button>

                {waLink && client.whatsappOptIn !== false ? (
                  <a
                    href={waLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] font-semibold py-1.5 rounded transition-colors text-center flex items-center justify-center gap-1"
                  >
                    <MessageCircle className="w-3.5 h-3.5" /> WhatsApp
                  </a>
                ) : (
                  <span className="flex-1 border border-neutral-800 text-neutral-600 text-[10px] font-semibold py-1.5 rounded text-center">
                    Sin WhatsApp
                  </span>
                )}
              </div>
            </div>
          );
        })}

        {filtered.length === 0 && (
          <div className="col-span-full bg-neutral-950 border border-neutral-800 rounded-xl p-8 text-center">
            <AlertCircle className="w-8 h-8 text-neutral-600 mx-auto mb-2" />
            <p className="text-sm text-neutral-400">No se encontraron clientes con los filtros actuales.</p>
          </div>
        )}
      </div>
    </div>
  );
};
