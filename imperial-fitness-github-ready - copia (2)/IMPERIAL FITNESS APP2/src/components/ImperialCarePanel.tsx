import React, { useEffect, useState } from 'react';
import { AlertTriangle, CheckCircle2, HeartPulse, ShieldCheck } from 'lucide-react';
import { BODY_AREA_LABELS, CareBodyArea, CareSeverity, SEVERITY_LABELS, UserLimitationInput, limitationSummary } from '../data/careRules';
import { createUserLimitation, listUserLimitations, resolveUserLimitation } from '../services/careService';
import { ClientProfile } from '../data/mockData';

interface ImperialCarePanelProps {
  client: ClientProfile;
  currentUser: ClientProfile;
  onLimitationsChange?: (limitations: UserLimitationInput[]) => void;
  onLoadStateChange?: (state: 'loading' | 'ready' | 'error') => void;
}

const bodyAreas: CareBodyArea[] = ['rodilla', 'hombro', 'lumbar', 'codo', 'muneca', 'cadera', 'tobillo', 'cuello', 'otro'];
const severities: CareSeverity[] = ['leve', 'moderada', 'alta'];

export const ImperialCarePanel: React.FC<ImperialCarePanelProps> = ({ client, currentUser, onLimitationsChange, onLoadStateChange }) => {
  const [limitations, setLimitations] = useState<UserLimitationInput[]>([]);
  const [bodyArea, setBodyArea] = useState<CareBodyArea>('rodilla');
  const [severity, setSeverity] = useState<CareSeverity>('leve');
  const [comment, setComment] = useState('');
  const [trainerNote, setTrainerNote] = useState('');
  const [status, setStatus] = useState('');
  const [busy, setBusy] = useState(false);

  const canManage = currentUser.role !== 'client';
  const active = limitations.filter(item => (item.status || 'active') === 'active');

  const refresh = async () => {
    onLoadStateChange?.('loading');
    setStatus('');
    try {
      const rows = await listUserLimitations(client.id);
      setLimitations(rows);
      onLimitationsChange?.(rows);
      onLoadStateChange?.('ready');
    } catch {
      setLimitations([]);
      onLimitationsChange?.([]);
      onLoadStateChange?.('error');
      setStatus('No pudimos actualizar las molestias registradas. Puedes continuar editando la rutina; verifica manualmente antecedentes de dolor o lesión antes de asignarla.');
    }
  };

  useEffect(() => {
    refresh();
  }, [client.id]);


  const save = async () => {
    if (!comment.trim() && currentUser.role === 'client') {
      setStatus('Cuéntanos brevemente qué sientes para que el entrenador pueda revisar mejor.');
      return;
    }
    setBusy(true);
    try {
      const created = await createUserLimitation(client.id, {
        bodyArea,
        severity,
        comment: comment.trim() || (currentUser.role === 'client' ? 'Molestia reportada desde Mi Plan.' : 'Limitación registrada por el equipo.'),
        trainerNote: trainerNote.trim(),
        status: 'active',
      });
      const next = [created, ...limitations.filter(item => String(item.id) !== String(created.id))];
      setLimitations(next);
      onLimitationsChange?.(next);
      onLoadStateChange?.('ready');
      setComment('');
      setTrainerNote('');
      setStatus(severity === 'alta' ? 'Molestia alta registrada. Evita entrenar con dolor intenso y solicita revisión del entrenador.' : 'Modo Cuidado Imperial actualizado.');
    } catch {
      setStatus('No se pudo guardar la limitación. No cierres este aviso ni generes una rutina hasta reintentar.');
      onLoadStateChange?.('error');
    } finally {
      setBusy(false);
    }
  };

  const resolve = async (id: string | number | undefined) => {
    if (!id) return;
    setBusy(true);
    try {
      await resolveUserLimitation(client.id, id);
      const next = limitations.map(item => String(item.id) === String(id) ? { ...item, status: 'resolved' as const } : item);
      setLimitations(next);
      onLimitationsChange?.(next);
      onLoadStateChange?.('ready');
      setStatus('Limitación marcada como resuelta.');
    } catch {
      setStatus('No se pudo confirmar la resolución. La limitación continúa activa por seguridad.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="rounded-2xl border border-amber-900/50 bg-amber-950/10 p-4 space-y-4">
      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center shrink-0">
            <HeartPulse className="w-5 h-5 text-amber-400" />
          </div>
          <div>
            <span className="text-xs font-black uppercase tracking-wider text-white block">Modo Cuidado Imperial</span>
            <p className="text-[11px] text-neutral-400 mt-1 max-w-2xl">
              Registra molestias o limitaciones para que el generador evite ejercicios de mayor riesgo. No reemplaza evaluación médica; ayuda al entrenador a adaptar el plan.
            </p>
          </div>
        </div>
        <div className="text-[10px] rounded-xl border border-neutral-800 bg-neutral-950 px-3 py-2 text-neutral-400">
          {limitationSummary(active)}
        </div>
      </div>

      {active.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          {active.map(item => (
            <div key={String(item.id)} className="rounded-xl border border-amber-900/40 bg-black/30 p-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <span className="text-xs font-bold text-amber-300">{BODY_AREA_LABELS[item.bodyArea]} · {SEVERITY_LABELS[item.severity]}</span>
                  <p className="text-[11px] text-neutral-400 mt-1">{item.comment || 'Sin comentario adicional.'}</p>
                  {item.trainerNote && <p className="text-[10px] text-neutral-500 mt-1">Nota interna: {item.trainerNote}</p>}
                </div>
                {canManage && (
                  <button disabled={busy} onClick={() => resolve(item.id)} className="text-[10px] px-2 py-1 rounded-lg border border-emerald-800 text-emerald-300 bg-emerald-950/20 hover:bg-emerald-900/30 disabled:opacity-50">
                    Resolver
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <div>
          <label className="block text-[10px] text-neutral-500 uppercase mb-1">Zona</label>
          <select value={bodyArea} onChange={(e) => setBodyArea(e.target.value as CareBodyArea)} className="w-full bg-neutral-900 border border-neutral-800 rounded-lg p-2 text-xs text-white focus:outline-none focus:border-amber-500">
            {bodyAreas.map(area => <option key={area} value={area}>{BODY_AREA_LABELS[area]}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-[10px] text-neutral-500 uppercase mb-1">Intensidad</label>
          <select value={severity} onChange={(e) => setSeverity(e.target.value as CareSeverity)} className="w-full bg-neutral-900 border border-neutral-800 rounded-lg p-2 text-xs text-white focus:outline-none focus:border-amber-500">
            {severities.map(item => <option key={item} value={item}>{SEVERITY_LABELS[item]}</option>)}
          </select>
        </div>
        <div className="md:col-span-2">
          <label className="block text-[10px] text-neutral-500 uppercase mb-1">Comentario</label>
          <input value={comment} onChange={(e) => setComment(e.target.value)} placeholder={currentUser.role === 'client' ? 'Ej: siento molestia en el hombro al hacer press' : 'Ej: evitar flexión profunda de rodilla por 2 semanas'} className="w-full bg-neutral-900 border border-neutral-800 rounded-lg p-2 text-xs text-white focus:outline-none focus:border-amber-500" />
        </div>
        {canManage && (
          <div className="md:col-span-4">
            <label className="block text-[10px] text-neutral-500 uppercase mb-1">Nota interna del equipo</label>
            <input value={trainerNote} onChange={(e) => setTrainerNote(e.target.value)} placeholder="Ej: revisar técnica, rango de movimiento y carga antes de progresar" className="w-full bg-neutral-900 border border-neutral-800 rounded-lg p-2 text-xs text-white focus:outline-none focus:border-amber-500" />
          </div>
        )}
      </div>

      <div className="flex flex-col md:flex-row md:items-center gap-2 justify-between">
        <div className="flex items-center gap-2 text-[10px] text-neutral-500">
          {severity === 'alta' ? <AlertTriangle className="w-4 h-4 text-red-400" /> : <ShieldCheck className="w-4 h-4 text-amber-400" />}
          <span>{severity === 'alta' ? 'Dolor alto: evitar continuar sin revisión del entrenador.' : 'La rutina se filtrará para reducir ejercicios incompatibles.'}</span>
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          <button disabled={busy} onClick={save} className="bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs px-4 py-2 rounded-lg transition-colors flex items-center gap-2 justify-center disabled:cursor-not-allowed disabled:opacity-50">
            <CheckCircle2 className="w-4 h-4" /> {busy ? 'Guardando…' : 'Guardar cuidado'}
          </button>
        </div>
      </div>
      {status && <p className="text-[11px] text-amber-300">{status}</p>}
    </div>
  );
};
