import { ProgressPhoto } from '../data/mockData';
import { API_URL, apiRequest } from './api';

interface ApiProgressPhoto {
  id: number;
  client_id: number;
  image_url: string;
  label: 'Frente' | 'Espalda' | 'Perfil' | 'Libre' | string;
  weight?: number | null;
  body_fat?: number | null;
  created_at: string;
}

function absoluteImageUrl(imageUrl: string): string {
  if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
    return imageUrl;
  }
  if (imageUrl.startsWith('/')) {
    return `${API_URL}${imageUrl}`;
  }
  return imageUrl;
}

function mapProgressPhoto(photo: ApiProgressPhoto): ProgressPhoto {
  return {
    id: String(photo.id),
    url: absoluteImageUrl(photo.image_url),
    date: new Date(photo.created_at).toLocaleDateString('es-CO', { day: 'numeric', month: 'short', year: 'numeric' }),
    weight: photo.weight || 0,
    bodyFat: photo.body_fat || 0,
    label: (photo.label as ProgressPhoto['label']) || 'Libre',
  };
}

export async function listProgressPhotosFromApi(clientId: string): Promise<ProgressPhoto[]> {
  const photos = await apiRequest<ApiProgressPhoto[]>(`/progress/photos?client_id=${encodeURIComponent(clientId)}`);
  return photos.map(mapProgressPhoto);
}

export async function uploadProgressPhotoToApi(payload: {
  clientId: string;
  file: File;
  label: ProgressPhoto['label'];
  weight?: number;
  bodyFat?: number;
}): Promise<ProgressPhoto> {
  const formData = new FormData();
  formData.append('client_id', payload.clientId);
  formData.append('label', payload.label);
  if (payload.weight !== undefined) formData.append('weight', String(payload.weight));
  if (payload.bodyFat !== undefined) formData.append('body_fat', String(payload.bodyFat));
  formData.append('file', payload.file);

  const photo = await apiRequest<ApiProgressPhoto>('/progress/photos/upload', {
    method: 'POST',
    body: formData,
  });
  return mapProgressPhoto(photo);
}

export interface BodyMetricApi {
  id: number;
  user_id: number;
  weight: number;
  muscle_mass: number;
  body_fat: number;
  visceral_fat?: number | null;
  bmr?: number | null;
  bmr_source?: 'inbody' | 'mifflin_st_jeor' | 'recorded_bmr' | 'manual' | null;
  bmi?: number | null;
  measured_at?: string | null;
  recorded_at?: string | null;
  created_at: string;
}

export interface WorkoutSetApi {
  id: number;
  user_id: number;
  exercise_name: string;
  weight_kg: number;
  reps: number;
  set_number: number;
  rir?: number | null;
  notes?: string;
  suggestion: string;
  created_at: string;
}

export async function createBodyMetricInApi(payload: {
  userId: string;
  weight: number;
  muscleMass: number;
  bodyFat: number;
  visceralFat?: number;
  bmr?: number;
  bmrSource?: 'inbody' | 'mifflin_st_jeor' | 'manual';
  bmi?: number;
  measuredAt?: string;
}): Promise<BodyMetricApi> {
  return apiRequest<BodyMetricApi>('/progress/body-metrics', {
    method: 'POST',
    body: JSON.stringify({
      user_id: Number(payload.userId),
      weight: payload.weight,
      muscle_mass: payload.muscleMass,
      body_fat: payload.bodyFat,
      visceral_fat: payload.visceralFat,
      bmr: payload.bmr,
      bmr_source: payload.bmrSource,
      bmi: payload.bmi,
      measured_at: payload.measuredAt,
    }),
  });
}

export async function updateBodyMetricInApi(metricId: number, payload: {
  weight: number;
  muscleMass: number;
  bodyFat: number;
  visceralFat?: number;
  bmr?: number;
  bmrSource?: 'inbody' | 'mifflin_st_jeor' | 'manual';
  bmi?: number;
  measuredAt?: string;
}): Promise<BodyMetricApi> {
  return apiRequest<BodyMetricApi>(`/progress/body-metrics/${metricId}`, {
    method: 'PATCH',
    body: JSON.stringify({
      weight: payload.weight,
      muscle_mass: payload.muscleMass,
      body_fat: payload.bodyFat,
      visceral_fat: payload.visceralFat,
      bmr: payload.bmr,
      bmr_source: payload.bmrSource,
      bmi: payload.bmi,
      measured_at: payload.measuredAt,
    }),
  });
}

export async function listBodyMetricsFromApi(userId: string): Promise<BodyMetricApi[]> {
  return apiRequest<BodyMetricApi[]>(`/progress/history/${encodeURIComponent(userId)}`, { cache: 'no-store' });
}

export async function createWorkoutSetInApi(payload: {
  userId: string;
  exerciseName: string;
  weightKg: number;
  reps: number;
  setNumber: number;
  rir?: number;
  notes?: string;
}): Promise<WorkoutSetApi> {
  return apiRequest<WorkoutSetApi>('/progress/workout-sets', {
    method: 'POST',
    body: JSON.stringify({
      user_id: Number(payload.userId),
      exercise_name: payload.exerciseName,
      weight_kg: payload.weightKg,
      reps: payload.reps,
      set_number: payload.setNumber,
      rir: payload.rir,
      notes: payload.notes || '',
    }),
  });
}

export async function listWorkoutHistoryFromApi(userId: string, exerciseName?: string): Promise<WorkoutSetApi[]> {
  const suffix = exerciseName ? `?exercise_name=${encodeURIComponent(exerciseName)}` : '';
  return apiRequest<WorkoutSetApi[]>(`/progress/workout-history/${encodeURIComponent(userId)}${suffix}`);
}