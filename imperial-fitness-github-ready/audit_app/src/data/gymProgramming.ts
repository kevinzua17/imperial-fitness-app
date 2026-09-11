import { ClientProfile, WorkoutRoutine } from './mockData';

export type TrainingGoal = 'hipertrofia' | 'fuerza' | 'resistencia' | 'salud';
export type TrainingLevel = 'Principiante' | 'Intermedio' | 'Avanzado';

export const IMPERIAL_EQUIPMENT = [
  '3 extensiones para cuádriceps',
  '3 femoral acostado',
  '1 prensa de 45 grados',
  '1 prensa aérea',
  '1 jaca squat combinada',
  '1 hacka 45 grados',
  '1 abductor/aductor',
  '1 aductor',
  '1 smith',
  '1 femoral de pie unilateral',
  '2 racks de sentadilla libre',
  '2 racks de mancuernas de 2 kg a 40 kg',
  '1 banco multipropósito',
  '3 bancos planos auxiliares',
  '1 banco declinado con barra',
  '1 banco inclinado con barra',
  '1 hammer',
  '1 fly multipropósito',
  '1 peck deck',
  '2 barras T',
  '1 máquina de fondos',
  '1 par de poleas bajas y altas compactas',
  '2 remo alto',
  '2 remo bajo',
  '1 sissy squat',
  '1 polea alta',
  '4 bicicletas',
  '1 caminadora',
  '1 elevación de pantorrillas sentado',
  '1 elevación de pantorrilla de pie'
];

type Exercise = {
  name: string;
  equipment: string;
  pattern: 'squat' | 'hinge' | 'push' | 'pull' | 'isolation' | 'core' | 'cardio';
  muscles: string[];
  jointStress: 'bajo' | 'medio' | 'alto';
};

const EXERCISES: Exercise[] = [
  { name: 'Sentadilla libre en rack', equipment: 'Rack de sentadilla libre', pattern: 'squat', muscles: ['cuádriceps', 'glúteos', 'core'], jointStress: 'alto' },
  { name: 'Sentadilla en Smith', equipment: 'Smith', pattern: 'squat', muscles: ['cuádriceps', 'glúteos'], jointStress: 'medio' },
  { name: 'Hacka 45 grados', equipment: 'Hacka 45 grados', pattern: 'squat', muscles: ['cuádriceps', 'glúteos'], jointStress: 'medio' },
  { name: 'Jaca squat combinada', equipment: 'Jaca squat combinada', pattern: 'squat', muscles: ['cuádriceps', 'glúteos'], jointStress: 'medio' },
  { name: 'Prensa 45 grados', equipment: 'Prensa 45 grados', pattern: 'squat', muscles: ['cuádriceps', 'glúteos'], jointStress: 'medio' },
  { name: 'Prensa aérea', equipment: 'Prensa aérea', pattern: 'squat', muscles: ['cuádriceps', 'glúteos'], jointStress: 'medio' },
  { name: 'Sissy squat asistida', equipment: 'Sissy squat', pattern: 'squat', muscles: ['cuádriceps'], jointStress: 'alto' },
  { name: 'Extensión de cuádriceps', equipment: 'Extensiones de cuádriceps', pattern: 'isolation', muscles: ['cuádriceps'], jointStress: 'medio' },
  { name: 'Femoral acostado', equipment: 'Femoral acostado', pattern: 'isolation', muscles: ['isquiotibiales'], jointStress: 'bajo' },
  { name: 'Femoral de pie unilateral', equipment: 'Femoral de pie unilateral', pattern: 'isolation', muscles: ['isquiotibiales'], jointStress: 'bajo' },
  { name: 'Abductor en máquina', equipment: 'Abductor/aductor', pattern: 'isolation', muscles: ['glúteo medio'], jointStress: 'bajo' },
  { name: 'Aductor en máquina', equipment: 'Aductor', pattern: 'isolation', muscles: ['aductores'], jointStress: 'bajo' },
  { name: 'Elevación de pantorrilla sentado', equipment: 'Pantorrilla sentado', pattern: 'isolation', muscles: ['sóleo'], jointStress: 'bajo' },
  { name: 'Elevación de pantorrilla de pie', equipment: 'Pantorrilla de pie', pattern: 'isolation', muscles: ['gemelos'], jointStress: 'bajo' },
  { name: 'Press banca plano con barra', equipment: 'Banco plano auxiliar / barra', pattern: 'push', muscles: ['pecho', 'tríceps'], jointStress: 'medio' },
  { name: 'Press inclinado con barra', equipment: 'Banco inclinado con barra', pattern: 'push', muscles: ['pecho superior', 'hombro anterior'], jointStress: 'medio' },
  { name: 'Press declinado con barra', equipment: 'Banco declinado con barra', pattern: 'push', muscles: ['pecho inferior', 'tríceps'], jointStress: 'medio' },
  { name: 'Press en máquina Hammer', equipment: 'Hammer', pattern: 'push', muscles: ['pecho', 'tríceps'], jointStress: 'bajo' },
  { name: 'Peck deck', equipment: 'Peck deck', pattern: 'isolation', muscles: ['pecho'], jointStress: 'bajo' },
  { name: 'Fly multipropósito', equipment: 'Fly multipropósito', pattern: 'isolation', muscles: ['pecho', 'deltoide posterior'], jointStress: 'bajo' },
  { name: 'Fondos asistidos/en máquina', equipment: 'Máquina de fondos', pattern: 'push', muscles: ['pecho', 'tríceps'], jointStress: 'medio' },
  { name: 'Jalón en polea alta', equipment: 'Polea alta', pattern: 'pull', muscles: ['dorsal', 'bíceps'], jointStress: 'bajo' },
  { name: 'Remo bajo en máquina', equipment: 'Remo bajo', pattern: 'pull', muscles: ['espalda media', 'bíceps'], jointStress: 'bajo' },
  { name: 'Remo alto en máquina', equipment: 'Remo alto', pattern: 'pull', muscles: ['dorsal', 'trapecio medio'], jointStress: 'bajo' },
  { name: 'Remo con barra T', equipment: 'Barra T', pattern: 'pull', muscles: ['espalda media', 'dorsal'], jointStress: 'medio' },
  { name: 'Face pull en polea', equipment: 'Polea alta/baja compacta', pattern: 'pull', muscles: ['deltoide posterior', 'rotadores externos'], jointStress: 'bajo' },
  { name: 'Curl bíceps en polea baja', equipment: 'Polea baja compacta', pattern: 'isolation', muscles: ['bíceps'], jointStress: 'bajo' },
  { name: 'Extensión tríceps en polea alta', equipment: 'Polea alta compacta', pattern: 'isolation', muscles: ['tríceps'], jointStress: 'bajo' },
  { name: 'Press hombro con mancuernas', equipment: 'Mancuernas + banco multipropósito', pattern: 'push', muscles: ['hombros', 'tríceps'], jointStress: 'medio' },
  { name: 'Elevaciones laterales con mancuernas', equipment: 'Mancuernas', pattern: 'isolation', muscles: ['deltoide lateral'], jointStress: 'bajo' },
  { name: 'Plancha frontal', equipment: 'Peso corporal', pattern: 'core', muscles: ['core'], jointStress: 'bajo' },
  { name: 'Caminadora inclinada', equipment: 'Caminadora', pattern: 'cardio', muscles: ['cardiovascular'], jointStress: 'bajo' },
  { name: 'Bicicleta estática', equipment: 'Bicicletas', pattern: 'cardio', muscles: ['cardiovascular'], jointStress: 'bajo' }
];

const dayLabels = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

function prescription(goal: TrainingGoal, level: TrainingLevel) {
  if (goal === 'fuerza') return { sets: level === 'Avanzado' ? 5 : 4, reps: level === 'Principiante' ? '5-6' : '3-6', rest: '150-240s', note: 'Carga alta, técnica perfecta, dejar 1-3 reps en reserva salvo test controlado.' };
  if (goal === 'hipertrofia') return { sets: level === 'Principiante' ? 3 : 4, reps: '8-12', rest: '75-120s', note: 'Rango efectivo de hipertrofia, controlar excéntrica 2-3s y progresar volumen/carga.' };
  if (goal === 'resistencia') return { sets: 3, reps: '15-20', rest: '30-60s', note: 'Priorizar densidad, capacidad de trabajo y técnica sin llegar a fallo temprano.' };
  return { sets: 2, reps: '10-15', rest: '60-90s', note: 'Salud sostenible: esfuerzo moderado, movilidad y continuidad semanal.' };
}

function splitForDay(index: number, daysCount: number, goal: TrainingGoal): string {
  if (daysCount <= 2) return index === 0 ? 'Full Body A' : 'Full Body B';
  if (daysCount === 3) return ['Full Body Fuerza', 'Tren Superior', 'Tren Inferior'][index] || 'Full Body';
  if (daysCount === 4) return ['Inferior A', 'Superior A', 'Inferior B', 'Superior B'][index] || 'Full Body';
  if (goal === 'fuerza') return ['Sentadilla', 'Press', 'Peso muerto/Posterior', 'Espalda', 'Accesorios'][index] || 'Full Body';
  return ['Push', 'Pull', 'Pierna A', 'Upper accesorio', 'Pierna B'][index] || 'Full Body';
}

function exercisesForFocus(focus: string, level: TrainingLevel, goal: TrainingGoal) {
  const lower = focus.toLowerCase();
  let selected: Exercise[] = [];
  if (lower.includes('inferior') || lower.includes('pierna') || lower.includes('sentadilla')) {
    selected = [EXERCISES[2], EXERCISES[4], EXERCISES[8], EXERCISES[7], EXERCISES[12]];
  } else if (lower.includes('push') || lower.includes('press')) {
    selected = [EXERCISES[14], EXERCISES[15], EXERCISES[18], EXERCISES[27], EXERCISES[26]];
  } else if (lower.includes('pull') || lower.includes('espalda')) {
    selected = [EXERCISES[21], EXERCISES[22], EXERCISES[24], EXERCISES[25], EXERCISES[26]];
  } else if (lower.includes('muerto') || lower.includes('posterior')) {
    selected = [EXERCISES[8], EXERCISES[9], EXERCISES[5], EXERCISES[10], EXERCISES[12]];
  } else {
    selected = [EXERCISES[4], EXERCISES[14], EXERCISES[21], EXERCISES[8], EXERCISES[30], EXERCISES[32]];
  }
  if (level === 'Principiante') selected = selected.filter(ex => ex.jointStress !== 'alto').slice(0, 5);
  if (goal === 'salud') selected = selected.filter(ex => ex.jointStress !== 'alto').slice(0, 5);
  if (goal === 'resistencia') selected = [...selected.slice(0, 4), EXERCISES[32], EXERCISES[31]];
  return selected;
}

export function generateImperialRoutine(params: {
  client: ClientProfile;
  goal: TrainingGoal;
  level: TrainingLevel;
  selectedDays: string[];
}): WorkoutRoutine {
  const days = params.selectedDays.length > 0 ? params.selectedDays : dayLabels.slice(0, 3);
  const rx = prescription(params.goal, params.level);
  const routineDays = days.map((day, index) => {
    const focus = splitForDay(index, days.length, params.goal);
    const exercises = exercisesForFocus(focus, params.level, params.goal).map(ex => ({
      name: `${ex.name} (${ex.equipment})`,
      sets: ex.pattern === 'cardio' ? 1 : rx.sets,
      reps: ex.pattern === 'cardio' ? (params.goal === 'resistencia' ? '12-20 min' : '8-12 min') : rx.reps,
      notes: `${rx.note} Músculos: ${ex.muscles.join(', ')}. Estrés articular: ${ex.jointStress}.`
    }));
    return {
      day: `${day}: ${focus}`,
      focus,
      exercises
    };
  });

  return {
    id: `routine-${params.client.id}-${Date.now()}`,
    clientId: params.client.id,
    clientName: params.client.name,
    title: `Imperial ${params.goal.toUpperCase()} - ${params.level} (${days.length} días)`,
    objective: `Rutina generada por el entrenador usando máquinas disponibles de Imperial Fitness para objetivo ${params.goal}, nivel ${params.level}, ${days.length} días/semana.`,
    generatedDate: new Date().toISOString().split('T')[0],
    days: routineDays,
    specialistAdvice: `Prescripción basada en sobrecarga progresiva, especificidad, recuperación y adherencia. Días seleccionados: ${days.join(', ')}. El cliente no genera esta rutina; debe ser creada o aprobada por entrenador/admin.`
  };
}

export const TRAINING_DAYS = dayLabels;