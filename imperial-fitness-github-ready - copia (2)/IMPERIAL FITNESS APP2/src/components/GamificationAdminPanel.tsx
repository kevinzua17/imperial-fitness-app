import React, { useEffect, useMemo, useState } from 'react';
import { Coins, Flame, MessageCircle, ShieldAlert, Trophy, Users } from 'lucide-react';
import { GamificationGuide } from './GamificationGuide';
import { CollapsibleSection } from './CollapsibleSection';
import { AdminGamificationSummaryApi, GamificationAdminPeriod, getAdminGamificationSummaryFromApi } from '../services/gamificationService';

function whatsappLink(phone?: string | null, name?: string) {
  if (!phone) return '#';
  const clean = phone.replace(/[^0-9]/g, '');
  const text = encodeURIComponent(
    `Hola ${name || ''}, soy del equipo Imperial Fitness. Vimos que tu seguimiento necesita atención y queremos ayudarte a mantener tu proceso. ¿Cómo vas hoy?`,
  );
  return `https://wa.me/${clean}?text=${text}`;
}

const PERIOD_OPTIONS: Array<{ value: GamificationAdminPeriod; label: string }> = [
  { value: '7d', label: 'Última semana' },
  { value: '30d', label: 'Último mes' },
  { value: '90d', label: 'Trimestral' },
  { value: '180d', label: 'Semestral' },
  { value: '365d', label: 'Anual' },
];

function riskFromClient(client: AdminGamificationSummaryApi) {
  const last = client.last_checkin_date ? new Date(`${client.last_checkin_date}T00:00:00`) : null;
  const today = new Date();
  const days = last ? Math.floor((today.getTime() - last.getTime()) / 86400000) : 99;
  if (days >= 5 || client.training_streak === 0) return 'Alto';
  if (days >= 3 || client.training_streak < 2) return 'Medio';
  return 'Bajo';
}

export const GamificationAdminPanel: React.FC = () => {
  const [clients, setClients] = useState<AdminGamificationSummaryApi[]>([]);
  const [period, setPeriod] = useState<GamificationAdminPeriod>('30d');
  const [loading, setLoading] = useState(false);

  const load = () => {
    setLoading(true);
    getAdminGamificationSummaryFromApi(period)
      .then(setClients)
      .catch(() => setClients([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, [period]);

  const riskyClients = useMemo(
    () => clients.filter((client) => riskFromClient(client) !== 'Bajo').slice(0, 8),
    [clients],
  );

  const topClients = useMemo(
    () => [...clients].sort((a, b) => b.xp - a.xp).slice(0, 8),
    [clients],
  );


  const averageLevel = clients.length
    ? Math.round(clients.reduce((sum, client) => sum + (client.level || 1), 0) / clients.length)
    : 0;

  return (
    <section className="space-y-5">
      <div className="bg-neutral-950 border border-neutral-800 rounded-2xl p-5 shadow-xl space-y-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.25em] text-red-400 font-bold">Control Imperial</p>
            <h2 className="text-xl font-black text-white mt-1">Seguimiento interno de constancia</h2>
            <p className="text-xs text-neutral-400">
              Visible solo para admin/entrenador. Aquí se revisan alertas, rachas y registros filtrados por periodo.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-2">
            <select
              value={period}
              onChange={(event) => setPeriod(event.target.value as GamificationAdminPeriod)}
              className="text-xs bg-neutral-900 border border-neutral-700 rounded-lg px-3 py-2 text-white"
              aria-label="Filtrar registros por periodo"
            >
              {PERIOD_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={load}
              className="text-xs bg-neutral-900 hover:bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 text-white"
            >
              {loading ? 'Actualizando...' : 'Actualizar'}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
          <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-4">
            <Users className="w-5 h-5 text-red-400 mb-2" />
            <p className="text-2xl font-black text-white">{clients.length}</p>
            <p className="text-[11px] text-neutral-500 uppercase">usuarios activos</p>
          </div>
          <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-4">
            <ShieldAlert className="w-5 h-5 text-yellow-400 mb-2" />
            <p className="text-2xl font-black text-white">{riskyClients.length}</p>
            <p className="text-[11px] text-neutral-500 uppercase">requieren seguimiento</p>
          </div>
          <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-4">
            <Trophy className="w-5 h-5 text-yellow-400 mb-2" />
            <p className="text-2xl font-black text-white">{averageLevel}</p>
            <p className="text-[11px] text-neutral-500 uppercase">nivel promedio</p>
          </div>
          <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-4">
            <Coins className="w-5 h-5 text-yellow-300 mb-2" />
            <p className="text-2xl font-black text-white">OFF</p>
            <p className="text-[11px] text-neutral-500 uppercase">canjes automáticos</p>
          </div>
        </div>
      </div>

      <CollapsibleSection
        title="Guía de Camino Imperial"
        description="Cómo interpretar niveles, rachas, alertas y seguimiento."
        icon={<Trophy className="h-5 w-5" />}
      >
        <GamificationGuide audience="admin" compact />
      </CollapsibleSection>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
        <CollapsibleSection
          title="Usuarios para seguimiento"
          description={`${riskyClients.length} usuario(s) requieren atención en el periodo.`}
          icon={<ShieldAlert className="w-5 h-5" />}
          defaultOpen
        >
          <div className="space-y-2">
            {riskyClients.length === 0 && <p className="text-xs text-neutral-500">No hay alertas críticas por ahora.</p>}
            {riskyClients.map((client) => {
              const risk = riskFromClient(client);
              return (
                <div key={client.user_id} className="bg-neutral-900 border border-neutral-800 rounded-lg p-3 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-xs text-white font-bold truncate">{client.name}</p>
                    <p className="text-[10px] text-neutral-500 truncate">
                      Riesgo {risk} · Último check-in del periodo: {client.last_checkin_date || 'Sin registro'}
                    </p>
                    <p className="text-[10px] text-neutral-400">
                      🔥 {client.training_streak} · 🍽️ {client.nutrition_streak} · 👑 {client.perfect_streak}
                    </p>
                  </div>
                  {client.phone_number && client.whatsapp_opt_in ? (
                    <a
                      href={whatsappLink(client.phone_number, client.name)}
                      target="_blank"
                      rel="noreferrer"
                      className="shrink-0 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg px-3 py-2 text-xs flex items-center gap-1"
                    >
                      <MessageCircle className="w-3.5 h-3.5" /> WhatsApp
                    </a>
                  ) : (
                    <span className="text-[10px] text-neutral-600">Sin WhatsApp</span>
                  )}
                </div>
              );
            })}
          </div>
        </CollapsibleSection>

        <CollapsibleSection
          title="Top Camino Imperial"
          description="Ranking resumido por nivel, XP y racha de entrenamiento."
          icon={<Flame className="w-5 h-5" />}
        >
          <div className="space-y-2">
            {topClients.map((client, index) => (
              <div key={client.user_id} className="bg-neutral-900 border border-neutral-800 rounded-lg p-3 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <span className="w-7 h-7 rounded-lg bg-red-950/60 text-red-300 flex items-center justify-center text-xs font-black">
                    #{index + 1}
                  </span>
                  <div className="min-w-0">
                    <p className="text-xs text-white font-bold truncate">{client.name}</p>
                    <p className="text-[10px] text-neutral-500 truncate">Nivel {client.level} — {client.title}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xs text-white font-black">{client.xp} XP</p>
                  <p className="text-[10px] text-neutral-500">🔥 {client.training_streak}</p>
                </div>
              </div>
            ))}
          </div>
        </CollapsibleSection>
      </div>

      <CollapsibleSection
        title="Nota sobre monedas y redenciones"
        description="Estado actual y alcance de la fase de recompensas."
        icon={<Coins className="h-5 w-5" />}
      >
        <div className="bg-yellow-950/10 border border-yellow-800/30 rounded-2xl p-4">
        <p className="text-sm font-black text-yellow-200">Nota sobre monedas y redenciones</p>
        <p className="text-[11px] text-yellow-100/70 mt-1 leading-relaxed">
          Este parche deja las monedas como saldo interno de participación. No se descuentan ni se redimen todavía. La siguiente fase puede agregar un catálogo administrable de recompensas, botón de aprobar canje y descuento automático desde el panel admin.
        </p>
        </div>
      </CollapsibleSection>
    </section>
  );
};
