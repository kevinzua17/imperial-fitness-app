import { apiRequest } from './api';
import { ExerciseCatalogItem } from '../data/exerciseCatalog';
import { uploadExerciseImageToApi as uploadExerciseImageMedia } from './mediaService';

interface ApiExercise {
  id: string | number;
  name: string;
  description?: string;
  category?: string;
  segment?: ExerciseCatalogItem['segment'];
  movement?: ExerciseCatalogItem['movement'];
  movement_pattern?: ExerciseCatalogItem['movement'];
  primary_muscle?: string;
  muscle_groups?: string[] | string;
  secondary_muscles?: string[] | string;
  equipment?: string;
  image_url?: string;
  animation_url?: string;
  video_url?: string;
  media_type?: ExerciseCatalogItem['mediaType'];
  media_source?: string;
  media_license?: string;
  attribution?: string;
  media_notes?: string;
  level?: ExerciseCatalogItem['level'];
  is_active?: boolean;
  is_visible?: boolean;
  is_routine_eligible?: boolean;
  review_status?: 'pending' | 'approved' | 'rejected';
  source?: string;
  needs_image_review?: boolean;
  coaching_notes?: string;
  coach_notes?: string;
}

function normalizeApi(item: ApiExercise): ExerciseCatalogItem {
  const rawGroups = item.secondary_muscles ?? item.muscle_groups;
  const groups = Array.isArray(rawGroups)
    ? rawGroups
    : typeof rawGroups === 'string'
    ? rawGroups.split(',').map(v => v.trim()).filter(Boolean)
    : [];
  return {
    id: String(item.id),
    name: item.name,
    segment: item.segment || 'superior',
    movement: item.movement || item.movement_pattern || 'isolation',
    primaryMuscle: item.primary_muscle || groups[0] || 'general',
    muscleGroups: groups.length ? groups : [item.primary_muscle || 'general'],
    equipment: item.equipment || 'Equipo Imperial Fitness',
    imageUrl: item.image_url || '',
    animationUrl: item.animation_url || '',
    videoUrl: item.video_url || '',
    mediaType: item.media_type,
    mediaSource: item.media_source || '',
    mediaLicense: item.media_license || '',
    attribution: item.attribution || '',
    mediaNotes: item.media_notes || '',
    level: item.level || 'todos',
    isActive: item.is_active !== false,
    isVisible: item.is_visible !== false,
    isRoutineEligible: item.is_routine_eligible !== false,
    reviewStatus: item.review_status || 'approved',
    source: item.source || (item.media_source?.toLowerCase().includes('free-exercise-db') ? 'free-exercise-db' : 'imperial'),
    needsImageReview: item.needs_image_review || !item.image_url,
    coachingNotes: item.coach_notes || item.coaching_notes || item.description || '',
  };
}

function toApi(item: ExerciseCatalogItem) {
  return {
    name: item.name,
    description: item.coachingNotes || '',
    image_url: item.imageUrl || '',
    category: item.primaryMuscle || 'general',
    segment: item.segment,
    movement_pattern: item.movement,
    primary_muscle: item.primaryMuscle,
    secondary_muscles: item.muscleGroups,
    equipment: item.equipment,
    level: item.level,
    is_active: item.isActive,
    is_visible: item.isVisible !== false,
    is_routine_eligible: item.isRoutineEligible !== false,
    review_status: item.reviewStatus || 'approved',
    source: item.source || (item.mediaSource?.toLowerCase().includes('free-exercise-db') ? 'free-exercise-db' : 'imperial'),
    coach_notes: item.coachingNotes || '',
  };
}

export async function listExercisesFromApi(includeInactive = false): Promise<ExerciseCatalogItem[]> {
  const query = includeInactive ? '?include_inactive=true&limit=1000' : '?limit=1000';
  const rows = await apiRequest<ApiExercise[]>(`/exercises${query}`);
  return rows.map(normalizeApi);
}

export async function createExerciseInApi(item: ExerciseCatalogItem): Promise<ExerciseCatalogItem> {
  const row = await apiRequest<ApiExercise>('/exercises', { method: 'POST', body: JSON.stringify(toApi(item)) });
  return normalizeApi(row);
}

export async function updateExerciseInApi(id: string, item: ExerciseCatalogItem): Promise<ExerciseCatalogItem> {
  const row = await apiRequest<ApiExercise>(`/exercises/${encodeURIComponent(id)}`, { method: 'PUT', body: JSON.stringify(toApi(item)) });
  return normalizeApi(row);
}

export async function uploadExerciseImageToApi(exerciseId: string, file: File): Promise<string> {
  return uploadExerciseImageMedia(exerciseId, file);
}
