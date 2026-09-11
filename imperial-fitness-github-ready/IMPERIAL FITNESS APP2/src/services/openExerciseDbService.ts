import { ExerciseCatalogItem, ExerciseMovement, ExerciseSegment } from '../data/exerciseCatalog';
import { safeGetItem, safeParseJson, safeSetItem } from '../utils/safeStorage';

const OPEN_EXERCISE_DB_URL = String(
  import.meta.env.VITE_OPEN_EXERCISE_DB_URL ||
    'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/dist/exercises.json',
);
const OPEN_EXERCISE_IMAGE_PREFIX = String(
  import.meta.env.VITE_OPEN_EXERCISE_IMAGE_PREFIX ||
    'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/',
);
const OPEN_EXERCISE_ENABLED = import.meta.env.VITE_ENABLE_OPEN_EXERCISE_DB !== 'false';
const CACHE_KEY = 'imperial_open_exercise_db_v4_es_names_routine';
const CACHE_TTL_MS = 1000 * 60 * 60 * 24;
const FETCH_TIMEOUT_MS = Number(import.meta.env.VITE_OPEN_EXERCISE_TIMEOUT_MS || 9000);

interface OpenExerciseDbRawItem {
  id?: string;
  name?: string;
  force?: string | null;
  level?: string | null;
  mechanic?: string | null;
  equipment?: string | null;
  primaryMuscles?: string[];
  secondaryMuscles?: string[];
  instructions?: string[];
  category?: string | null;
  images?: string[];
}

interface OpenExerciseCache {
  savedAt: number;
  items: ExerciseCatalogItem[];
}

const muscleTranslations: Record<string, string> = {
  abdominals: 'abdomen',
  abductors: 'abductores',
  adductors: 'aductores',
  biceps: 'bíceps',
  calves: 'pantorrillas',
  chest: 'pecho',
  forearms: 'antebrazo',
  glutes: 'glúteos',
  hamstrings: 'isquiotibiales',
  lats: 'dorsales',
  'lower back': 'espalda baja',
  'middle back': 'espalda media',
  neck: 'cuello',
  quadriceps: 'cuádriceps',
  shoulders: 'hombros',
  traps: 'trapecio',
  triceps: 'tríceps',
};

const equipmentTranslations: Record<string, string> = {
  bands: 'Bandas elásticas',
  barbell: 'Barra',
  'body only': 'Peso corporal',
  cable: 'Polea / cable',
  dumbbell: 'Mancuernas',
  'e-z curl bar': 'Barra Z',
  exercise: 'Equipo de ejercicio',
  'exercise ball': 'Fitball',
  foam: 'Foam roller',
  kettlebells: 'Kettlebell',
  machine: 'Máquina',
  'medicine ball': 'Balón medicinal',
  other: 'Otro equipo',
};


const exerciseNamePhraseTranslations: Record<string, string> = {
  'smith machine': 'máquina Smith',
  'e-z curl bar': 'barra Z',
  'ez bar': 'barra Z',
  'medicine ball': 'balón medicinal',
  'exercise ball': 'fitball',
  'stability ball': 'fitball',
  'foam roll': 'foam roller',
  'body only': 'peso corporal',
  'bodyweight': 'peso corporal',
  'close-grip': 'agarre cerrado',
  'close grip': 'agarre cerrado',
  'wide-grip': 'agarre amplio',
  'wide grip': 'agarre amplio',
  'reverse-grip': 'agarre inverso',
  'reverse grip': 'agarre inverso',
  'single-arm': 'unilateral',
  'single arm': 'unilateral',
  'one-arm': 'unilateral',
  'one arm': 'unilateral',
  'single-leg': 'a una pierna',
  'single leg': 'a una pierna',
  'alternating': 'alterno',
  'alternate': 'alterno',
  'incline': 'inclinado',
  'decline': 'declinado',
  'flat bench': 'banco plano',
  'bench press': 'press de banca',
  'chest press': 'press de pecho',
  'shoulder press': 'press de hombro',
  'military press': 'press militar',
  'leg press': 'prensa de pierna',
  'leg extension': 'extensión de cuádriceps',
  'leg curl': 'curl femoral',
  'calf raise': 'elevación de pantorrillas',
  'lateral raise': 'elevación lateral',
  'front raise': 'elevación frontal',
  'rear delt': 'deltoide posterior',
  'face pull': 'face pull',
  'lat pulldown': 'jalón al pecho',
  'pulldown': 'jalón',
  'pull-up': 'dominada',
  'pull up': 'dominada',
  'chin-up': 'dominada supina',
  'chin up': 'dominada supina',
  'push-up': 'flexión de pecho',
  'push up': 'flexión de pecho',
  'dip': 'fondos',
  'dips': 'fondos',
  'triceps extension': 'extensión de tríceps',
  'biceps curl': 'curl de bíceps',
  'hammer curl': 'curl martillo',
  'preacher curl': 'curl predicador',
  'concentration curl': 'curl concentrado',
  'wrist curl': 'curl de muñeca',
  'squat': 'sentadilla',
  'front squat': 'sentadilla frontal',
  'full squat': 'sentadilla profunda',
  'hack squat': 'sentadilla hack',
  'split squat': 'sentadilla búlgara',
  'deadlift': 'peso muerto',
  'romanian deadlift': 'peso muerto rumano',
  'stiff-legged deadlift': 'peso muerto piernas rígidas',
  'stiff leg deadlift': 'peso muerto piernas rígidas',
  'good morning': 'buenos días',
  'hip thrust': 'hip thrust',
  'glute bridge': 'puente de glúteos',
  'lunge': 'zancada',
  'step-up': 'step up',
  'step up': 'step up',
  'crunch': 'crunch abdominal',
  'sit-up': 'abdominal sit-up',
  'sit up': 'abdominal sit-up',
  'leg raise': 'elevación de piernas',
  'knee raise': 'elevación de rodillas',
  'plank': 'plancha',
  'side plank': 'plancha lateral',
  'russian twist': 'giro ruso',
  'mountain climber': 'escaladora abdominal',
  'burpee': 'burpee',
  'row': 'remo',
  'seated row': 'remo sentado',
  'upright row': 'remo al mentón',
  'bent over row': 'remo inclinado',
  't-bar row': 'remo en barra T',
  'fly': 'apertura',
  'flyes': 'aperturas',
  'pullover': 'pullover',
  'shrug': 'encogimiento',
  'extension': 'extensión',
  'curl': 'curl',
  'raise': 'elevación',
  'press': 'press',
  'lying': 'acostado',
  'seated': 'sentado',
  'standing': 'de pie',
  'reverse': 'inverso',
  'weighted': 'con peso',
  'assisted': 'asistido',
  'high': 'alto',
  'low': 'bajo',
};

const equipmentNameSuffixes: Record<string, string> = {
  barbell: 'con barra',
  dumbbell: 'con mancuernas',
  cable: 'en polea',
  machine: 'en máquina',
  'smith machine': 'en máquina Smith',
  kettlebells: 'con kettlebell',
  kettlebell: 'con kettlebell',
  bands: 'con bandas elásticas',
  band: 'con banda elástica',
  'medicine ball': 'con balón medicinal',
  'exercise ball': 'con fitball',
  'e-z curl bar': 'con barra Z',
};

function titleCaseSpanish(value: string): string {
  const lowercaseWords = new Set(['de', 'del', 'con', 'en', 'a', 'y', 'para', 'por', 'al']);
  return value
    .replace(/\s+/g, ' ')
    .trim()
    .split(' ')
    .map((word, index) => {
      if (index > 0 && lowercaseWords.has(word)) return word;
      return word.charAt(0).toLocaleUpperCase('es-CO') + word.slice(1);
    })
    .join(' ')
    .replace(/\bEz\b/g, 'EZ')
    .replace(/\bSmith\b/g, 'Smith')
    .replace(/\bFace Pull\b/g, 'Face Pull')
    .replace(/\bHip Thrust\b/g, 'Hip Thrust');
}

function replaceExerciseNamePhrases(value: string): string {
  let result = value
    .toLowerCase()
    .replace(/[()]/g, ' ')
    .replace(/[\/_,]+/g, ' ')
    .replace(/\s+-\s+/g, ' ')
    .replace(/[^a-z0-9áéíóúñü\s-]/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  const entries = Object.entries(exerciseNamePhraseTranslations).sort((a, b) => b[0].length - a[0].length);
  for (const [english, spanish] of entries) {
    const pattern = new RegExp(`(^|\\s)${english.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}($|\\s)`, 'g');
    result = result.replace(pattern, (_match, start, end) => `${start}${spanish}${end}`);
  }
  return result
    .replace(/\binclinado press de banca\b/g, 'press de banca inclinado')
    .replace(/\bdeclinado press de banca\b/g, 'press de banca declinado')
    .replace(/\binclinado apertura\b/g, 'apertura inclinada')
    .replace(/\bdeclinado apertura\b/g, 'apertura declinada')
    .replace(/\s+/g, ' ')
    .trim();
}

export function translateOpenExerciseName(rawName: string, equipment?: string | null): string {
  const normalized = rawName.toLowerCase().replace(/\s+/g, ' ').trim();
  const equipmentKey = (equipment || '').toLowerCase();
  const prefixCandidates = Object.keys(equipmentNameSuffixes).sort((a, b) => b.length - a.length);
  const prefix = prefixCandidates.find(candidate => normalized.startsWith(`${candidate} `));

  let translated: string;
  if (prefix) {
    const remainder = normalized.slice(prefix.length).trim();
    translated = `${replaceExerciseNamePhrases(remainder)} ${equipmentNameSuffixes[prefix]}`;
  } else {
    translated = replaceExerciseNamePhrases(normalized);
    const suffix = equipmentNameSuffixes[equipmentKey];
    if (suffix && !translated.includes(suffix) && !translated.includes('barra') && !translated.includes('mancuerna') && !translated.includes('polea') && !translated.includes('máquina')) {
      translated = `${translated} ${suffix}`;
    }
  }

  return titleCaseSpanish(translated || rawName);
}

function normalizeId(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function translateMuscle(muscle?: string | null): string {
  if (!muscle) return 'general';
  return muscleTranslations[muscle.toLowerCase()] || muscle.toLowerCase();
}

function translateEquipment(equipment?: string | null): string {
  if (!equipment) return 'Equipo variable';
  return equipmentTranslations[equipment.toLowerCase()] || equipment;
}

function inferSegment(primaryMuscle: string, category?: string | null): ExerciseSegment {
  const normalized = primaryMuscle.toLowerCase();
  if (category?.toLowerCase() === 'cardio') return 'cardio';
  if (['abdomen'].includes(normalized)) return 'core';
  if (['cuádriceps', 'isquiotibiales', 'glúteos', 'pantorrillas', 'aductores', 'abductores'].includes(normalized)) return 'inferior';
  return 'superior';
}

function inferMovement(primaryMuscle: string, category?: string | null, force?: string | null): ExerciseMovement {
  const normalized = primaryMuscle.toLowerCase();
  const normalizedCategory = category?.toLowerCase() || '';
  const normalizedForce = force?.toLowerCase() || '';
  if (normalizedCategory === 'cardio') return 'cardio';
  if (normalized === 'abdomen') return 'core';
  if (['cuádriceps', 'pantorrillas', 'aductores', 'abductores', 'glúteos'].includes(normalized)) return 'legs';
  if (['isquiotibiales', 'espalda baja'].includes(normalized)) return 'hinge';
  if (normalizedForce === 'push' || ['pecho', 'hombros', 'tríceps'].includes(normalized)) return 'push';
  if (normalizedForce === 'pull' || ['dorsales', 'espalda media', 'bíceps', 'antebrazo', 'trapecio'].includes(normalized)) return 'pull';
  return 'isolation';
}

function mapLevel(level?: string | null): ExerciseCatalogItem['level'] {
  const normalized = level?.toLowerCase();
  if (normalized === 'beginner') return 'principiante';
  if (normalized === 'intermediate') return 'intermedio';
  if (normalized === 'expert') return 'avanzado';
  return 'todos';
}

function spanishMovementCue(movement: ExerciseMovement, primaryMuscle: string, equipment: string): string {
  const base = `Trabaja principalmente ${primaryMuscle} usando ${equipment}.`;
  switch (movement) {
    case 'push':
      return `${base} Empuja con control, mantén hombros estables y regresa lento hasta el rango seguro.`;
    case 'pull':
      return `${base} Jala guiando con los codos, evita impulsarte y controla el regreso hasta sentir tensión.`;
    case 'legs':
      return `${base} Alinea rodillas con pies, baja controlado y sube empujando el suelo sin perder postura.`;
    case 'hinge':
      return `${base} Lleva la cadera atrás, conserva la espalda neutra y termina extendiendo la cadera sin arquear la zona lumbar.`;
    case 'core':
      return `${base} Activa abdomen antes de moverte, respira controlado y evita tensión en cuello o zona lumbar.`;
    case 'cardio':
      return `${base} Mantén ritmo progresivo, respiración estable y técnica limpia durante todo el movimiento.`;
    case 'full_body':
      return `${base} Coordina piernas, abdomen y tren superior; prioriza técnica antes que velocidad.`;
    default:
      return `${base} Haz el recorrido completo con control, pausa breve en la contracción y vuelve lento sin usar impulso.`;
  }
}

function buildCoachingNotes(movement: ExerciseMovement, primaryMuscle: string, equipment: string): string {
  return spanishMovementCue(movement, primaryMuscle, equipment);
}

function imageUrlsFor(raw: OpenExerciseDbRawItem): string[] {
  return (raw.images || [])
    .filter(Boolean)
    .map(path => `${OPEN_EXERCISE_IMAGE_PREFIX}${path}`);
}

export function mapOpenExerciseDbItem(raw: OpenExerciseDbRawItem): ExerciseCatalogItem | null {
  if (!raw.name) return null;
  const primary = translateMuscle(raw.primaryMuscles?.[0]);
  const secondary = (raw.secondaryMuscles || []).map(translateMuscle).filter(Boolean);
  const muscleGroups = Array.from(new Set([primary, ...secondary].filter(Boolean)));
  const id = `open-${normalizeId(raw.id || raw.name)}`;
  const category = raw.category || 'strength';
  const imageUrls = imageUrlsFor(raw);
  const imageUrl = imageUrls[0] || '';
  const imageEndUrl = imageUrls[1] || '';
  const hasRangePair = Boolean(imageUrl && imageEndUrl);
  const equipment = translateEquipment(raw.equipment);
  const movement = inferMovement(primary, category, raw.force);

  return {
    id,
    name: translateOpenExerciseName(raw.name, raw.equipment),
    segment: inferSegment(primary, category),
    movement,
    primaryMuscle: primary,
    muscleGroups: muscleGroups.length ? muscleGroups : ['general'],
    equipment,
    imageUrl,
    imageStartUrl: imageUrl || undefined,
    imageEndUrl: imageEndUrl || undefined,
    alternateImageUrls: imageUrls.length > 1 ? imageUrls : undefined,
    mediaType: hasRangePair ? 'range-pair' : imageUrl ? 'open-source' : 'image',
    mediaSource: 'free-exercise-db',
    mediaLicense: 'Unlicense / dominio público',
    attribution: 'yuhonas/free-exercise-db; imágenes servidas desde raw.githubusercontent.com',
    mediaNotes: hasRangePair
      ? 'Base abierta con dos fotos: inicio y final del movimiento. Imperial Fitness las muestra como recorrido visual con flechas y simulación tipo GIF; reemplazable por animación propia.'
      : 'Foto estática de base abierta. La app agrega guía de rango en español; reemplazable por GIF, WebP animado, video MP4 o contenido propio Imperial Fitness.',
    level: mapLevel(raw.level),
    isActive: true,
    isVisible: true,
    isRoutineEligible: Boolean(imageUrl && primary !== 'general'),
    reviewStatus: 'approved',
    source: 'free-exercise-db',
    needsImageReview: !imageUrl,
    coachingNotes: buildCoachingNotes(movement, primary, equipment),
  };
}

function readCache(): ExerciseCatalogItem[] {
  const cached = safeParseJson<OpenExerciseCache | null>(safeGetItem(CACHE_KEY), null);
  if (!cached || !Array.isArray(cached.items)) return [];
  if (Date.now() - cached.savedAt > CACHE_TTL_MS) return [];
  return cached.items;
}

function saveCache(items: ExerciseCatalogItem[]) {
  if (!items.length) return;
  safeSetItem(CACHE_KEY, JSON.stringify({ savedAt: Date.now(), items } satisfies OpenExerciseCache));
}

async function fetchWithTimeout(url: string): Promise<Response> {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    return await fetch(url, {
      signal: controller.signal,
      headers: { Accept: 'application/json' },
      cache: 'force-cache',
    });
  } finally {
    window.clearTimeout(timeout);
  }
}

export async function loadOpenExerciseDbItems(): Promise<ExerciseCatalogItem[]> {
  if (!OPEN_EXERCISE_ENABLED) return [];

  const cached = readCache();
  try {
    const response = await fetchWithTimeout(OPEN_EXERCISE_DB_URL);
    if (!response.ok) throw new Error(`Open exercise DB responded ${response.status}`);
    const rawItems = (await response.json()) as OpenExerciseDbRawItem[];
    const mapped = rawItems.map(mapOpenExerciseDbItem).filter((item): item is ExerciseCatalogItem => Boolean(item));
    saveCache(mapped);
    return mapped;
  } catch {
    return cached;
  }
}

export function openExerciseDbSourceLabel() {
  return 'free-exercise-db · Unlicense';
}
