import React, { useEffect, useMemo, useState } from 'react';
import { ChevronDown, Download, Dumbbell, FileText, Loader2, RefreshCcw, Utensils } from 'lucide-react';
import type { ClientProfile, DietPlan, WorkoutRoutine } from '../data/mockData';
import { ExerciseImage } from './ExerciseImage';
import { RestTimer } from './RestTimer';
import { createWorkoutSetInApi, listWorkoutHistoryFromApi, type WorkoutSetApi } from '../services/progressService';
import { getMyAssignedRoutineFromApi } from '../services/routineService';
import { getMyDietPlanFromApi } from '../services/nutritionService';
import { downloadMyPlanPdfFromApi } from '../services/reportService';
import { calculateWeeklyVolume } from '../utils/trainingVolume';

interface ClientPlanViewProps {
  currentUser: ClientProfile;
  routine?: WorkoutRoutine | null;
  diet?: DietPlan | null;
  onRoutineUpdated?: (routine: WorkoutRoutine) => void;
  onDietUpdated?: (diet: DietPlan) => void;
}

type LogDraft = { weight: string; reps: string; setNumber: string; rir: string };

const restSeconds = (value?: string) => {
  if (!value) return 90;
  const numbers = value.match(/\d+/g)?.map(Number) || [];
  if (!numbers.length) return 90;
  const selected = numbers.length > 1 ? Math.round((numbers[0] + numbers[1]) / 2) : numbers[0];
  return /min/i.test(value) ? selected * 60 : selected;
};

const prescribedRange = (value?: string): { min: number; max: number } => {
  const numbers = (value || '').match(/\d+/g)?.map(Number).filter(Number.isFinite) || [];
  if (!numbers.length) return { min: 8, max: 12 };
  const min = Math.max(1, numbers[0]);
  const max = Math.max(min, numbers[1] ?? numbers[0]);
  return { min, max };
};

const prescribedRir = (value?: string): number | undefined => {
  const numbers = (value || '').match(/\d+/g)?.map(Number).filter(Number.isFinite) || [];
  return numbers.length ? Math.max(0, Math.min(...numbers)) : undefined;
};

export const ClientPlanView: React.FC<ClientPlanViewProps> = ({ currentUser, routine: initialRoutine, diet: initialDiet, onRoutineUpdated, onDietUpdated }) => {
  const [routine, setRoutine] = useState<WorkoutRoutine | null>(initialRoutine || null);
  const [diet, setDiet] = useState<DietPlan | null>(initialDiet || null);
  const [selectedDay, setSelectedDay] = useState(0);
  const [history, setHistory] = useState<WorkoutSetApi[]>([]);
  const [drafts, setDrafts] = useState<Record<string, LogDraft>>({});
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(false);
  const [savingKey, setSavingKey] = useState('');
  const [downloadingPdf, setDownloadingPdf] = useState(false);

  useEffect(() => { if (initialRoutine) setRoutine(initialRoutine); }, [initialRoutine]);
  useEffect(() => { if (initialDiet) setDiet(initialDiet); }, [initialDiet]);

  const refresh = async () => {
    setLoading(true);
    setStatus('');
    try {
      const [routineResult, dietResult, historyResult] = await Promise.allSettled([
        getMyAssignedRoutineFromApi(),
        getMyDietPlanFromApi(),
        listWorkoutHistoryFromApi(currentUser.id),
      ]);
      if (routineResult.status === 'fulfilled' && routineResult.value) {
        setRoutine(routineResult.value);
        onRoutineUpdated?.(routineResult.value);
      }
      if (dietResult.status === 'fulfilled' && dietResult.value) {
        setDiet(dietResult.value);
        onDietUpdated?.(dietResult.value);
      }
      if (historyResult.status === 'fulfilled') setHistory(historyResult.value.slice().reverse());
    } catch {
      setStatus('No fue posible actualizar el plan. Se mantiene la última versión cargada.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void refresh(); }, [currentUser.id]);

  const day = routine?.days?.[selectedDay];
  const weeklyVolume = useMemo(() => calculateWeeklyVolume(routine), [routine]);
  const mealCalories = (meal: DietPlan['meals'][number]) => Math.round(meal.items.reduce((sum, item) => sum + ((item.baseCalsPer100g || 0) * item.amountGrams / 100), 0));

  const updateDraft = (key: string, field: keyof LogDraft, value: string) => {
    setDrafts(previous => {
      const current = previous[key] ?? { weight: '', reps: '', setNumber: '1', rir: '' };
      return {
        ...previous,
        [key]: { ...current, [field]: value },
      };
    });
  };

  const saveSet = async (key: string, exercise: NonNullable<WorkoutRoutine['days']>[number]['exercises'][number]) => {
    const draft = drafts[key] || { weight: '', reps: '', setNumber: '1', rir: '' };
    const weight = Number(draft.weight);
    const reps = Number(draft.reps);
    const setNumber = Number(draft.setNumber || 1);
    const rir = draft.rir === '' ? undefined : Number(draft.rir);
    if (!Number.isFinite(weight) || weight < 0 || !Number.isFinite(reps) || reps < 1) {
      setStatus('Completa peso y repeticiones antes de guardar la serie.');
      return;
    }
    setSavingKey(key);
    setStatus('');
    try {
      const saved = await createWorkoutSetInApi({
        userId: currentUser.id,
        exerciseName: exercise.name,
        weightKg: weight,
        reps,
        setNumber,
        rir: rir !== undefined && Number.isFinite(rir) ? rir : undefined,
        targetMinReps: prescribedRange(exercise.reps).min,
        targetMaxReps: prescribedRange(exercise.reps).max,
        targetSets: exercise.sets,
        targetRir: prescribedRir(exercise.targetRir),
      });
      setHistory(previous => [saved, ...previous]);
      setDrafts(previous => ({ ...previous, [key]: { weight: draft.weight, reps: '', setNumber: String(setNumber + 1), rir: '' } }));
      setStatus(saved.suggestion || 'Serie guardada correctamente.');
    } catch {
      setStatus('No se pudo guardar la serie. Revisa la conexión e intenta nuevamente.');
    } finally {
      setSavingKey('');
    }
  };

  const downloadPdf = async () => {
    setDownloadingPdf(true);
    setStatus('');
    try {
      await downloadMyPlanPdfFromApi();
      setStatus('PDF generado con la versión publicada de tu plan.');
    } catch {
      setStatus('No se pudo generar el PDF. Verifica que tengas rutina o alimentación publicada.');
    } finally {
      setDownloadingPdf(false);
    }
  };

  return (
    <div className="mx-auto max-w-6xl space-y-5 px-4 py-6 animate-fade-in">
      <section className="rounded-3xl border border-neutral-800 bg-gradient-to-br from-neutral-950 via-neutral-900 to-black p-5 sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <span className="text-[10px] font-black uppercase tracking-[0.22em] text-red-400">Mi plan Imperial</span>
            <h1 className="mt-1 text-2xl font-black text-white">Entrena y come sin complicarte</h1>
            <p className="mt-1 text-sm text-neutral-400">Aquí solo ves lo que necesitas ejecutar. Tu coach conserva las herramientas avanzadas.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => void refresh()} disabled={loading} className="inline-flex items-center gap-2 rounded-xl border border-neutral-700 px-3 py-2 text-xs font-black text-neutral-200 hover:bg-neutral-900 disabled:opacity-50">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCcw className="h-4 w-4" />} Actualizar
            </button>
            <button type="button" onClick={() => void downloadPdf()} disabled={downloadingPdf} className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-3 py-2 text-xs font-black text-white hover:bg-red-500 disabled:opacity-50">
              {downloadingPdf ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />} PDF de mi plan
            </button>
          </div>
        </div>
        {status && <p className="mt-4 rounded-xl border border-neutral-800 bg-black/35 p-3 text-xs text-neutral-300">{status}</p>}
      </section>

      <section className="rounded-3xl border border-red-900/40 bg-neutral-950 p-4 sm:p-5">
        <div className="flex items-center gap-3">
          <div className="rounded-2xl bg-red-600/15 p-3 text-red-400"><Dumbbell className="h-5 w-5" /></div>
          <div>
            <h2 className="text-lg font-black text-white">Rutina</h2>
            <p className="text-xs text-neutral-500">{routine ? `${routine.title} · ${routine.days.length} días` : 'Tu coach todavía no ha publicado una rutina.'}</p>
          </div>
        </div>

        {routine?.days?.length ? (
          <div className="mt-4 space-y-4">
            <div className="flex gap-2 overflow-x-auto pb-1">
              {routine.days.map((item, index) => (
                <button key={`${item.day}-${index}`} type="button" onClick={() => setSelectedDay(index)} className={`shrink-0 rounded-xl px-3 py-2 text-xs font-black ${selectedDay === index ? 'bg-red-600 text-white' : 'border border-neutral-800 bg-neutral-900 text-neutral-300'}`}>
                  {item.day} · {item.focus}
                </button>
              ))}
            </div>

            {day && (
              <div className="space-y-3">
                {day.exercises.map((exercise, index) => {
                  const key = `${selectedDay}-${index}`;
                  const draft = drafts[key] || { weight: '', reps: '', setNumber: '1', rir: '' };
                  const recent = history.filter(entry => entry.exercise_name.trim().toLowerCase() === exercise.name.trim().toLowerCase()).slice(0, 3);
                  return (
                    <article key={`${exercise.exerciseId || exercise.name}-${index}`} className="rounded-2xl border border-neutral-800 bg-black/30 p-3 sm:p-4">
                      <div className="flex gap-3">
                        <ExerciseImage name={exercise.name} imageUrl={exercise.imageUrl} primaryMuscle={exercise.muscleGroups?.[0]} muscleGroups={exercise.muscleGroups} equipment={exercise.equipment} coachingNotes={exercise.notes} compact className="shrink-0" />
                        <div className="min-w-0 flex-1">
                          <span className="text-[9px] font-black uppercase text-red-400">Ejercicio {index + 1}</span>
                          <h3 className="truncate text-sm font-black text-white">{exercise.name}</h3>
                          <p className="mt-1 text-xs text-neutral-300"><b>{exercise.sets}</b> series × <b>{exercise.reps}</b> reps</p>
                          <p className="text-[10px] text-neutral-500">Descanso {exercise.rest || '60–90 s'}{exercise.targetRir ? ` · RIR ${exercise.targetRir}` : ''}</p>
                        </div>
                      </div>

                      <details className="group mt-3 rounded-xl border border-neutral-800 bg-neutral-950/80">
                        <summary className="flex cursor-pointer list-none items-center justify-between p-3 text-xs font-black text-neutral-200 marker:hidden">Registrar serie <ChevronDown className="h-4 w-4 transition-transform group-open:rotate-180" /></summary>
                        <div className="space-y-3 border-t border-neutral-800 p-3">
                          <RestTimer defaultSeconds={restSeconds(exercise.rest)} compact />
                          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                            <input aria-label="Peso kg" type="number" min="0" step="0.5" value={draft.weight} onChange={e => updateDraft(key, 'weight', e.target.value)} placeholder="Peso kg" className="rounded-xl border border-neutral-800 bg-black p-2 text-xs text-white" />
                            <input aria-label="Repeticiones" type="number" min="1" value={draft.reps} onChange={e => updateDraft(key, 'reps', e.target.value)} placeholder="Reps" className="rounded-xl border border-neutral-800 bg-black p-2 text-xs text-white" />
                            <input aria-label="Serie" type="number" min="1" value={draft.setNumber} onChange={e => updateDraft(key, 'setNumber', e.target.value)} placeholder="Serie" className="rounded-xl border border-neutral-800 bg-black p-2 text-xs text-white" />
                            <input aria-label="RIR" type="number" min="0" max="10" value={draft.rir} onChange={e => updateDraft(key, 'rir', e.target.value)} placeholder="RIR" className="rounded-xl border border-neutral-800 bg-black p-2 text-xs text-white" />
                          </div>
                          <button type="button" onClick={() => void saveSet(key, exercise)} disabled={savingKey === key} className="w-full rounded-xl bg-sky-600 px-3 py-2 text-xs font-black text-white hover:bg-sky-500 disabled:opacity-50">{savingKey === key ? 'Guardando…' : 'Guardar serie'}</button>
                          {recent.length > 0 && <div className="rounded-xl border border-neutral-800 bg-black/40 p-2"><p className="text-[9px] font-black uppercase text-neutral-500">Últimos registros</p>{recent.map(entry => <p key={entry.id} className="mt-1 text-[10px] text-neutral-300">{entry.weight_kg} kg × {entry.reps} reps{entry.rir !== null && entry.rir !== undefined ? ` · RIR ${entry.rir}` : ''}</p>)}{recent[0]?.suggestion && <p className="mt-2 rounded-lg border border-sky-900/40 bg-sky-950/20 p-2 text-[10px] leading-relaxed text-sky-200"><b>Próxima progresión:</b> {recent[0].suggestion}</p>}</div>}
                        </div>
                      </details>
                    </article>
                  );
                })}
              </div>
            )}

            {weeklyVolume.length > 0 && (
              <details className="group rounded-2xl border border-neutral-800 bg-black/30">
                <summary className="flex cursor-pointer list-none items-center justify-between p-3 text-xs font-black text-neutral-300 marker:hidden">Volumen semanal <ChevronDown className="h-4 w-4 transition-transform group-open:rotate-180" /></summary>
                <div className="grid grid-cols-2 gap-2 border-t border-neutral-800 p-3 sm:grid-cols-3 lg:grid-cols-5">
                  {weeklyVolume.map(item => <div key={item.muscle} className="rounded-xl border border-neutral-800 bg-neutral-950 p-2"><span className="block text-[9px] text-neutral-500">{item.muscle}</span><strong className="text-sm text-white">{item.sets} series</strong></div>)}
                </div>
              </details>
            )}
          </div>
        ) : <p className="mt-4 rounded-2xl border border-neutral-800 bg-black/30 p-5 text-sm text-neutral-400">Cuando tu coach publique la rutina aparecerá aquí con imágenes, series, repeticiones y descansos.</p>}
      </section>

      <section className="rounded-3xl border border-emerald-900/40 bg-neutral-950 p-4 sm:p-5">
        <div className="flex items-center gap-3">
          <div className="rounded-2xl bg-emerald-600/15 p-3 text-emerald-400"><Utensils className="h-5 w-5" /></div>
          <div>
            <h2 className="text-lg font-black text-white">Alimentación</h2>
            <p className="text-xs text-neutral-500">{diet ? `Versión ${diet.version || 1} · ${diet.baseCalories} kcal` : 'Tu coach todavía no ha publicado un plan de alimentación.'}</p>
          </div>
        </div>

        {diet ? (
          <div className="mt-4 space-y-3">
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {[['Kcal', diet.baseCalories], ['Proteína', `${diet.protein} g`], ['Carbos', `${diet.carbs} g`], ['Grasas', `${diet.fat} g`]].map(([label, value]) => <div key={String(label)} className="rounded-xl border border-neutral-800 bg-black/35 p-3 text-center"><span className="block text-[9px] uppercase text-neutral-500">{label}</span><strong className="text-base text-white">{value}</strong></div>)}
            </div>
            {diet.meals.map((meal, index) => (
              <details key={`${meal.name}-${index}`} className="group rounded-2xl border border-neutral-800 bg-black/30">
                <summary className="flex cursor-pointer list-none items-center justify-between p-3 marker:hidden"><div><span className="text-sm font-black text-white">{meal.name}</span><span className="ml-2 text-[10px] text-neutral-500">~{mealCalories(meal)} kcal</span></div><ChevronDown className="h-4 w-4 text-neutral-500 transition-transform group-open:rotate-180" /></summary>
                <div className="space-y-2 border-t border-neutral-800 p-3">{meal.items.map((item, itemIndex) => <div key={`${item.id}-${itemIndex}`} className="flex items-center justify-between gap-3 rounded-xl bg-neutral-950 p-2.5"><span className="text-xs font-bold text-neutral-200">{item.currentName}</span><strong className="shrink-0 text-xs text-emerald-300">{Math.round(item.amountGrams)} g</strong></div>)}</div>
              </details>
            ))}
            {diet.specialistDiagnosis && <div className="rounded-2xl border border-neutral-800 bg-black/30 p-3"><p className="flex items-center gap-2 text-[10px] font-black uppercase text-neutral-500"><FileText className="h-3.5 w-3.5" /> Indicaciones</p><p className="mt-1 text-xs leading-relaxed text-neutral-300">{diet.specialistDiagnosis}</p></div>}
          </div>
        ) : <p className="mt-4 rounded-2xl border border-neutral-800 bg-black/30 p-5 text-sm text-neutral-400">Tu pauta aparecerá aquí en cuanto sea revisada y publicada.</p>}
      </section>
    </div>
  );
};
