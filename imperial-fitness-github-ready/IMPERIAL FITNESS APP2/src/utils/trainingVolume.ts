import type { WorkoutRoutine } from '../data/mockData';

export interface MuscleVolumeEntry {
  muscle: string;
  sets: number;
  exerciseCount: number;
  classification: 'low' | 'target' | 'high';
}

const NORMALIZATION: Array<[RegExp, string]> = [
  [/pecho|pectoral/i, 'Pecho'],
  [/espalda|dorsal|latissimus/i, 'Espalda'],
  [/cu[aá]driceps|quadriceps/i, 'Cuádriceps'],
  [/femoral|isquio|hamstring/i, 'Femoral'],
  [/gl[uú]te/i, 'Glúteos'],
  [/hombro|delto/i, 'Hombros'],
  [/b[ií]ceps/i, 'Bíceps'],
  [/tr[ií]ceps/i, 'Tríceps'],
  [/pantorr|gemelo|calf/i, 'Pantorrillas'],
  [/abdomen|core|abdominal/i, 'Core'],
];

export function normalizeMuscleLabel(raw: string): string {
  const clean = raw.trim();
  const matched = NORMALIZATION.find(([pattern]) => pattern.test(clean));
  return matched?.[1] || clean || 'General';
}

export function calculateWeeklyVolume(routine?: WorkoutRoutine | null): MuscleVolumeEntry[] {
  if (!routine?.days?.length) return [];
  const totals = new Map<string, { sets: number; exercises: number }>();

  routine.days.forEach(day => {
    day.exercises.forEach(exercise => {
      const groups = exercise.muscleGroups?.length ? exercise.muscleGroups : [day.focus || 'General'];
      const uniqueGroups = Array.from(new Set(groups.map(normalizeMuscleLabel)));
      const sets = Math.max(0, Number(exercise.sets || 0));
      uniqueGroups.forEach(group => {
        const previous = totals.get(group) || { sets: 0, exercises: 0 };
        totals.set(group, { sets: previous.sets + sets, exercises: previous.exercises + 1 });
      });
    });
  });

  return Array.from(totals.entries())
    .map(([muscle, values]) => ({
      muscle,
      sets: values.sets,
      exerciseCount: values.exercises,
      classification: values.sets < 8 ? 'low' as const : values.sets <= 20 ? 'target' as const : 'high' as const,
    }))
    .sort((a, b) => b.sets - a.sets || a.muscle.localeCompare(b.muscle));
}

export function progressionRecommendation(params: {
  minReps: number;
  maxReps: number;
  completedReps: number[];
  rir?: number | null;
  loadKg?: number | null;
}): string {
  const { minReps, maxReps, completedReps, rir, loadKg } = params;
  if (!completedReps.length) return 'Registra tus series para recibir una sugerencia de progresión.';
  const minCompleted = Math.min(...completedReps);
  const allAtTop = completedReps.every(rep => rep >= maxReps);
  if (allAtTop && (rir === undefined || rir === null || rir >= 1)) {
    return loadKg && loadKg > 0
      ? `Rango superior completado: prueba una subida pequeña de carga desde ${loadKg} kg manteniendo técnica y RIR objetivo.`
      : 'Rango superior completado: aumenta ligeramente la carga en la próxima sesión.';
  }
  if (minCompleted < minReps) return 'La carga supera el rango previsto: mantenla o reduce 5–10% hasta recuperar técnica y repeticiones.';
  return 'Mantén la carga y busca sumar 1–2 repeticiones totales antes de volver a subir peso.';
}
