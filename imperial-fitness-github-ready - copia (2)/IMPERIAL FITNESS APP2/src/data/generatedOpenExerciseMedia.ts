import { ExerciseMediaType } from './exerciseCatalog';

export interface OpenExerciseMediaRecord {
  id?: string;
  name: string;
  imageUrl?: string;
  animationUrl?: string;
  videoUrl?: string;
  mediaType?: ExerciseMediaType;
  mediaSource: string;
  mediaLicense: string;
  attribution?: string;
  mediaNotes?: string;
}

// Este archivo queda versionado para integración rápida con bases abiertas.
// Por defecto inicia vacío para no incluir contenido externo sin validación de licencia.
// El script scripts/import_open_exercise_media.py puede poblarlo desde una base descargada legalmente.
export const GENERATED_OPEN_EXERCISE_MEDIA: OpenExerciseMediaRecord[] = [];
