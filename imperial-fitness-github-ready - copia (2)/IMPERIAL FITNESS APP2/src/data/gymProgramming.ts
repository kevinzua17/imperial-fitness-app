import { ClientProfile, WorkoutRoutine } from './mockData';
import { EXERCISE_CATALOG, ExerciseCatalogItem } from './exerciseCatalog';
import { BODY_AREA_LABELS, UserLimitationInput, limitationSummary } from './careRules';
import { buildWarmupExercises, inferRoutineBlock } from '../utils/routineBlocks';

export type TrainingGoal = 'hipertrofia' | 'fuerza' | 'resistencia' | 'salud';
export type TrainingLevel = 'Principiante' | 'Intermedio' | 'Avanzado';
export type TrainingSplit =
  | 'auto'
  | 'full_body_3'
  | 'torso_pierna_4'
  | 'ppl_3'
  | 'ppl_6'
  | 'arnold_6'
  | 'gap'
  // Compatibilidad con rutinas antiguas ya guardadas
  | 'full_body'
  | 'superior'
  | 'inferior'
  | 'push'
  | 'pull'
  | 'pierna'
  | 'gap_abs';

export type ExerciseSourceFilter = 'all' | 'imperial' | 'open';
export type RoutineMuscleTarget =
  | 'pecho'
  | 'espalda'
  | 'hombro'
  | 'biceps'
  | 'triceps'
  | 'pierna'
  | 'cuadriceps'
  | 'femoral'
  | 'gluteo'
  | 'pantorrilla'
  | 'abdomen'
  | 'aductor'
  | 'abductor'
  | 'cardio';

export type WeeklyTrainingDayPlan = {
  day: string;
  muscleTargets: RoutineMuscleTarget[];
};

export function isOpenExerciseSource(item: Pick<ExerciseCatalogItem, 'mediaSource' | 'id'>): boolean {
  return String(item.mediaSource || '').toLowerCase().includes('free-exercise-db') || String(item.id || '').startsWith('open-');
}

function sourceLabel(source: ExerciseSourceFilter): string {
  if (source === 'open') return 'Base abierta';
  if (source === 'imperial') return 'Imperial Fitness';
  return 'Todas las fuentes';
}

export const TRAINING_DAYS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

export const IMPERIAL_EQUIPMENT = [
  '3 extensiones para cuádriceps',
  '3 femoral acostado',
  '1 prensa de 45 grados',
  '1 prensa aérea',
  '1 hacka squat combinada',
  '1 hacka 45 grados',
  '1 abductor y aductor',
  '1 aductor',
  '1 smith',
  '1 femoral de pie unilateral',
  '2 racks sentadilla libre',
  '2 racks de mancuernas desde 2 kg hasta 40 kg',
  '2 bancos multipropósito',
  '3 bancos planos auxiliares',
  '1 banco declinado con barra',
  '1 banco inclinado con barra',
  '1 hammer',
  '1 fly multipropósito',
  '1 peck deck',
  '2 barras T',
  '1 máquina de fondos',
  '1 par de poleas bajas y altas compacta',
  '2 remo alto',
  '2 remo bajo',
  '1 sissy',
  '1 polea alta',
  '4 bicicletas',
  '1 caminadora',
  '1 caminadora curva mecánica',
  '1 elevación de pantorrillas sentado',
  '1 elevación pantorrilla de pie',
  '1 femoral sentado',
];

type Rx = { sets: number; reps: string; rest: string; note: string; rir: string };

export type TrainingIntensityMode =
  | 'sin_tecnicas'
  | 'auto_inteligente'
  | 'metabolico'
  | 'ahorro_tiempo'
  | 'sobrecarga_fuerza';

export type IntensityTechniqueId =
  | 'lastre'
  | 'drop_set'
  | 'rest_pause'
  | 'myo_reps'
  | 'superserie_antagonista'
  | 'serie_compuesta'
  | 'triserie'
  | 'serie_gigante'
  | 'repeticiones_parciales'
  | 'excentrica_acentuada';

export type IntensityTechniquePrescription = {
  id: IntensityTechniqueId;
  label: string;
  category: string;
  execution: string;
  caution: string;
};

export type TrainingIntensityModePreset = {
  id: TrainingIntensityMode;
  label: string;
  description: string;
};

export const TRAINING_INTENSITY_MODE_PRESETS: TrainingIntensityModePreset[] = [
  { id: 'sin_tecnicas', label: 'Sin técnicas intensivas', description: 'Rutina base con series tradicionales. Recomendada para inicio, salud o readaptación.' },
  { id: 'auto_inteligente', label: 'Automático inteligente', description: 'La app aplica pocas técnicas seguras según nivel, objetivo, músculo, equipo y tipo de ejercicio.' },
  { id: 'metabolico', label: 'Estrés metabólico', description: 'Prioriza drop sets, myo-reps, parciales y excéntricas en accesorios para hipertrofia.' },
  { id: 'ahorro_tiempo', label: 'Ahorro de tiempo', description: 'Usa superseries, series compuestas o triseries cuando el día y los músculos lo permiten.' },
  { id: 'sobrecarga_fuerza', label: 'Sobrecarga / fuerza', description: 'Prioriza lastre y rest-pause controlado en ejercicios compatibles y clientes avanzados.' },
];

export const INTENSITY_TECHNIQUES: Record<IntensityTechniqueId, IntensityTechniquePrescription> = {
  lastre: {
    id: 'lastre',
    label: 'Lastre',
    category: 'Sobrecarga',
    execution: 'Añadir peso externo progresivo solo si el cliente domina el movimiento con técnica limpia.',
    caution: 'Usar en dominadas, fondos o ejercicios corporales dominados. No aplicar si hay dolor de hombro, codo o lumbar.',
  },
  drop_set: {
    id: 'drop_set',
    label: 'Drop set',
    category: 'Extensión de serie',
    execution: 'En la última serie, llegar cerca del fallo, bajar 20-30% el peso y continuar sin descanso con técnica controlada.',
    caution: 'Ideal en máquinas, poleas o aislamiento. Evitar en ejercicios libres pesados o principiantes.',
  },
  rest_pause: {
    id: 'rest_pause',
    label: 'Rest-pause',
    category: 'Extensión de serie',
    execution: 'Hacer una serie exigente, descansar 10-15 segundos y realizar repeticiones adicionales con el mismo peso.',
    caution: 'Aplicar con cargas moderadas y técnica estable. Evitar si la técnica se rompe o hay limitaciones activas.',
  },
  myo_reps: {
    id: 'myo_reps',
    label: 'Myo-reps',
    category: 'Extensión de serie',
    execution: 'Realizar una serie inicial de 12-15 repeticiones, descansar 15 segundos y hacer miniseries de 3-5 repeticiones.',
    caution: 'Usar en accesorios, máquinas y poleas. No usar en ejercicios complejos de alto riesgo técnico.',
  },
  superserie_antagonista: {
    id: 'superserie_antagonista',
    label: 'Superserie antagonista',
    category: 'Densidad',
    execution: 'Hacer este ejercicio y luego uno del músculo opuesto sin descanso; descansar al terminar ambos.',
    caution: 'Útil para ahorrar tiempo sin saturar un solo músculo. Mantener buena respiración y control.',
  },
  serie_compuesta: {
    id: 'serie_compuesta',
    label: 'Serie compuesta',
    category: 'Densidad',
    execution: 'Hacer dos ejercicios del mismo grupo muscular seguidos, sin descanso entre ellos.',
    caution: 'Alta fatiga local. Aplicar mejor en accesorios y evitar si afecta la técnica del ejercicio principal.',
  },
  triserie: {
    id: 'triserie',
    label: 'Triserie',
    category: 'Densidad',
    execution: 'Realizar tres ejercicios seguidos del mismo bloque muscular o zona, descansando al completar los tres.',
    caution: 'Usar en clientes intermedios/avanzados y en bloques GAP, brazos o abdomen. No abusar.',
  },
  serie_gigante: {
    id: 'serie_gigante',
    label: 'Serie gigante',
    category: 'Densidad',
    execution: 'Realizar cuatro o más ejercicios encadenados para una zona muscular, con descanso al final del bloque.',
    caution: 'Solo avanzado y con cargas moderadas. No usar si el cliente pierde control técnico.',
  },
  repeticiones_parciales: {
    id: 'repeticiones_parciales',
    label: 'Repeticiones parciales',
    category: 'Repeticiones modificadas',
    execution: 'Después de no poder completar el rango completo con buena técnica, realizar parciales controladas en el rango seguro.',
    caution: 'Solo en la última serie y en ejercicios seguros. No reemplaza el rango completo como base del ejercicio.',
  },
  excentrica_acentuada: {
    id: 'excentrica_acentuada',
    label: 'Excéntrica acentuada',
    category: 'Repeticiones modificadas',
    execution: 'Controlar la fase de bajada entre 4 y 6 segundos, manteniendo postura, respiración y control articular.',
    caution: 'Genera más fatiga y dolor muscular tardío. Bajar volumen si el cliente es principiante.',
  },
};
type ExerciseBucket =
  | 'upper'
  | 'lower'
  | 'push'
  | 'pull'
  | 'chest'
  | 'back'
  | 'glute'
  | 'quad'
  | 'hamstring'
  | 'calf'
  | 'core'
  | 'cardio'
  | 'arm'
  | 'biceps'
  | 'triceps'
  | 'shoulder'
  | 'adductor'
  | 'abductor';

type FocusPlan = {
  focus: string;
  split: TrainingSplit;
  buckets: ExerciseBucket[];
  desiredCount: number;
};

export const ROUTINE_MUSCLE_TARGETS: { id: RoutineMuscleTarget; label: string; shortLabel: string; description: string }[] = [
  { id: 'pecho', label: 'Pecho', shortLabel: 'Pecho', description: 'Presses, aperturas y pectoral.' },
  { id: 'espalda', label: 'Espalda', shortLabel: 'Espalda', description: 'Remo, jalones y dorsales.' },
  { id: 'hombro', label: 'Hombro', shortLabel: 'Hombro', description: 'Deltoides anterior, lateral y posterior.' },
  { id: 'biceps', label: 'Bíceps', shortLabel: 'Bíceps', description: 'Flexión de codo y braquial.' },
  { id: 'triceps', label: 'Tríceps', shortLabel: 'Tríceps', description: 'Extensión de codo y fondos.' },
  { id: 'pierna', label: 'Pierna completa', shortLabel: 'Pierna', description: 'Cuádriceps, femoral, glúteo y pantorrilla.' },
  { id: 'cuadriceps', label: 'Cuádriceps', shortLabel: 'Cuádriceps', description: 'Sentadilla, prensa y extensiones.' },
  { id: 'femoral', label: 'Femoral / Isquios', shortLabel: 'Femoral', description: 'Curl femoral y bisagra de cadera.' },
  { id: 'gluteo', label: 'Glúteo', shortLabel: 'Glúteo', description: 'Hip thrust, patadas en polea y búlgaras con mancuernas.' },
  { id: 'pantorrilla', label: 'Pantorrilla', shortLabel: 'Gemelo', description: 'Elevaciones sentado/de pie.' },
  { id: 'abdomen', label: 'Abdomen / Core', shortLabel: 'Core', description: 'Crunch en polea, rotación y trabajo controlado con mancuerna.' },
  { id: 'aductor', label: 'Aductor', shortLabel: 'Aductor', description: 'Trabajo interno de pierna.' },
  { id: 'abductor', label: 'Abductor', shortLabel: 'Abductor', description: 'Glúteo medio y lateral de cadera.' },
];

const MUSCLE_TARGET_BUCKETS: Record<RoutineMuscleTarget, ExerciseBucket[]> = {
  pecho: ['chest'],
  espalda: ['back'],
  hombro: ['shoulder'],
  biceps: ['biceps'],
  triceps: ['triceps'],
  pierna: ['quad', 'hamstring', 'glute', 'calf'],
  cuadriceps: ['quad'],
  femoral: ['hamstring'],
  gluteo: ['glute'],
  pantorrilla: ['calf'],
  abdomen: ['core'],
  aductor: ['adductor'],
  abductor: ['abductor'],
  cardio: ['cardio'],
};

const MUSCLE_TARGET_LABELS = ROUTINE_MUSCLE_TARGETS.reduce<Record<RoutineMuscleTarget, string>>((acc, item) => {
  acc[item.id] = item.shortLabel;
  return acc;
}, {} as Record<RoutineMuscleTarget, string>);

export type TrainingModePreset = {
  id: TrainingSplit;
  label: string;
  days: number;
  recommendedLevel: TrainingLevel;
  recommendedGoal: TrainingGoal;
  purpose: string;
  premiumDescription: string;
};

export const TRAINING_MODE_PRESETS: TrainingModePreset[] = [
  {
    id: 'full_body_3',
    label: 'Full Body 3 días',
    days: 3,
    recommendedLevel: 'Principiante',
    recommendedGoal: 'fuerza',
    purpose: 'Fuerza general y optimización de tiempo',
    premiumDescription: 'Trabaja todo el cuerpo tres veces por semana con ejercicios base, técnica segura y progresión gradual.',
  },
  {
    id: 'torso_pierna_4',
    label: 'Torso / Pierna 4 días',
    days: 4,
    recommendedLevel: 'Intermedio',
    recommendedGoal: 'fuerza',
    purpose: 'Equilibrio muscular y ganancia de fuerza',
    premiumDescription: 'Alterna torso y pierna para equilibrar volumen, recuperación y fuerza semanal.',
  },
  {
    id: 'ppl_3',
    label: 'Push / Pull / Legs 3 días',
    days: 3,
    recommendedLevel: 'Intermedio',
    recommendedGoal: 'hipertrofia',
    purpose: 'Hipertrofia estética con volumen moderado',
    premiumDescription: 'Divide empuje, jalón y piernas para entrenar con orden y mantener buena recuperación.',
  },
  {
    id: 'ppl_6',
    label: 'Push / Pull / Legs 6 días',
    days: 6,
    recommendedLevel: 'Avanzado',
    recommendedGoal: 'hipertrofia',
    purpose: 'Hipertrofia estética y alto volumen de entrenamiento',
    premiumDescription: 'Repite el patrón push, pull y legs dos veces por semana para mayor volumen y frecuencia.',
  },
  {
    id: 'arnold_6',
    label: 'Arnold Split 6 días',
    days: 6,
    recommendedLevel: 'Avanzado',
    recommendedGoal: 'hipertrofia',
    purpose: 'Desarrollo de brazos, torso y estética clásica',
    premiumDescription: 'Combina pecho/espalda, hombro/brazos y pierna para una rutina estética clásica de alto volumen.',
  },
  {
    id: 'gap',
    label: 'GAP 3 días',
    days: 3,
    recommendedLevel: 'Intermedio',
    recommendedGoal: 'hipertrofia',
    purpose: 'Glúteo, abdomen y pierna con enfoque estético',
    premiumDescription: 'Prioriza glúteo, abdomen, cuádriceps, femoral y pantorrilla sin mezclar con torso.',
  },
];

export function getTrainingModePreset(split: TrainingSplit): TrainingModePreset | undefined {
  return TRAINING_MODE_PRESETS.find((preset) => preset.id === split);
}

function prescription(goal: TrainingGoal, level: TrainingLevel, isIsolation = false): Rx {
  if (goal === 'fuerza') {
    return {
      sets: level === 'Avanzado' ? 5 : 4,
      reps: isIsolation ? '8-12' : level === 'Principiante' ? '5-6' : '3-6',
      rest: isIsolation ? '75-120s' : '150-240s',
      rir: '1-3 RIR',
      note: 'Fuerza: carga alta controlada, técnica prioritaria y progresión gradual.',
    };
  }
  if (goal === 'resistencia') {
    return { sets: 3, reps: '15-20', rest: '30-60s', rir: '2-4 RIR', note: 'Resistencia muscular: ritmo estable, control técnico y densidad progresiva.' };
  }
  if (goal === 'salud') {
    return { sets: level === 'Principiante' ? 2 : 3, reps: '10-15', rest: '60-90s', rir: '3-4 RIR', note: 'Salud sostenible: esfuerzo moderado, sin dolor y con buena ejecución.' };
  }
  return {
    sets: level === 'Principiante' ? 3 : level === 'Avanzado' ? 4 : 3,
    reps: isIsolation ? '10-15' : '8-12',
    rest: isIsolation ? '60-90s' : '75-120s',
    rir: '1-3 RIR',
    note: 'Hipertrofia: volumen efectivo, control excéntrico y progreso sin sacrificar técnica.',
  };
}

function normalize(text: string) {
  return text.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
}

function exerciseText(item: ExerciseCatalogItem) {
  return normalize(`${item.name} ${item.segment} ${item.movement} ${item.primaryMuscle} ${item.muscleGroups.join(' ')} ${item.equipment}`);
}

type PrimaryMuscleFamily =
  | 'chest'
  | 'back'
  | 'shoulder'
  | 'biceps'
  | 'triceps'
  | 'quad'
  | 'hamstring'
  | 'glute'
  | 'calf'
  | 'core'
  | 'adductor'
  | 'abductor'
  | 'cardio'
  | 'unknown';

const NON_HYPERTROPHY_EXERCISE_PATTERN = /\b(?:ninos?|infantil\w*|kids?|senior\w*|adultos? mayores?|geriatr\w*|ancian\w*|tercera edad|elderly|older adult|ejercicio en silla|chair exercise|rehabilit\w*|terapeut\w*|therap\w*|movilidad|estiramiento\w*|stretch\w*|foam|yoga|pilates|burpee\w*|salto\w*|jump\w*|skipping|carrera|running|sprint\w*|caminata|battle rope|soga de batalla|balon medicinal|medicine ball|fitball|exercise ball|bosu|bandas? elasticas?|peso corporal|body ?weight|body only|calisten\w*|calisthen\w*|push[ -]?ups?|flexion de pecho|dominadas?|pull[ -]?ups?|chin[ -]?ups?|fondos en banco)\b/;
const PROFESSIONAL_GYM_EQUIPMENT_PATTERN = /maquina|machine|polea|cable|mancuerna|mancuernas|dumbbell|smith|prensa|hack|hammer|peck deck|pec deck/;

function primaryMuscleFamily(item: ExerciseCatalogItem): PrimaryMuscleFamily {
  const primary = primaryMuscleText(item);
  if (!primary || /general|full body|cuerpo completo|otro/.test(primary)) return 'unknown';
  if (/cardio/.test(primary)) return 'cardio';
  if (/hombro posterior|deltoide posterior|rear delt/.test(primary)) return 'shoulder';
  if (/pecho|pectoral|chest/.test(primary)) return 'chest';
  if (/espalda|dorsal|latissimus|lats|middle back|lower back|trapecio|traps/.test(primary)) return 'back';
  if (/hombro|hombros|deltoide|shoulder/.test(primary)) return 'shoulder';
  if (/biceps|braquial/.test(primary)) return 'biceps';
  if (/triceps/.test(primary)) return 'triceps';
  if (/cuadriceps|quadriceps/.test(primary)) return 'quad';
  if (/femoral|isquio|hamstring/.test(primary)) return 'hamstring';
  if (/abductor/.test(primary)) return 'abductor';
  if (/aductor/.test(primary)) return 'adductor';
  if (/gluteo|glute/.test(primary)) return 'glute';
  if (/pantorrilla|gemelo|soleo|calf/.test(primary)) return 'calf';
  if (/abdomen|abdominal|oblicuo|core/.test(primary)) return 'core';
  return 'unknown';
}

/**
 * Regla cerrada del generador profesional.
 * Solo admite ejercicios de fuerza con músculo principal identificable y
 * ejecución en máquina, polea/cable, Smith o mancuernas. De esta forma la
 * base abierta puede seguir visible en la biblioteca, pero no introduce
 * cardio, movilidad, calistenia, rehabilitación ni ejercicios infantiles en
 * una rutina automática de hipertrofia.
 */
export function isHypertrophyGymExercise(item: ExerciseCatalogItem): boolean {
  if (!item.isActive || item.needsImageReview) return false;
  if (item.segment === 'cardio' || item.movement === 'cardio' || primaryMuscleFamily(item) === 'cardio') return false;
  if (primaryMuscleFamily(item) === 'unknown') return false;

  const nameAndEquipment = normalize(`${item.name} ${item.equipment}`);
  if (NON_HYPERTROPHY_EXERCISE_PATTERN.test(nameAndEquipment)) return false;
  return PROFESSIONAL_GYM_EQUIPMENT_PATTERN.test(normalize(item.equipment || ''));
}

function matchesGenerationBucket(item: ExerciseCatalogItem, bucket: ExerciseBucket) {
  if (!isHypertrophyGymExercise(item)) return false;
  const family = primaryMuscleFamily(item);
  if (bucket === 'upper') return ['chest', 'back', 'shoulder', 'biceps', 'triceps'].includes(family);
  if (bucket === 'lower') return ['quad', 'hamstring', 'glute', 'calf', 'adductor', 'abductor'].includes(family);
  if (bucket === 'push') return ['chest', 'shoulder', 'triceps'].includes(family);
  if (bucket === 'pull') return ['back', 'biceps'].includes(family);
  if (bucket === 'chest') return family === 'chest';
  if (bucket === 'back') return family === 'back';
  if (bucket === 'biceps') return family === 'biceps';
  if (bucket === 'triceps') return family === 'triceps';
  if (bucket === 'shoulder') return family === 'shoulder';
  if (bucket === 'quad') return family === 'quad';
  if (bucket === 'hamstring') return family === 'hamstring';
  if (bucket === 'glute') return family === 'glute';
  if (bucket === 'calf') return family === 'calf';
  if (bucket === 'adductor') return family === 'adductor';
  if (bucket === 'abductor') return family === 'abductor';
  if (bucket === 'core') return family === 'core';
  if (bucket === 'arm') return family === 'biceps' || family === 'triceps';
  return false;
}

function primaryMuscleText(item: ExerciseCatalogItem) {
  return normalize(item.primaryMuscle || '');
}

function isCardio(item: ExerciseCatalogItem) {
  return item.segment === 'cardio' || item.movement === 'cardio' || primaryMuscleFamily(item) === 'cardio';
}


const CARE_PATTERNS: Record<string, { mild: RegExp; moderate: RegExp }> = {
  rodilla: {
    mild: /sissy|salto|burpee|sentadilla libre|zancada/,
    moderate: /sissy|salto|burpee|sentadilla|zancada|prensa|hacka|extension de cuadriceps|step/,
  },
  hombro: {
    mild: /tras de nuca|press militar|fondos|elevacion frontal/,
    moderate: /press|fondos|peck|fly|apertura|elevacion|remo alto|pullover/,
  },
  lumbar: {
    mild: /buenos dias|peso muerto|remo inclinado|sentadilla libre/,
    moderate: /peso muerto|buenos dias|sentadilla|remo inclinado|hiperextension|crunch|sit up|burpee/,
  },
  codo: {
    mild: /fondos|press frances|extension de triceps/,
    moderate: /fondos|triceps|biceps|curl|press|extension de codo/,
  },
  muneca: {
    mild: /flexion|push up|fondos|curl con barra/,
    moderate: /press|flexion|push up|fondos|plancha|curl|barra/,
  },
  cadera: {
    mild: /sentadilla profunda|zancada|salto/,
    moderate: /sentadilla|zancada|prensa|hacka|hip thrust|puente|abductor|aductor|peso muerto/,
  },
  tobillo: {
    mild: /salto|burpee|pantorrilla de pie|caminadora/,
    moderate: /salto|burpee|pantorrilla|zancada|sentadilla|prensa|caminadora|step/,
  },
  cuello: {
    mild: /encogimiento|tras de nuca|press militar/,
    moderate: /encogimiento|tras de nuca|press militar|remo alto|sit up|crunch/,
  },
};

function activeLimitations(limitations: UserLimitationInput[] = []) {
  return limitations.filter((item) => (item.status || 'active') === 'active');
}

export function exerciseConflictsWithLimitations(
  item: ExerciseCatalogItem,
  client: ClientProfile,
  limitations: UserLimitationInput[] = [],
): boolean {
  const text = exerciseText(item);
  const active = activeLimitations(limitations);

  for (const limitation of active) {
    const patterns = CARE_PATTERNS[limitation.bodyArea];
    if (patterns) {
      const pattern = limitation.severity === 'leve' ? patterns.mild : patterns.moderate;
      if (pattern.test(text)) return true;
    }
    if (limitation.bodyArea === 'otro') {
      const notes = normalize(`${limitation.comment || ''} ${limitation.trainerNote || ''}`);
      if (/rodilla|rotula|menisco/.test(notes) && CARE_PATTERNS.rodilla.moderate.test(text)) return true;
      if (/hombro|manguito|supraespinoso/.test(notes) && CARE_PATTERNS.hombro.moderate.test(text)) return true;
      if (/lumbar|espalda baja|ciatica|columna/.test(notes) && CARE_PATTERNS.lumbar.moderate.test(text)) return true;
    }
  }

  const notes = normalize(`${client.injuries || ''} ${client.weaknesses || ''}`);
  if (/rodilla|rotula|menisco/.test(notes) && CARE_PATTERNS.rodilla.moderate.test(text)) return true;
  if (/hombro|manguito|supraespinoso/.test(notes) && CARE_PATTERNS.hombro.moderate.test(text)) return true;
  if (/lumbar|espalda baja|ciatica|columna/.test(notes) && CARE_PATTERNS.lumbar.moderate.test(text)) return true;
  return false;
}

function seedFromString(value: string) {
  let hash = 2166136261;
  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function seededShuffle<T>(items: T[], seed: number) {
  const copy = [...items];
  let state = seed || 1;
  const random = () => {
    state = Math.imul(1664525, state) + 1013904223;
    return (state >>> 0) / 4294967296;
  };
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

const HYPERTROPHY_EXERCISE_PRIORITY: Partial<Record<ExerciseBucket, RegExp[]>> = {
  chest: [
    /press (?:hammer|de pecho) en maquina|press hammer/,
    /press inclinado.*mancuerna/,
    /press (?:banca|plano).*mancuerna/,
    /pec?k deck|fly en maquina/,
    /cruce.*polea|apertura.*polea/,
    /apertura.*mancuerna/,
  ],
  back: [
    /jalon al pecho.*(?:polea|maquina)/,
    /remo (?:bajo|sentado).*?(?:polea|maquina)/,
    /remo.*barra t.*maquina/,
    /remo.*mancuerna/,
    /pullover.*polea/,
  ],
  shoulder: [
    /press.*hombro.*maquina|press militar en maquina/,
    /press.*mancuerna/,
    /elevacion lateral.*(?:mancuerna|polea|maquina)/,
    /fly posterior.*maquina|pec?k deck inversa/,
    /face pull|jalon a la cara/,
    /elevacion frontal/,
  ],
  biceps: [
    /curl.*maquina predicador|curl predicador.*maquina/,
    /curl.*polea/,
    /curl.*inclinado.*mancuerna/,
    /curl martillo.*mancuerna/,
    /curl.*mancuerna/,
  ],
  triceps: [
    /jalon.*triceps.*polea|extension.*triceps.*polea/,
    /extension.*por encima.*polea|extension.*tras nuca.*polea/,
    /fondos en maquina/,
    /extension.*mancuerna/,
    /patada.*triceps.*mancuerna/,
  ],
  quad: [
    /prensa 45|prensa de pierna/,
    /hack/,
    /extension de cuadriceps/,
    /sentadilla.*smith/,
    /bulgara.*mancuerna|zancada.*mancuerna/,
  ],
  hamstring: [
    /curl femoral sentado/,
    /curl femoral (?:tumbado|acostado)/,
    /curl femoral de pie/,
    /peso muerto rumano.*mancuerna/,
    /curl femoral.*polea/,
  ],
  glute: [
    /hip thrust.*(?:maquina|smith|mancuerna)/,
    /patada.*gluteo.*polea/,
    /bulgara.*mancuerna/,
    /abduccion.*(?:maquina|polea)/,
  ],
  calf: [
    /pantorrilla.*maquina.*(?:sentado|de pie)|talones.*maquina/,
    /pantorrilla.*prensa/,
    /pantorrilla.*mancuerna|talones.*mancuerna/,
  ],
  core: [
    /crunch.*maquina|encogimiento.*maquina/,
    /crunch.*polea|encogimiento.*polea/,
    /rotacion.*polea/,
    /elevacion de piernas.*mancuerna/,
  ],
  adductor: [/aductor.*maquina/, /aductor.*polea/],
  abductor: [/abductor.*maquina|abduccion.*maquina/, /abduccion.*polea|abductor.*polea/],
};

function priorityIndexForBucket(item: ExerciseCatalogItem, bucket: ExerciseBucket) {
  const patterns = HYPERTROPHY_EXERCISE_PRIORITY[bucket] || [];
  const text = exerciseText(item);
  return patterns.findIndex((pattern) => pattern.test(text));
}

function generationPriorityScore(item: ExerciseCatalogItem, buckets: ExerciseBucket[]) {
  const equipment = normalize(item.equipment || '');
  let score = 0;
  const preferredIndexes = buckets
    .filter((bucket) => matchesGenerationBucket(item, bucket))
    .map((bucket) => priorityIndexForBucket(item, bucket))
    .filter((index) => index >= 0);
  if (preferredIndexes.length) score += 320 - Math.min(...preferredIndexes) * 24;
  if (/maquina|machine|smith|prensa|hack|hammer|peck deck|pec deck/.test(equipment)) score += 90;
  if (/polea|cable/.test(equipment)) score += 78;
  if (/mancuerna|dumbbell/.test(equipment)) score += 70;
  if (!isOpenExerciseSource(item)) score += 20;
  if (item.imageUrl && !item.needsImageReview) score += 15;
  if (item.movement !== 'isolation' && item.movement !== 'core') score += 4;
  return score;
}

function prioritizePool(pool: ExerciseCatalogItem[], seed: number, buckets: ExerciseBucket[]) {
  return seededShuffle(pool, seed).sort((a, b) => generationPriorityScore(b, buckets) - generationPriorityScore(a, buckets));
}

function pickFromBucket(pool: ExerciseCatalogItem[], bucket: ExerciseBucket, selected: ExerciseCatalogItem[], max = 1) {
  const matches = pool.filter((item) => matchesGenerationBucket(item, bucket) && !selected.some((current) => current.id === item.id));
  selected.push(...matches.slice(0, max));
}

function completeWithPool(pool: ExerciseCatalogItem[], selected: ExerciseCatalogItem[], desiredCount: number) {
  for (const item of pool) {
    if (selected.length >= desiredCount) break;
    if (!selected.some((current) => current.id === item.id)) selected.push(item);
  }
  return selected.slice(0, desiredCount);
}

function resolveSplit(split: TrainingSplit, level: TrainingLevel, selectedDays: string[], goal: TrainingGoal): TrainingSplit {
  if (split !== 'auto') return split;
  const dayCount = selectedDays.length || 3;
  if (level === 'Principiante') return 'full_body_3';
  if (level === 'Intermedio' && dayCount >= 4) return 'torso_pierna_4';
  if (level === 'Avanzado' && dayCount >= 6 && goal === 'hipertrofia') return 'arnold_6';
  if (dayCount >= 6) return 'ppl_6';
  if (dayCount === 3) return 'ppl_3';
  return 'torso_pierna_4';
}

function normalizedDays(selectedDays: string[], split: TrainingSplit) {
  const preset = getTrainingModePreset(split);
  const desired = preset?.days || Math.max(selectedDays.length, 3);
  const ordered = TRAINING_DAYS.filter((day) => selectedDays.includes(day));
  const completed = [...ordered];
  for (const day of TRAINING_DAYS) {
    if (completed.length >= desired) break;
    if (!completed.includes(day)) completed.push(day);
  }
  return completed.slice(0, desired);
}

function uniqueBucketsFromTargets(targets: RoutineMuscleTarget[]) {
  const buckets: ExerciseBucket[] = [];
  for (const target of targets) {
    const mapped = MUSCLE_TARGET_BUCKETS[target] || [];
    for (const bucket of mapped) if (!buckets.includes(bucket)) buckets.push(bucket);
  }
  return buckets;
}

function splitForTargets(targets: RoutineMuscleTarget[]): TrainingSplit {
  const buckets = uniqueBucketsFromTargets(targets);
  const upper = buckets.some((bucket) => ['chest', 'back', 'shoulder', 'biceps', 'triceps', 'arm', 'push', 'pull', 'upper'].includes(bucket));
  const lower = buckets.some((bucket) => ['quad', 'hamstring', 'glute', 'calf', 'adductor', 'abductor', 'lower'].includes(bucket));
  const onlyPush = buckets.length > 0 && buckets.every((bucket) => ['chest', 'shoulder', 'triceps'].includes(bucket));
  const onlyPull = buckets.length > 0 && buckets.every((bucket) => ['back', 'biceps'].includes(bucket));
  if (lower && !upper) return 'pierna';
  if (upper && !lower && onlyPush) return 'push';
  if (upper && !lower && onlyPull) return 'pull';
  if (upper && !lower) return 'superior';
  if (lower && upper) return 'full_body';
  return 'full_body';
}

function desiredCountForTargets(targets: RoutineMuscleTarget[], goal: TrainingGoal, level: TrainingLevel) {
  const buckets = uniqueBucketsFromTargets(targets);
  const base = goal === 'fuerza' ? 5 : goal === 'salud' ? 5 : 6;
  const levelBonus = level === 'Avanzado' && goal !== 'salud' ? 1 : 0;
  const muscleDemand = Math.max(4, buckets.length + (buckets.length <= 2 ? 2 : 1));
  return Math.min(goal === 'fuerza' ? 7 : 8, Math.max(base + levelBonus, muscleDemand));
}

function focusNameForTargets(targets: RoutineMuscleTarget[]) {
  const labels = targets.map((target) => MUSCLE_TARGET_LABELS[target]).filter(Boolean);
  if (!labels.length) return 'Personalizado';
  return labels.join(' + ');
}

function buildCustomFocusPlans(plan: WeeklyTrainingDayPlan[] | undefined, goal: TrainingGoal, level: TrainingLevel) {
  if (!plan?.length) return [];
  return plan
    .filter((item) => item.day && item.muscleTargets.length)
    .map((item) => {
      const buckets = uniqueBucketsFromTargets(item.muscleTargets);
      return {
        focus: focusNameForTargets(item.muscleTargets),
        split: splitForTargets(item.muscleTargets),
        buckets: buckets.length ? buckets : ['quad', 'chest', 'back', 'core'],
        desiredCount: desiredCountForTargets(item.muscleTargets, goal, level),
      } satisfies FocusPlan;
    });
}

function loadGuidance(goal: TrainingGoal, level: TrainingLevel, isIsolation = false, cardio = false) {
  if (cardio) {
    if (goal === 'resistencia') return 'Carga/ritmo: zona 2-3 o intervalos moderados; respiración exigente pero controlable.';
    return 'Carga/ritmo: intensidad suave-moderada, sin interferir con la técnica de fuerza.';
  }
  if (goal === 'fuerza') {
    if (isIsolation) return 'Carga científica: 65-75% del máximo estimado, dejando 1-3 repeticiones en reserva.';
    if (level === 'Principiante') return 'Carga científica: 70-80% del máximo estimado o peso que permita 5-6 repeticiones limpias con 2-3 RIR.';
    return 'Carga científica: 80-90% del máximo estimado, 1-3 RIR, progresando solo si todas las series salen limpias.';
  }
  if (goal === 'resistencia') return 'Carga científica: 40-60% del máximo estimado, 2-4 RIR y técnica estable durante toda la serie.';
  if (goal === 'salud') return 'Carga científica: esfuerzo moderado, 3-4 RIR, sin dolor y con rango seguro.';
  if (isIsolation) return 'Carga científica: 55-70% del máximo estimado, 1-3 RIR y control total del rango.';
  return 'Carga científica: 60-80% del máximo estimado, 1-3 RIR; subir peso cuando complete el rango alto con buena técnica.';
}

function programFocuses(split: TrainingSplit): FocusPlan[] {
  if (split === 'full_body_3' || split === 'full_body') {
    return [
      { focus: 'Full Body A: fuerza general', split: 'full_body', buckets: ['quad', 'chest', 'back', 'glute', 'core', 'cardio'], desiredCount: 6 },
      { focus: 'Full Body B: posterior, empuje y jalón', split: 'full_body', buckets: ['hamstring', 'glute', 'push', 'pull', 'core', 'calf'], desiredCount: 6 },
      { focus: 'Full Body C: pierna, torso y abdomen', split: 'full_body', buckets: ['quad', 'hamstring', 'chest', 'back', 'shoulder', 'core'], desiredCount: 6 },
    ];
  }
  if (split === 'torso_pierna_4') {
    return [
      { focus: 'Torso A: pecho, espalda y hombro', split: 'superior', buckets: ['chest', 'back', 'shoulder', 'triceps', 'biceps'], desiredCount: 6 },
      { focus: 'Pierna A: cuádriceps, femoral y glúteo', split: 'inferior', buckets: ['quad', 'hamstring', 'glute', 'calf', 'core'], desiredCount: 6 },
      { focus: 'Torso B: jalón, empuje y brazos', split: 'superior', buckets: ['back', 'chest', 'shoulder', 'biceps', 'triceps'], desiredCount: 6 },
      { focus: 'Pierna B: glúteo, posterior y abdomen', split: 'inferior', buckets: ['glute', 'hamstring', 'quad', 'adductor', 'core', 'calf'], desiredCount: 6 },
    ];
  }
  if (split === 'ppl_3') {
    return [
      { focus: 'Push: pecho, hombro y tríceps', split: 'push', buckets: ['chest', 'shoulder', 'triceps', 'chest', 'triceps'], desiredCount: 6 },
      { focus: 'Pull: espalda y bíceps', split: 'pull', buckets: ['back', 'back', 'biceps', 'biceps', 'shoulder'], desiredCount: 6 },
      { focus: 'Legs: pierna completa', split: 'pierna', buckets: ['quad', 'hamstring', 'glute', 'calf', 'core'], desiredCount: 6 },
    ];
  }
  if (split === 'ppl_6') {
    return [
      { focus: 'Push A: pecho dominante', split: 'push', buckets: ['chest', 'chest', 'shoulder', 'triceps', 'triceps'], desiredCount: 6 },
      { focus: 'Pull A: espalda dominante', split: 'pull', buckets: ['back', 'back', 'biceps', 'biceps', 'shoulder'], desiredCount: 6 },
      { focus: 'Legs A: cuádriceps y glúteo', split: 'pierna', buckets: ['quad', 'quad', 'glute', 'hamstring', 'calf', 'core'], desiredCount: 6 },
      { focus: 'Push B: hombro y tríceps', split: 'push', buckets: ['shoulder', 'chest', 'triceps', 'triceps', 'chest'], desiredCount: 6 },
      { focus: 'Pull B: dorsal, remo y bíceps', split: 'pull', buckets: ['back', 'back', 'biceps', 'biceps', 'core'], desiredCount: 6 },
      { focus: 'Legs B: posterior, glúteo y abdomen', split: 'pierna', buckets: ['hamstring', 'glute', 'quad', 'calf', 'core', 'core'], desiredCount: 6 },
    ];
  }
  if (split === 'arnold_6') {
    return [
      { focus: 'Pecho + Espalda A', split: 'superior', buckets: ['chest', 'back', 'chest', 'back', 'core'], desiredCount: 6 },
      { focus: 'Hombro + Brazos A', split: 'superior', buckets: ['shoulder', 'shoulder', 'biceps', 'triceps', 'biceps', 'triceps'], desiredCount: 6 },
      { focus: 'Pierna + GAP A', split: 'pierna', buckets: ['quad', 'glute', 'hamstring', 'calf', 'core', 'abductor'], desiredCount: 6 },
      { focus: 'Pecho + Espalda B', split: 'superior', buckets: ['back', 'chest', 'back', 'chest', 'triceps', 'biceps'], desiredCount: 6 },
      { focus: 'Hombro + Brazos B', split: 'superior', buckets: ['shoulder', 'biceps', 'triceps', 'shoulder', 'biceps', 'triceps'], desiredCount: 6 },
      { focus: 'Pierna + GAP B', split: 'pierna', buckets: ['glute', 'hamstring', 'quad', 'adductor', 'calf', 'core'], desiredCount: 6 },
    ];
  }
  if (split === 'gap' || split === 'gap_abs') {
    return [
      { focus: 'GAP A: glúteo y abdomen', split: 'gap_abs', buckets: ['glute', 'glute', 'core', 'core', 'quad', 'abductor'], desiredCount: 6 },
      { focus: 'GAP B: pierna completa y core', split: 'gap_abs', buckets: ['quad', 'hamstring', 'glute', 'calf', 'core', 'core'], desiredCount: 6 },
      { focus: 'GAP C: glúteo, femoral y abdomen', split: 'gap_abs', buckets: ['glute', 'hamstring', 'glute', 'adductor', 'core', 'core'], desiredCount: 6 },
    ];
  }
  if (split === 'superior') return [{ focus: 'Tren superior', split: 'superior', buckets: ['chest', 'back', 'shoulder', 'biceps', 'triceps'], desiredCount: 6 }];
  if (split === 'inferior' || split === 'pierna') return [{ focus: 'Tren inferior', split: 'inferior', buckets: ['quad', 'hamstring', 'glute', 'calf', 'core'], desiredCount: 6 }];
  if (split === 'push') return [{ focus: 'Push', split: 'push', buckets: ['chest', 'shoulder', 'triceps', 'chest', 'triceps'], desiredCount: 6 }];
  if (split === 'pull') return [{ focus: 'Pull', split: 'pull', buckets: ['back', 'back', 'biceps', 'biceps', 'shoulder'], desiredCount: 6 }];
  return [{ focus: 'Full Body', split: 'full_body', buckets: ['quad', 'chest', 'back', 'glute', 'core', 'cardio'], desiredCount: 6 }];
}


function isBodyweightExercise(item: ExerciseCatalogItem) {
  const text = exerciseText(item);
  return /dominada|fondos|flexion|push up|peso corporal|calistenia/.test(text);
}

function isMachineOrCable(item: ExerciseCatalogItem) {
  const text = exerciseText(item);
  return /maquina|máquina|polea|cable|extension|extensión|curl femoral|prensa|peck|fly|abductor|aductor|smith/.test(text);
}

function isFreeBarRisky(item: ExerciseCatalogItem) {
  const text = exerciseText(item);
  return /sentadilla libre|peso muerto|remo inclinado|press militar|buenos dias|good morning/.test(text);
}

function isIsolationExercise(item: ExerciseCatalogItem) {
  return item.movement === 'isolation' || /curl|extension|extensión|elevacion|elevación|apertura|fly|abductor|aductor|pantorrilla|gemelo/.test(exerciseText(item));
}

function maxIntensityTechniquesPerDay(level: TrainingLevel, mode: TrainingIntensityMode) {
  if (mode === 'sin_tecnicas') return 0;
  if (level === 'Principiante') return mode === 'auto_inteligente' ? 1 : 0;
  if (level === 'Intermedio') return mode === 'ahorro_tiempo' ? 3 : 2;
  return mode === 'ahorro_tiempo' ? 4 : 3;
}

function techniqueAllowedForLevel(technique: IntensityTechniqueId, level: TrainingLevel, goal: TrainingGoal) {
  if (goal === 'salud') return technique === 'excentrica_acentuada';
  if (level === 'Principiante') return technique === 'excentrica_acentuada';
  if (level === 'Intermedio') return !['serie_gigante', 'lastre'].includes(technique);
  return true;
}

function candidateTechniqueForExercise(args: {
  item: ExerciseCatalogItem;
  index: number;
  dayIndex: number;
  dayLength: number;
  level: TrainingLevel;
  goal: TrainingGoal;
  split: TrainingSplit;
  mode: TrainingIntensityMode;
  focus: string;
}): IntensityTechniqueId | null {
  const { item, index, dayIndex, dayLength, level, goal, split, mode, focus } = args;
  if (mode === 'sin_tecnicas' || isCardio(item) || isFreeBarRisky(item)) return null;

  const lastHalf = index >= Math.floor(dayLength / 2);
  const lastExercise = index >= dayLength - 1;
  const isolation = isIsolationExercise(item);
  const machineOrCable = isMachineOrCable(item);
  const bodyweight = isBodyweightExercise(item);
  const f = normalize(focus);
  const isGapOrArms = /gap|gluteo|abdomen|brazo|biceps|triceps|hombro/.test(f) || split === 'gap' || split === 'arnold_6';

  if (mode === 'sobrecarga_fuerza') {
    if (level === 'Avanzado' && bodyweight && (goal === 'fuerza' || goal === 'hipertrofia')) return 'lastre';
    if (level !== 'Principiante' && machineOrCable && !lastExercise) return 'rest_pause';
    return null;
  }

  if (mode === 'ahorro_tiempo') {
    if (level === 'Avanzado' && isGapOrArms && index === 2) return 'triserie';
    if (level === 'Avanzado' && isGapOrArms && split === 'arnold_6' && index === 3) return 'serie_gigante';
    if (index % 2 === 0 && index < dayLength - 1) {
      if (/pecho.*espalda|espalda.*pecho/.test(f)) return 'superserie_antagonista';
      return isGapOrArms ? 'serie_compuesta' : 'superserie_antagonista';
    }
    return null;
  }

  if (mode === 'metabolico') {
    if (isolation && machineOrCable && lastHalf) return dayIndex % 2 === 0 ? 'drop_set' : 'myo_reps';
    if (isolation && lastExercise) return 'repeticiones_parciales';
    if (!isolation && !isFreeBarRisky(item) && lastHalf) return 'excentrica_acentuada';
    return null;
  }

  // auto_inteligente: pocas técnicas, seguras, al final del entrenamiento y según nivel.
  if (level === 'Principiante') {
    return lastExercise && !isFreeBarRisky(item) ? 'excentrica_acentuada' : null;
  }
  if (goal === 'fuerza') {
    if (level === 'Avanzado' && bodyweight && index <= 1) return 'lastre';
    if (machineOrCable && lastHalf) return 'rest_pause';
    return null;
  }
  if (goal === 'resistencia') {
    if (index % 2 === 0 && index < dayLength - 1) return 'superserie_antagonista';
    return lastExercise ? 'excentrica_acentuada' : null;
  }
  if (isolation && machineOrCable && lastHalf) return dayIndex % 2 === 0 ? 'drop_set' : 'myo_reps';
  if (lastExercise && !isFreeBarRisky(item)) return 'excentrica_acentuada';
  return null;
}

function buildIntensityTechnique(args: {
  item: ExerciseCatalogItem;
  index: number;
  dayIndex: number;
  dayLength: number;
  level: TrainingLevel;
  goal: TrainingGoal;
  split: TrainingSplit;
  mode: TrainingIntensityMode;
  focus: string;
  usedToday: number;
}): IntensityTechniquePrescription | undefined {
  const maxToday = maxIntensityTechniquesPerDay(args.level, args.mode);
  if (args.usedToday >= maxToday) return undefined;
  const id = candidateTechniqueForExercise(args);
  if (!id || !techniqueAllowedForLevel(id, args.level, args.goal)) return undefined;
  return INTENSITY_TECHNIQUES[id];
}

function intensitySummary(mode: TrainingIntensityMode, level: TrainingLevel) {
  const preset = TRAINING_INTENSITY_MODE_PRESETS.find((item) => item.id === mode);
  if (!preset || mode === 'sin_tecnicas') return 'Sin técnicas de intensidad añadidas; se prioriza ejecución limpia y progresión base.';
  return `${preset.label}: técnicas aplicadas con límite por día según nivel ${level}. Se usan solo en ejercicios compatibles y no reemplazan la técnica ni la progresión.`;
}

function pickExercises(plan: FocusPlan, level: TrainingLevel, client: ClientProfile, limitations: UserLimitationInput[], seed: number, catalog: ExerciseCatalogItem[], source: ExerciseSourceFilter) {
  const pool = catalog
    .filter((item) => item.isActive)
    .filter((item) => source === 'all' || (source === 'open' ? isOpenExerciseSource(item) : !isOpenExerciseSource(item)))
    .filter((item) => isHypertrophyGymExercise(item))
    .filter((item) => plan.buckets.some((bucket) => matchesGenerationBucket(item, bucket)))
    .filter((item) => level !== 'Principiante' || item.level !== 'avanzado')
    .filter((item) => !exerciseConflictsWithLimitations(item, client, limitations));

  const byPriority = prioritizePool(pool, seed, plan.buckets);
  const selected: ExerciseCatalogItem[] = [];
  for (const bucket of plan.buckets) pickFromBucket(byPriority, bucket, selected, 1);
  const completed = completeWithPool(byPriority, selected, plan.desiredCount);
  if (!completed.length) {
    throw new Error(`No hay ejercicios profesionales verificados para ${plan.focus}. Revisa el grupo muscular, la fuente o el catálogo activo.`);
  }
  return completed;
}

export function generateImperialRoutine(params: {
  client: ClientProfile;
  goal: TrainingGoal;
  level: TrainingLevel;
  selectedDays: string[];
  split?: TrainingSplit;
  rotationKey?: number;
  limitations?: UserLimitationInput[];
  intensityMode?: TrainingIntensityMode;
  exerciseCatalog?: ExerciseCatalogItem[];
  exerciseSource?: ExerciseSourceFilter;
  customWeeklyPlan?: WeeklyTrainingDayPlan[];
}): WorkoutRoutine {
  const customFocusPlans = buildCustomFocusPlans(params.customWeeklyPlan, params.goal, params.level);
  const hasCustomWeeklyPlan = customFocusPlans.length > 0;
  const customDays = TRAINING_DAYS.filter((day) => params.customWeeklyPlan?.some((item) => item.day === day && item.muscleTargets.length));
  const requestedSplit = hasCustomWeeklyPlan ? 'auto' : (params.split || 'auto');
  const resolvedSplit = hasCustomWeeklyPlan ? 'full_body' : resolveSplit(requestedSplit, params.level, params.selectedDays, params.goal);
  const days = hasCustomWeeklyPlan ? customDays : normalizedDays(params.selectedDays, resolvedSplit);
  const rotationKey = params.rotationKey || Date.now();
  const limitations = activeLimitations(params.limitations || []);
  const intensityMode: TrainingIntensityMode = params.intensityMode || 'auto_inteligente';
  const exerciseSource: ExerciseSourceFilter = params.exerciseSource || 'all';
  const catalog = (params.exerciseCatalog && params.exerciseCatalog.length ? params.exerciseCatalog : EXERCISE_CATALOG)
    .filter((item) => item.isActive)
    .filter((item) => exerciseSource === 'all' || (exerciseSource === 'open' ? isOpenExerciseSource(item) : !isOpenExerciseSource(item)));
  if (!catalog.length) {
    throw new Error(`No hay ejercicios disponibles para la fuente seleccionada: ${sourceLabel(exerciseSource)}.`);
  }
  const highSeverity = limitations.filter((item) => item.severity === 'alta');
  if (highSeverity.length > 0) {
    const zones = highSeverity.map((item) => BODY_AREA_LABELS[item.bodyArea]).join(', ');
    throw new Error(`Revisión profesional obligatoria antes de generar: limitación alta en ${zones}.`);
  }

  const preset = hasCustomWeeklyPlan ? undefined : (getTrainingModePreset(resolvedSplit) || getTrainingModePreset('full_body_3'));
  const focusPlans = hasCustomWeeklyPlan ? customFocusPlans : programFocuses(resolvedSplit);
  const excludedExerciseIds = new Set<string>();
  const routineDays = days.map((day, index) => {
    const plan = focusPlans[index % focusPlans.length];
    const seed = seedFromString(`${params.client.id}-${params.goal}-${params.level}-${resolvedSplit}-${plan.focus}-${rotationKey}-${index}`);
    catalog
      .filter((item) => item.isActive && isHypertrophyGymExercise(item) && plan.buckets.some((bucket) => matchesGenerationBucket(item, bucket)))
      .filter((item) => params.level !== 'Principiante' || item.level !== 'avanzado')
      .filter((item) => exerciseConflictsWithLimitations(item, params.client, limitations))
      .forEach((item) => excludedExerciseIds.add(String(item.id)));
    const selected = pickExercises(plan, params.level, params.client, limitations, seed, catalog, exerciseSource);
    let usedIntensityToday = 0;
    const workingExercises = selected.map((ex, exerciseIndex) => {
      const isIsolation = ex.movement === 'isolation' || ex.movement === 'core';
      const rx = prescription(params.goal, params.level, isIsolation);
      const cardio = isCardio(ex);
      const loadPrescription = loadGuidance(params.goal, params.level, isIsolation, cardio);
      const intensityTechnique = buildIntensityTechnique({
        item: ex,
        index: exerciseIndex,
        dayIndex: index,
        dayLength: selected.length,
        level: params.level,
        goal: params.goal,
        split: resolvedSplit,
        mode: intensityMode,
        focus: plan.focus,
        usedToday: usedIntensityToday,
      });
      if (intensityTechnique) usedIntensityToday += 1;
      const techniqueNote = intensityTechnique
        ? ` Técnica de intensidad: ${intensityTechnique.label}. ${intensityTechnique.execution} Cuidado: ${intensityTechnique.caution}`
        : '';
      return {
        exerciseId: ex.id,
        name: ex.name,
        sets: cardio ? 1 : rx.sets,
        reps: cardio ? (params.goal === 'resistencia' ? '12-20 min' : '8-12 min') : rx.reps,
        rest: cardio ? 'Libre controlado' : rx.rest,
        equipment: ex.equipment,
        segment: ex.segment,
        block: inferRoutineBlock(ex),
        imageUrl: ex.imageUrl,
        muscleGroups: ex.muscleGroups,
        intensityTechnique,
        notes: `${rx.note} ${loadPrescription} Descanso: ${cardio ? 'ritmo conversacional o por intervalos suaves' : rx.rest}. Intensidad base: ${rx.rir}. Equipo: ${ex.equipment}. Músculos: ${ex.muscleGroups.join(', ')}. ${ex.coachingNotes || ''}${techniqueNote}`.trim(),
      };
    });
    const exercises = [
      ...buildWarmupExercises(plan.focus),
      ...workingExercises,
    ];
    return { day, focus: plan.focus, exercises };
  });

  const splitLabel = hasCustomWeeklyPlan ? 'Semana personalizada por músculos' : (preset?.label || 'Automática inteligente');
  const splitPurpose = hasCustomWeeklyPlan ? 'Distribución semanal definida por entrenador' : (preset?.purpose || 'Rutina ajustada por nivel, objetivo y disponibilidad semanal');
  const splitDescription = hasCustomWeeklyPlan
    ? 'Cada día respeta los grupos musculares escogidos manualmente, permitiendo combinar pecho, espalda, pierna, glúteo, hombro, bíceps, tríceps, core u otros músculos en el mismo día.'
    : (preset?.premiumDescription || 'Entrenamiento generado con estructura inteligente y reemplazos equivalentes por grupo muscular.');

  return {
    id: `routine-${params.client.id}-${rotationKey}`,
    clientId: params.client.id,
    clientName: params.client.name,
    title: `Imperial ${splitLabel} - ${params.goal.toUpperCase()} - ${params.level}`,
    objective: `${splitPurpose}. ${splitDescription} Se respetan grupos musculares, objetivo, nivel, días disponibles y la fuente de ejercicios seleccionada: ${sourceLabel(exerciseSource)}. ${intensitySummary(intensityMode, params.level)}`,
    generatedDate: new Date().toISOString().split('T')[0],
    days: routineDays,
    specialistAdvice: `Modo aplicado: ${splitLabel}. Fuente de ejercicios: ${sourceLabel(exerciseSource)}. ${splitPurpose}. ${intensitySummary(intensityMode, params.level)} Los cambios selectivos deben reemplazar ejercicios por equivalentes del mismo grupo muscular para conservar la progresión. ${limitationSummary(limitations)}. Las técnicas de intensidad se aplican solo donde el ejercicio lo permite; si la técnica degrada la ejecución, se elimina y se conserva la serie tradicional. Detener el ejercicio ante dolor nuevo, fuerte o progresivo y solicitar revisión profesional.`,
    autoGenerated: true,
    safetyReviewRequired: false,
    safetySummary: limitationSummary(limitations),
    excludedExercisesCount: excludedExerciseIds.size,
  };
}
