import React, { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, MessageCircle, RefreshCw, ShieldCheck } from 'lucide-react';
import type { ClientProfile } from '../data/mockData';
import { CheckinClientSummaryApi, getCheckinSummaryFromApi } from '../services/checkinService';

interface AdherencePanelProps {
  currentUser: ClientProfile;
}

function statusLabel(value?: string | null) {
  const labels: Record<string, string> = {
    trained: 'Entrenó',
    later: 'Más tarde',
    missed: 'No entrenó',
    rest: 'Descanso',
    completed: 'Cumplió',
    partial: 'Parcial',
  };
  return value ? labels[value] || value : 'Sin registro';
}

function riskClass(risk: string) {
  if (risk === 'Alto') return 'border-red-800/60 bg-red-950/30 text-red-200';
  if (risk === 'Medio') return 'border-amber-800/60 bg-amber-950/20 text-amber-200';
  return 'border-emerald-800/60 bg-emerald-950/20 text-emerald-200';
}

function whatsappLink(row: CheckinClientSummaryApi) {
  if (!row.phone_number) return undefined;
  const digits = row.phone_number.replace(/[^0-9]/g, '');
  if (!digits) return undefined;
  const text = encodeURIComponent(
    `Hola ${row.name.split(' ')[0]}, soy del equipo de Imperial Fitness. Vimos que tu seguimiento está pendiente o bajo esta semana. ¿Cómo vas con tus entrenamientos y alimentación?`,
  );
  return `https://wa.me/${digits}?text=${text}`;
}

export const AdherencePanel: React.FC<AdherencePanelProps> = ({ currentUser }) => {
  const [rows, setRows] = useState<CheckinClientSummaryApi[]>([]);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState('');

  const canView = currentUser.role === 'admin' || currentUser.role === 'trainer';

  const load = async () => {
    if (!canView) return;
    setLoading(true);
    setMsg('');
    try {
      const data = await getCheckinSummaryFromApi(7);
      setRows(data);
    } catch {
      setMsg('No se pudo cargar el seguimiento. Intenta nuevamente o verifica tu sesión.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [currentUser.id, currentUser.role]);

  const riskRows = useMemo(() => rows.filter((row) => row.risk_level !== 'Bajo').slice(0, 8), [rows]);
  const average = rows.length ? Math.round(rows.reduce((acc, row) => acc + row.adherence_score, 0) / rows.length) : 0;

  if (!canView) return null;

  return (
    <section className="rounded-2xl border border-neutral-800 bg-neutral-950 p-5 shadow-xl">
      <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-red-900/50 bg-red-950/30 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-red-300">
            <ShieldCheck className="h-3.5 w-3.5" /> Seguimiento interno
          </div>
          <h2 className="text-xl font-black text-white">Adherencia y control de asistencia</h2>
          <p className="mt-1 text-xs text-neutral-400">
            Métricas privadas para admin/entrenador. El cliente solo registra un check-in rápido, no ve estos porcentajes.
          </p>
        </div>
        <button
          type="button"
          onClick={load}
          disabled={loading}
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-neutral-800 bg-neutral-900 px-4 py-2 text-xs font-bold text-white hover:border-red-700 disabled:opacity-60"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /> Actualizar
        </button>
      </div>

      {msg && <div className="mb-3 rounded-xl border border-red-900/50 bg-red-950/30 p-3 text-xs text-red-200">{msg}</div>}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
        <div className="rounded-2xl border border-neutral-800 bg-neutral-900/60 p-4">
          <span className="text-[10px] uppercase tracking-wider text-neutral-500">Promedio 7 días</span>
          <strong className="mt-1 block text-3xl font-black text-white">{average}%</strong>
        </div>
        <div className="rounded-2xl border border-neutral-800 bg-neutral-900/60 p-4">
          <span className="text-[10px] uppercase tracking-wider text-neutral-500">Clientes con alerta</span>
          <strong className="mt-1 block text-3xl font-black text-red-400">{riskRows.length}</strong>
        </div>
        <div className="rounded-2xl border border-neutral-800 bg-neutral-900/60 p-4">
          <span className="text-[10px] uppercase tracking-wider text-neutral-500">Sin check-in reciente</span>
          <strong className="mt-1 block text-3xl font-black text-amber-300">
            {rows.filter((row) => row.days_without_checkin >= 3).length}
          </strong>
        </div>
      </div>

      <div className="space-y-2">
        {(riskRows.length ? riskRows : rows.slice(0, 6)).map((row) => {
          const link = whatsappLink(row);
          return (
            <div key={row.user_id} className={`rounded-2xl border p-3 ${riskClass(row.risk_level)}`}>
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    {row.risk_level !== 'Bajo' && <AlertTriangle className="h-4 w-4" />}
                    <strong className="text-sm text-white">{row.name}</strong>
                    <span className="rounded-full bg-black/30 px-2 py-0.5 text-[10px] font-bold uppercase">{row.risk_level}</span>
                  </div>
                  <p className="mt-1 text-[11px] text-neutral-300">
                    Entreno: {statusLabel(row.last_training_status)} · Alimentación: {statusLabel(row.last_nutrition_status)} · Último registro: {row.last_checkin_date || 'sin registro'}
                  </p>
                  <p className="mt-0.5 text-[11px] text-neutral-400">
                    Score: {row.adherence_score}% · {row.days_without_checkin} día(s) sin check-in · Tel: {row.phone_number || 'sin teléfono'}
                  </p>
                </div>
                {link && row.whatsapp_opt_in === 1 && (
                  <a
                    href={link}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-3 py-2 text-xs font-bold text-white hover:bg-emerald-500"
                  >
                    <MessageCircle className="h-4 w-4" /> WhatsApp
                  </a>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
};
