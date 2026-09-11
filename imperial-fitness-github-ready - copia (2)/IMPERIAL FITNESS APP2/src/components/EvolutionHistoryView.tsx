import React, { useEffect, useMemo, useState } from 'react';
import {
  Archive,
  CalendarDays,
  Camera,
  Dumbbell,
  Filter,
  Globe2,
  Image as ImageIcon,
  Lock,
  MessageSquare,
  RefreshCw,
  Scale,
  Search,
  ShieldCheck,
  UserCheck,
  UserRound,
} from 'lucide-react';
import type { ClientProfile } from '../data/mockData';
import {
  EvolutionHistoryItem,
  EvolutionHistoryResponse,
  EvolutionItemType,
  EvolutionPeriod,
  EvolutionVisibility,
  getMyEvolutionHistory,
  getUserEvolutionHistory,
} from '../services/historyService';

interface EvolutionHistoryViewProps {
  currentUser: ClientProfile;
  users: ClientProfile[];
}

const TYPE_OPTIONS: Array<{ value: EvolutionItemType; label: string }> = [
  { value: 'all', label: 'Todo' },
  { value: 'post', label: 'Publicaciones' },
  { value: 'photo', label: 'Fotos' },
  { value: 'checkin', label: 'Check-ins' },
  { value: 'metric', label: 'Medidas' },
];

const VISIBILITY_OPTIONS: Array<{ value: EvolutionVisibility; label: string }> = [
  { value: 'all', label: 'Todas' },
  { value: 'public', label: 'Comunidad' },
  { value: 'friends', label: 'Amigos' },
  { value: 'staff', label: 'Entrenador/Admin' },
  { value: 'private', label: 'Privado' },
];

const PERIOD_OPTIONS: Array<{ value: EvolutionPeriod; label: string }> = [
  { value: '7d', label: 'Última semana' },
  { value: '30d', label: 'Último mes' },
  { value: '60d', label: 'Últimos 2 meses' },
  { value: '90d', label: 'Últimos 3 meses' },
  { value: 'all', label: 'Todo el historial' },
];

function getItemIcon(type: EvolutionHistoryItem['type']) {
  if (type === 'photo') return Camera;
  if (type === 'checkin') return Dumbbell;
  if (type === 'metric') return Scale;
  return MessageSquare;
}

function getVisibilityIcon(visibility: string) {
  if (visibility === 'friends') return UserCheck;
  if (visibility === 'staff') return ShieldCheck;
  if (visibility === 'private') return Lock;
  return Globe2;
}

function getVisibilityClasses(visibility: string) {
  if (visibility === 'friends') return 'border-emerald-500/30 bg-emerald-950/30 text-emerald-300';
  if (visibility === 'staff') return 'border-sky-500/30 bg-sky-950/30 text-sky-300';
  if (visibility === 'private') return 'border-amber-500/30 bg-amber-950/30 text-amber-300';
  return 'border-neutral-700 bg-neutral-900 text-neutral-300';
}

function formatDate(value?: string | null) {
  if (!value) return 'Sin fecha';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Sin fecha';
  return date.toLocaleDateString('es-CO', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function getShortDescription(text: string) {
  if (!text) return 'Registro guardado dentro del historial personal.';
  return text.length > 180 ? `${text.slice(0, 180)}...` : text;
}

export const EvolutionHistoryView: React.FC<EvolutionHistoryViewProps> = ({ currentUser, users }) => {
  const isStaff = currentUser.role === 'admin' || currentUser.role === 'trainer';
  const clientUsers = useMemo(
    () => users.filter((user) => user.role === 'client' || user.id === currentUser.id),
    [users, currentUser.id],
  );

  const [selectedUserId, setSelectedUserId] = useState<string>(currentUser.id);
  const [itemType, setItemType] = useState<EvolutionItemType>('all');
  const [visibility, setVisibility] = useState<EvolutionVisibility>('all');
  const [period, setPeriod] = useState<EvolutionPeriod>('30d');
  const [search, setSearch] = useState('');
  const [history, setHistory] = useState<EvolutionHistoryResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const loadHistory = () => {
    setLoading(true);
    setError('');

    const request = isStaff && selectedUserId !== currentUser.id
      ? getUserEvolutionHistory(selectedUserId, itemType, visibility, period)
      : getMyEvolutionHistory(itemType, visibility, period);

    request
      .then(setHistory)
      .catch(() => setError('No se pudo cargar el historial. Intenta nuevamente o verifica tu sesión.'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadHistory();
  }, [selectedUserId, itemType, visibility, period]);

  const filteredItems = useMemo(() => {
    const cleanSearch = search.trim().toLowerCase();
    if (!history) return [];
    if (!cleanSearch) return history.items;
    return history.items.filter((item) => {
      const haystack = `${item.title} ${item.subtitle} ${item.description} ${item.type_label} ${item.visibility_label}`.toLowerCase();
      return haystack.includes(cleanSearch);
    });
  }, [history, search]);

  const selectedClient = clientUsers.find((user) => user.id === selectedUserId);
  const ownerName = history?.user.name || selectedClient?.name || currentUser.name;

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 animate-fade-in space-y-6">
      <section className="rounded-3xl border border-neutral-800 bg-gradient-to-br from-neutral-950 via-neutral-950 to-red-950/20 p-5 md:p-7 shadow-[0_30px_90px_rgba(0,0,0,0.45)]">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-red-500/20 bg-red-950/20 px-3 py-1 text-[10px] uppercase tracking-[0.22em] text-red-300 mb-3">
              <Archive className="w-3.5 h-3.5" /> Archivo personal
            </div>
            <h1 className="text-2xl md:text-4xl font-black text-white tracking-tight">
              {currentUser.role === 'client' ? 'Mi Evolución Imperial' : 'Historial del Cliente'}
            </h1>
            <p className="text-sm text-neutral-400 mt-2 max-w-2xl">
              {currentUser.role === 'client'
                ? `${ownerName} conserva aquí sus publicaciones, fotos, check-ins y medidas sin tener que buscarlas en toda la comunidad.`
                : `Revisa de forma ordenada lo que ${ownerName} ha compartido o registrado durante su proceso.`}
            </p>
          </div>

          <button
            type="button"
            onClick={loadHistory}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-neutral-900 border border-neutral-800 px-4 py-2 text-sm font-semibold text-neutral-200 hover:bg-neutral-800 transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Actualizar historial
          </button>
        </div>

        {history && (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mt-6">
            <div className="rounded-2xl bg-neutral-900/70 border border-neutral-800 p-4">
              <span className="text-[10px] uppercase tracking-wider text-neutral-500">Registros</span>
              <p className="text-2xl font-black text-white mt-1">{history.summary.total_items}</p>
            </div>
            <div className="rounded-2xl bg-neutral-900/70 border border-neutral-800 p-4">
              <span className="text-[10px] uppercase tracking-wider text-neutral-500">Publicaciones</span>
              <p className="text-2xl font-black text-white mt-1">{history.summary.posts}</p>
            </div>
            <div className="rounded-2xl bg-neutral-900/70 border border-neutral-800 p-4">
              <span className="text-[10px] uppercase tracking-wider text-neutral-500">Fotos</span>
              <p className="text-2xl font-black text-white mt-1">{history.summary.photos}</p>
            </div>
            <div className="rounded-2xl bg-neutral-900/70 border border-neutral-800 p-4">
              <span className="text-[10px] uppercase tracking-wider text-neutral-500">Check-ins</span>
              <p className="text-2xl font-black text-white mt-1">{history.summary.checkins}</p>
            </div>
            <div className="rounded-2xl bg-neutral-900/70 border border-neutral-800 p-4">
              <span className="text-[10px] uppercase tracking-wider text-neutral-500">Última actividad</span>
              <p className="text-sm font-bold text-white mt-2">{formatDate(history.summary.last_activity_at)}</p>
            </div>
          </div>
        )}
      </section>

      <section className="rounded-2xl border border-neutral-800 bg-neutral-950 p-4 space-y-4">
        <div className="flex flex-col xl:flex-row gap-3 xl:items-center justify-between">
          <div className="flex flex-col md:flex-row gap-3 flex-1">
            {isStaff && (
              <div className="relative md:min-w-[260px]">
                <UserRound className="w-4 h-4 text-neutral-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <select
                  value={selectedUserId}
                  onChange={(event) => setSelectedUserId(event.target.value)}
                  className="w-full bg-neutral-900 border border-neutral-800 rounded-xl py-2.5 pl-9 pr-3 text-sm text-white focus:outline-none focus:border-red-600"
                >
                  <option value={currentUser.id}>Mi propio historial</option>
                  {clientUsers
                    .filter((user) => user.id !== currentUser.id)
                    .map((user) => (
                      <option key={user.id} value={user.id}>
                        {user.name} · {user.email}
                      </option>
                    ))}
                </select>
              </div>
            )}

            <div className="relative flex-1">
              <Search className="w-4 h-4 text-neutral-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Buscar por texto, tipo o privacidad..."
                className="w-full bg-neutral-900 border border-neutral-800 rounded-xl py-2.5 pl-9 pr-3 text-sm text-white focus:outline-none focus:border-red-600 placeholder:text-neutral-600"
              />
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <div className="relative">
              <Filter className="w-3.5 h-3.5 text-neutral-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <select
                value={itemType}
                onChange={(event) => setItemType(event.target.value as EvolutionItemType)}
                className="bg-neutral-900 border border-neutral-800 rounded-xl py-2.5 pl-8 pr-8 text-xs text-white focus:outline-none focus:border-red-600"
              >
                {TYPE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <select
              value={period}
              onChange={(event) => setPeriod(event.target.value as EvolutionPeriod)}
              className="bg-neutral-900 border border-neutral-800 rounded-xl py-2.5 px-3 text-xs text-white focus:outline-none focus:border-red-600"
              aria-label="Filtrar por periodo"
            >
              {PERIOD_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>

            <select
              value={visibility}
              onChange={(event) => setVisibility(event.target.value as EvolutionVisibility)}
              className="bg-neutral-900 border border-neutral-800 rounded-xl py-2.5 px-3 text-xs text-white focus:outline-none focus:border-red-600"
            >
              {VISIBILITY_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </section>

      {error && (
        <div className="rounded-2xl border border-red-500/30 bg-red-950/20 p-4 text-sm text-red-300">
          {error}
        </div>
      )}

      {loading && (
        <div className="rounded-2xl border border-neutral-800 bg-neutral-950 p-8 text-center text-neutral-400">
          Cargando historial...
        </div>
      )}

      {!loading && filteredItems.length === 0 && (
        <div className="rounded-2xl border border-neutral-800 bg-neutral-950 p-8 text-center">
          <ImageIcon className="w-10 h-10 text-neutral-600 mx-auto mb-3" />
          <h3 className="text-lg font-bold text-white">Todavía no hay registros en esta vista</h3>
          <p className="text-sm text-neutral-400 mt-1">
            Cuando se publiquen fotos, check-ins, medidas o actualizaciones, aparecerán aquí organizadas por fecha.
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {filteredItems.map((item) => {
          const Icon = getItemIcon(item.type);
          const VisibilityIcon = getVisibilityIcon(item.visibility);
          const metricWeight = item.meta?.weight as number | undefined;
          const metricFat = item.meta?.body_fat as number | undefined;

          return (
            <article
              key={item.id}
              className="rounded-2xl border border-neutral-800 bg-neutral-950 overflow-hidden shadow-[0_18px_45px_rgba(0,0,0,0.35)]"
            >
              {item.image_url && (
                <div className="relative h-64 bg-neutral-900">
                  <img src={item.image_url} alt={item.title} className="w-full h-full object-cover" />
                  <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/80 to-transparent" />
                </div>
              )}

              <div className="p-4 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl bg-red-950/30 border border-red-500/20 flex items-center justify-center shrink-0">
                      <Icon className="w-5 h-5 text-red-400" />
                    </div>
                    <div>
                      <h3 className="text-sm font-black text-white">{item.title}</h3>
                      <div className="flex items-center gap-2 mt-1 text-[11px] text-neutral-500">
                        <CalendarDays className="w-3.5 h-3.5" />
                        {formatDate(item.created_at)}
                        <span>·</span>
                        <span>{item.type_label}</span>
                      </div>
                    </div>
                  </div>

                  <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-1 text-[10px] font-bold ${getVisibilityClasses(item.visibility)}`}>
                    <VisibilityIcon className="w-3 h-3" />
                    {item.visibility_label}
                  </span>
                </div>

                <p className="text-sm text-neutral-300 leading-relaxed whitespace-pre-line">
                  {getShortDescription(item.description)}
                </p>

                {(metricWeight || metricFat || item.type === 'checkin') && (
                  <div className="grid grid-cols-2 gap-2 pt-2">
                    {metricWeight && (
                      <div className="rounded-xl bg-neutral-900 border border-neutral-800 p-3">
                        <span className="text-[10px] uppercase tracking-wider text-neutral-500">Peso</span>
                        <p className="text-sm font-bold text-white">{metricWeight} kg</p>
                      </div>
                    )}
                    {metricFat && (
                      <div className="rounded-xl bg-neutral-900 border border-neutral-800 p-3">
                        <span className="text-[10px] uppercase tracking-wider text-neutral-500">Grasa</span>
                        <p className="text-sm font-bold text-white">{metricFat}%</p>
                      </div>
                    )}
                    {item.type === 'checkin' && (
                      <>
                        <div className="rounded-xl bg-neutral-900 border border-neutral-800 p-3">
                          <span className="text-[10px] uppercase tracking-wider text-neutral-500">Entrenamiento</span>
                          <p className="text-sm font-bold text-white">{String(item.meta.training_status || 'registrado')}</p>
                        </div>
                        <div className="rounded-xl bg-neutral-900 border border-neutral-800 p-3">
                          <span className="text-[10px] uppercase tracking-wider text-neutral-500">Alimentación</span>
                          <p className="text-sm font-bold text-white">{String(item.meta.nutrition_status || 'registrado')}</p>
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
};
