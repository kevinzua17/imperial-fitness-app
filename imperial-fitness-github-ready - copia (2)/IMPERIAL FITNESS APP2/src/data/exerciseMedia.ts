import {
  ExerciseCatalogItem,
  ExerciseMediaType,
  findExerciseByName,
  normalizeExerciseName,
} from "./exerciseCatalog";
import { GENERATED_OPEN_EXERCISE_MEDIA } from "./generatedOpenExerciseMedia";

export type ExerciseMediaKind =
  | "video"
  | "animation"
  | "image"
  | "motion-preview"
  | "range-pair"
  | "empty";

export interface ExerciseRangeStep {
  phase: "Inicio" | "Recorrido" | "Final";
  cue: string;
}

export interface ExerciseResolvedMedia {
  kind: ExerciseMediaKind;
  mediaType: ExerciseMediaType;
  src?: string;
  imageUrl?: string;
  imageStartUrl?: string;
  imageEndUrl?: string;
  alternateImageUrls?: string[];
  animationUrl?: string;
  videoUrl?: string;
  source: string;
  license: string;
  attribution?: string;
  notes?: string;
  techniqueSteps: string[];
  commonMistakes: string[];
  rangeSteps: ExerciseRangeStep[];
  tempoCue: string;
}

type ExerciseMediaInput = Partial<ExerciseCatalogItem> & { name: string };

type MovementPreset = Pick<
  ExerciseResolvedMedia,
  "techniqueSteps" | "commonMistakes" | "rangeSteps" | "tempoCue"
>;

const DEFAULT_SOURCE = "Imperial Fitness";
const DEFAULT_LICENSE = "Biblioteca interna / pendiente de licencia específica";

const MOVEMENT_PRESETS: Record<
  ExerciseCatalogItem["movement"],
  MovementPreset
> = {
  push: {
    techniqueSteps: [
      "Ajusta el apoyo y estabiliza escápulas.",
      "Empuja sin perder control del tronco.",
      "Regresa lento y evita bloquear articulaciones.",
    ],
    commonMistakes: [
      "Rebotar el peso.",
      "Perder la postura del hombro.",
      "Bloquear codos con fuerza.",
    ],
    rangeSteps: [
      {
        phase: "Inicio",
        cue: "Coloca manos o agarre firme, hombros abajo y abdomen activo.",
      },
      {
        phase: "Recorrido",
        cue: "Empuja en línea controlada hasta extender sin perder la postura.",
      },
      {
        phase: "Final",
        cue: "Detente antes de bloquear fuerte y vuelve lento hasta sentir tensión segura.",
      },
    ],
    tempoCue:
      "Ritmo sugerido: 2 segundos subir · 1 segundo controlar · 2 segundos bajar.",
  },
  pull: {
    techniqueSteps: [
      "Inicia con pecho alto y abdomen activo.",
      "Jala llevando codos hacia atrás o hacia abajo.",
      "Controla la fase de regreso sin soltar tensión.",
    ],
    commonMistakes: [
      "Jalar con impulso.",
      "Encoger hombros.",
      "Cerrar el recorrido antes de tiempo.",
    ],
    rangeSteps: [
      {
        phase: "Inicio",
        cue: "Empieza con brazos extendidos, pecho alto y hombros lejos de las orejas.",
      },
      {
        phase: "Recorrido",
        cue: "Jala guiando con los codos, no con las manos, manteniendo control.",
      },
      {
        phase: "Final",
        cue: "Aprieta espalda/bíceps un momento y regresa hasta estirar sin soltar tensión.",
      },
    ],
    tempoCue:
      "Ritmo sugerido: 1-2 segundos jalar · 1 segundo apretar · 2-3 segundos regresar.",
  },
  legs: {
    techniqueSteps: [
      "Apoya pies firmes y alinea rodillas con la punta del pie.",
      "Desciende controlado manteniendo tensión.",
      "Sube empujando el suelo sin colapsar rodillas.",
    ],
    commonMistakes: [
      "Valgo de rodilla.",
      "Perder estabilidad del core.",
      "Recortar el rango sin necesidad.",
    ],
    rangeSteps: [
      {
        phase: "Inicio",
        cue: "Pies firmes, abdomen activo y rodillas alineadas con la punta de los pies.",
      },
      {
        phase: "Recorrido",
        cue: "Desciende o flexiona hasta tu rango seguro sin perder talones ni postura.",
      },
      {
        phase: "Final",
        cue: "Sube empujando el suelo y termina fuerte sin hiperextender rodillas.",
      },
    ],
    tempoCue:
      "Ritmo sugerido: 2-3 segundos bajar · pausa corta · subir con control.",
  },
  hinge: {
    techniqueSteps: [
      "Lleva cadera atrás con columna neutra.",
      "Mantén el peso cerca del cuerpo.",
      "Extiende cadera sin hiperextender la espalda.",
    ],
    commonMistakes: [
      "Redondear zona lumbar.",
      "Alejar la carga del cuerpo.",
      "Convertir el movimiento en sentadilla.",
    ],
    rangeSteps: [
      {
        phase: "Inicio",
        cue: "Carga cerca del cuerpo, espalda neutra y rodillas suavemente flexionadas.",
      },
      {
        phase: "Recorrido",
        cue: "Lleva la cadera atrás como si cerraras una puerta, manteniendo tensión posterior.",
      },
      {
        phase: "Final",
        cue: "Extiende la cadera apretando glúteos sin arquear la zona lumbar.",
      },
    ],
    tempoCue:
      "Ritmo sugerido: 3 segundos bajar · 1 segundo sentir estiramiento · subir firme.",
  },
  isolation: {
    techniqueSteps: [
      "Fija la articulación principal.",
      "Mueve con rango limpio y controlado.",
      "Aprieta el músculo objetivo sin compensar.",
    ],
    commonMistakes: [
      "Usar impulso.",
      "Cambiar la postura para ayudar la carga.",
      "Acelerar la fase excéntrica.",
    ],
    rangeSteps: [
      {
        phase: "Inicio",
        cue: "Estabiliza el cuerpo y deja fija la articulación que no debe moverse.",
      },
      {
        phase: "Recorrido",
        cue: "Mueve solo el segmento objetivo con control, sin balancear el cuerpo.",
      },
      {
        phase: "Final",
        cue: "Aprieta el músculo, pausa breve y regresa lento hasta el estiramiento.",
      },
    ],
    tempoCue:
      "Ritmo sugerido: 2 segundos subir · 1 segundo apretar · 3 segundos bajar.",
  },
  core: {
    techniqueSteps: [
      "Activa abdomen antes de iniciar.",
      "Mantén respiración controlada.",
      "Evita tensión innecesaria en cuello o lumbar.",
    ],
    commonMistakes: [
      "Tirar del cuello.",
      "Arquear la espalda baja.",
      "Perder control respiratorio.",
    ],
    rangeSteps: [
      {
        phase: "Inicio",
        cue: "Bloquea el abdomen, pelvis estable y cuello relajado.",
      },
      {
        phase: "Recorrido",
        cue: "Acerca costillas y pelvis o resiste el movimiento según el ejercicio.",
      },
      {
        phase: "Final",
        cue: "Mantén control abdominal y vuelve sin dejar caer la zona lumbar.",
      },
    ],
    tempoCue:
      "Ritmo sugerido: movimiento lento, respiración controlada y tensión constante.",
  },
  cardio: {
    techniqueSteps: [
      "Inicia suave y aumenta ritmo progresivamente.",
      "Mantén postura alta y respiración estable.",
      "Reduce intensidad si pierdes técnica.",
    ],
    commonMistakes: [
      "Arrancar demasiado fuerte.",
      "Descuidar pisada o impacto.",
      "Ignorar fatiga técnica.",
    ],
    rangeSteps: [
      {
        phase: "Inicio",
        cue: "Empieza con postura alta, respiración nasal/bucal controlada y ritmo bajo.",
      },
      {
        phase: "Recorrido",
        cue: "Mantén cadencia estable, pasos seguros y brazos coordinados.",
      },
      {
        phase: "Final",
        cue: "Reduce intensidad gradualmente y conserva técnica hasta terminar.",
      },
    ],
    tempoCue:
      "Ritmo sugerido: sostenible; sube intensidad solo si mantienes técnica.",
  },
  full_body: {
    techniqueSteps: [
      "Coordina piernas, core y tren superior.",
      "Prioriza técnica antes de velocidad.",
      "Mantén ritmo sostenible durante toda la serie.",
    ],
    commonMistakes: [
      "Desordenar la secuencia.",
      "Sacrificar técnica por intensidad.",
      "Perder respiración.",
    ],
    rangeSteps: [
      {
        phase: "Inicio",
        cue: "Organiza postura, respiración y tensión del core antes de moverte.",
      },
      {
        phase: "Recorrido",
        cue: "Coordina piernas, tronco y brazos en una secuencia limpia.",
      },
      {
        phase: "Final",
        cue: "Termina estable, sin perder balance, y reinicia cada repetición con control.",
      },
    ],
    tempoCue: "Ritmo sugerido: control primero, velocidad después.",
  },
};

function cleanUrl(value?: string | null): string | undefined {
  const cleaned = value?.trim();
  if (!cleaned || cleaned.includes("undefined") || cleaned === "null")
    return undefined;
  return cleaned;
}

function inferMediaType(
  src: string | undefined,
  fallback: ExerciseMediaType = "image",
): ExerciseMediaType {
  if (!src) return fallback;
  const normalized = src.toLowerCase().split("?")[0];
  if (
    normalized.endsWith(".mp4") ||
    normalized.endsWith(".webm") ||
    normalized.endsWith(".mov")
  )
    return "video";
  if (normalized.endsWith(".gif")) return "gif";
  if (normalized.endsWith(".webp")) return "animated-webp";
  return fallback;
}

export function getExerciseMedia(
  input: ExerciseMediaInput,
): ExerciseResolvedMedia {
  const catalogItem = findExerciseByName(input.name);
  const normalizedInput = normalizeExerciseName(input.name);
  const openMedia = GENERATED_OPEN_EXERCISE_MEDIA.find(
    (record) =>
      normalizeExerciseName(record.name) === normalizedInput ||
      normalizedInput.includes(normalizeExerciseName(record.name)) ||
      normalizeExerciseName(record.name).includes(normalizedInput),
  );
  const item: ExerciseMediaInput = {
    ...catalogItem,
    ...openMedia,
    ...input,
    name: input.name || catalogItem?.name || openMedia?.name || "Ejercicio",
  };
  const movement = item.movement || catalogItem?.movement || "isolation";
  const preset = MOVEMENT_PRESETS[movement];
  const imageUrl = cleanUrl(item.imageUrl || catalogItem?.imageUrl);
  const imageStartUrl = cleanUrl(item.imageStartUrl || item.imageUrl || catalogItem?.imageStartUrl || catalogItem?.imageUrl);
  const imageEndUrl = cleanUrl(item.imageEndUrl || catalogItem?.imageEndUrl);
  const alternateImageUrls = (item.alternateImageUrls || catalogItem?.alternateImageUrls || [])
    .map(cleanUrl)
    .filter((url): url is string => Boolean(url));
  const animationUrl = cleanUrl(item.animationUrl || catalogItem?.animationUrl);
  const videoUrl = cleanUrl(item.videoUrl || catalogItem?.videoUrl);
  const source =
    item.mediaSource ||
    catalogItem?.mediaSource ||
    (animationUrl || videoUrl ? "Fuente externa configurada" : DEFAULT_SOURCE);
  const license =
    item.mediaLicense || catalogItem?.mediaLicense || DEFAULT_LICENSE;
  const attribution = item.attribution || catalogItem?.attribution;
  const techniqueSteps = item.techniqueSteps?.length
    ? item.techniqueSteps
    : catalogItem?.techniqueSteps?.length
      ? catalogItem.techniqueSteps
      : preset.techniqueSteps;
  const commonMistakes = item.commonMistakes?.length
    ? item.commonMistakes
    : catalogItem?.commonMistakes?.length
      ? catalogItem.commonMistakes
      : preset.commonMistakes;

  if (videoUrl) {
    return {
      kind: "video",
      mediaType: "video",
      src: videoUrl,
      imageUrl,
      imageStartUrl,
      imageEndUrl,
      alternateImageUrls,
      animationUrl,
      videoUrl,
      source,
      license,
      attribution,
      notes: item.mediaNotes || catalogItem?.mediaNotes,
      techniqueSteps,
      commonMistakes,
      rangeSteps: preset.rangeSteps,
      tempoCue: preset.tempoCue,
    };
  }

  if (animationUrl) {
    return {
      kind: "animation",
      mediaType: inferMediaType(
        animationUrl,
        item.mediaType || "animated-webp",
      ),
      src: animationUrl,
      imageUrl,
      imageStartUrl,
      imageEndUrl,
      alternateImageUrls,
      animationUrl,
      videoUrl,
      source,
      license,
      attribution,
      notes: item.mediaNotes || catalogItem?.mediaNotes,
      techniqueSteps,
      commonMistakes,
      rangeSteps: preset.rangeSteps,
      tempoCue: preset.tempoCue,
    };
  }

  if (imageStartUrl && imageEndUrl && imageStartUrl !== imageEndUrl) {
    return {
      kind: "range-pair",
      mediaType: item.mediaType || catalogItem?.mediaType || "range-pair",
      src: imageStartUrl,
      imageUrl: imageStartUrl,
      imageStartUrl,
      imageEndUrl,
      alternateImageUrls: alternateImageUrls.length ? alternateImageUrls : [imageStartUrl, imageEndUrl],
      animationUrl,
      videoUrl,
      source,
      license,
      attribution,
      notes:
        item.mediaNotes ||
        catalogItem?.mediaNotes ||
        "Vista inicio/final generada con las dos imágenes disponibles de la base abierta. No es video real, pero permite entender el recorrido y se puede reemplazar por GIF, WebP animado o MP4.",
      techniqueSteps,
      commonMistakes,
      rangeSteps: preset.rangeSteps,
      tempoCue: preset.tempoCue,
    };
  }

  if (imageUrl) {
    return {
      kind: "motion-preview",
      mediaType: item.mediaType || catalogItem?.mediaType || "imperial-motion",
      src: imageUrl,
      imageUrl,
      imageStartUrl,
      imageEndUrl,
      alternateImageUrls,
      animationUrl,
      videoUrl,
      source,
      license,
      attribution,
      notes:
        item.mediaNotes ||
        catalogItem?.mediaNotes ||
        "Vista técnica rápida generada sobre imagen estática. Reemplazable por GIF, WebP animado o MP4.",
      techniqueSteps,
      commonMistakes,
      rangeSteps: preset.rangeSteps,
      tempoCue: preset.tempoCue,
    };
  }

  return {
    kind: "empty",
    mediaType: item.mediaType || "image",
    source,
    license,
    attribution,
    notes: item.mediaNotes || catalogItem?.mediaNotes,
    techniqueSteps,
    commonMistakes,
    rangeSteps: preset.rangeSteps,
    tempoCue: preset.tempoCue,
  };
}

export function hasTrueMotion(media: ExerciseResolvedMedia): boolean {
  return media.kind === "video" || media.kind === "animation";
}

export function mediaKindLabel(media: ExerciseResolvedMedia): string {
  if (media.kind === "video") return "Video técnico";
  if (media.kind === "animation")
    return media.mediaType === "gif" ? "GIF animado" : "Animación";
  if (media.kind === "range-pair") return "Inicio → final";
  if (media.kind === "motion-preview") return "Guía de rango";
  return "Sin visual";
}
