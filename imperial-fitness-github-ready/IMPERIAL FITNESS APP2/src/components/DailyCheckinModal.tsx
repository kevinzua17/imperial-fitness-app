import { safeGetItem, safeRemoveItem, safeSetItem } from '../utils/safeStorage';
import React, { useEffect, useMemo, useState } from 'react';
import { CalendarCheck, Clock3, Dumbbell, Salad, X } from 'lucide-react';
import type { ClientProfile } from '../data/mockData';
import {
  getTodayCheckinFromApi,
  NutritionStatus,
  submitTodayCheckinToApi,
  TrainingStatus,
} from '../services/checkinService';

interface DailyCheckinModalProps {
  currentUser: ClientProfile;
}

const trainingOptions: { value: TrainingStatus; label: string; detail: string }[] = [
  { value: 'trained', label: 'Ya entrené', detail: 'Entrenamiento realizado hoy' },
  { value: 'later', label: 'Entreno más tarde', detail: 'Aún está pendiente' },
  { value: 'missed', label: 'Hoy no pude', detail: 'Registrar como no realizado' },
  { value: 'rest', label: 'Día de descanso', detail: 'Descanso planificado' },
];

const nutritionOptions: { value: NutritionStatus; label: string; detail: string }[] = [
  { value: 'completed', label: 'Cumplí el plan', detail: 'Alimentación completa' },
  { value: 'partial', label: 'Cumplí parcial', detail: 'Hubo ajustes o salidas' },
  { value: 'missed', label: 'No cumplí', detail: 'Día fuera del plan' },
  { value: 'later', label: 'Lo registro luego', detail: 'Aún no quiero reportar' },
];

function getTodayKey() {
  return new Date().toISOString().slice(0, 10);
}

export const DailyCheckinModal: React.FC<DailyCheckinModalProps> = ({ currentUser }) => {
  const [visible, setVisible] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [trainingStatus, setTrainingStatus] = useState<TrainingStatus | ''>('');
  const [nutritionStatus, setNutritionStatus] = useState<NutritionStatus | ''>('');
  const [plannedTrainingTime, setPlannedTrainingTime] = useState('');
  const [mood, setMood] = useState('');
  const [notes, setNotes] = useState('');
  const [msg, setMsg] = useState('');

  const todayKey = useMemo(() => getTodayKey(), []);
  const snoozeKey = `imperial_checkin_snooze_${currentUser.id}_${todayKey}`;

  useEffect(() => {
    if (currentUser.role !== 'client') {
      setLoading(false);
      return;
    }

    const snoozedUntil = Number(safeGetItem(snoozeKey) || '0');
    if (snoozedUntil > Date.now()) {
      setLoading(false);
      return;
    }

    getTodayCheckinFromApi()
      .then((checkin) => {
        if (!checkin) setVisible(true);
      })
      .catch(() => undefined)
      .finally(() => setLoading(false));
  }, [currentUser.id, currentUser.role, snoozeKey]);

  const postpone = () => {
    const fourHours = 4 * 60 * 60 * 1000;
    safeSetItem(snoozeKey, String(Date.now() + fourHours));
    setVisible(false);
  };

  const submit = async () => {
    if (!trainingStatus || !nutritionStatus) {
      setMsg('Selecciona entrenamiento y alimentación para guardar el seguimiento.');
      return;
    }

    setSaving(true);
    setMsg('');

    try {
      await submitTodayCheckinToApi({
        training_status: trainingStatus,
        nutrition_status: nutritionStatus,
        planned_training_time: plannedTrainingTime || undefined,
        mood: mood || undefined,
        notes,
      });
      safeRemoveItem(snoozeKey);
      setVisible(false);
    } catch {
      setMsg('No se pudo guardar el seguimiento. Revisa tu conexión e intenta otra vez.');
    } finally {
      setSaving(false);
    }
  };

  if (loading || !visible) return null;

  return (
    <div className="fixed inset-0 z-[80] flex items-start sm:items-center justify-center overflow-y-auto bg-black/78 px-3 py-4 sm:px-4 sm:py-6 backdrop-blur-md">
      <div className="w-full max-w-2xl max-h-[calc(100dvh-2rem)] overflow-y-auto rounded-3xl border border-red-900/40 bg-neutral-950 shadow-[0_35px_100px_rgba(0,0,0,0.85)]">
        <div className="sticky top-0 z-10 p-4 md:p-6 border-b border-neutral-800 bg-gradient-to-r from-neutral-950 via-neutral-900 to-red-950/40">
          <button
            type="button"
            onClick={postpone}
            className="absolute right-4 top-4 rounded-full border border-neutral-800 bg-black/40 p-2 text-neutral-500 hover:text-white"
            aria-label="Responder más tarde"
          >
            <X className="h-4 w-4" />
          </button>

          <div className="inline-flex items-center gap-2 rounded-full border border-red-700/50 bg-red-950/40 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-red-300 mb-3">
            <CalendarCheck className="h-3.5 w-3.5" /> Seguimiento diario
          </div>
          <h2 className="text-2xl font-black text-white">Hola, {currentUser.name.split(' ')[0]}. ¿Cómo vas hoy?</h2>
          <p className="mt-1 text-sm text-neutral-400">
            Responde en menos de 10 segundos. Esta información solo alimenta el seguimiento interno del equipo Imperial.
          </p>
        </div>

        <div className="p-4 md:p-6 space-y-5 pb-[calc(env(safe-area-inset-bottom)+1rem)]">
          {msg && <div className="rounded-xl border border-red-800/50 bg-red-950/30 p-3 text-xs text-red-200">{msg}</div>}

          <section>
            <div className="mb-3 flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-white">
              <Dumbbell className="h-4 w-4 text-red-500" /> Entrenamiento
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {trainingOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setTrainingStatus(option.value)}
                  className={`rounded-2xl border p-3 text-left transition-all ${
                    trainingStatus === option.value
                      ? 'border-red-500 bg-red-950/40 text-white shadow-lg shadow-red-950/20'
                      : 'border-neutral-800 bg-neutral-900/70 text-neutral-300 hover:border-red-800'
                  }`}
                >
                  <span className="block text-sm font-bold">{option.label}</span>
                  <span className="mt-0.5 block text-[11px] text-neutral-500">{option.detail}</span>
                </button>
              ))}
            </div>
          </section>

          <section>
            <div className="mb-3 flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-white">
              <Salad className="h-4 w-4 text-emerald-500" /> Alimentación
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {nutritionOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setNutritionStatus(option.value)}
                  className={`rounded-2xl border p-3 text-left transition-all ${
                    nutritionStatus === option.value
                      ? 'border-emerald-500 bg-emerald-950/30 text-white shadow-lg shadow-emerald-950/20'
                      : 'border-neutral-800 bg-neutral-900/70 text-neutral-300 hover:border-emerald-800'
                  }`}
                >
                  <span className="block text-sm font-bold">{option.label}</span>
                  <span className="mt-0.5 block text-[11px] text-neutral-500">{option.detail}</span>
                </button>
              ))}
            </div>
          </section>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-neutral-500">
                Hora estimada si entrenas más tarde
              </label>
              <div className="relative">
                <Clock3 className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-500" />
                <input
                  value={plannedTrainingTime}
                  onChange={(e) => setPlannedTrainingTime(e.target.value)}
                  placeholder="Ej. 7:00 p. m."
                  className="w-full rounded-xl border border-neutral-800 bg-neutral-900 p-2.5 pl-10 text-xs text-white outline-none focus:border-red-700"
                />
              </div>
            </div>
            <div>
              <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-neutral-500">Disposición</label>
              <select
                value={mood}
                onChange={(e) => setMood(e.target.value)}
                className="w-full rounded-xl border border-neutral-800 bg-neutral-900 p-2.5 text-xs text-white outline-none focus:border-red-700"
              >
                <option value="">Sin registrar</option>
                <option value="motivado">Motivado/a</option>
                <option value="normal">Normal</option>
                <option value="cansado">Cansado/a</option>
                <option value="adolorido">Con molestias</option>
              </select>
            </div>
          </div>

          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Nota opcional para el coach/admin. Ej. hoy tengo poco tiempo, dolor leve, comida fuera de casa..."
            className="min-h-[96px] w-full rounded-2xl border border-neutral-800 bg-neutral-900 p-3 text-xs text-white outline-none focus:border-red-700"
          />

          <div className="flex flex-col sm:flex-row gap-2 pt-1">
            <button
              type="button"
              onClick={submit}
              disabled={saving}
              className="flex-1 rounded-xl bg-red-600 px-4 py-3 text-sm font-bold text-white transition hover:bg-red-500 disabled:opacity-50"
            >
              {saving ? 'Guardando...' : 'Guardar seguimiento de hoy'}
            </button>
            <button
              type="button"
              onClick={postpone}
              className="rounded-xl border border-neutral-800 bg-neutral-900 px-4 py-3 text-sm font-semibold text-neutral-300 hover:text-white"
            >
              Responder más tarde
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
