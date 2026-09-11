import { apiRequest } from './api';

export type TrainingStatus = 'trained' | 'later' | 'missed' | 'rest';
export type NutritionStatus = 'completed' | 'partial' | 'missed' | 'later';

export interface DailyCheckinPayload {
  training_status: TrainingStatus;
  nutrition_status: NutritionStatus;
  planned_training_time?: string;
  mood?: string;
  notes?: string;
}

export interface DailyCheckinApi extends DailyCheckinPayload {
  id: number;
  user_id: number;
  checkin_date: string;
  source: string;
  created_at: string;
  updated_at: string;
}

export interface CheckinClientSummaryApi {
  user_id: number;
  name: string;
  email: string;
  phone_number?: string | null;
  whatsapp_opt_in: number;
  assigned_trainer_id?: number | null;
  last_checkin_date?: string | null;
  last_training_status?: TrainingStatus | null;
  last_nutrition_status?: NutritionStatus | null;
  training_done: number;
  training_later: number;
  training_missed: number;
  nutrition_completed: number;
  nutrition_partial: number;
  nutrition_missed: number;
  days_without_checkin: number;
  adherence_score: number;
  risk_level: 'Bajo' | 'Medio' | 'Alto';
}

export async function getTodayCheckinFromApi(): Promise<DailyCheckinApi | null> {
  return apiRequest<DailyCheckinApi | null>('/checkins/today');
}

export async function submitTodayCheckinToApi(payload: DailyCheckinPayload): Promise<DailyCheckinApi> {
  return apiRequest<DailyCheckinApi>('/checkins/today', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function listMyRecentCheckinsFromApi(days = 14): Promise<DailyCheckinApi[]> {
  return apiRequest<DailyCheckinApi[]>(`/checkins/me/recent?days=${days}`);
}

export async function getCheckinSummaryFromApi(days = 7): Promise<CheckinClientSummaryApi[]> {
  return apiRequest<CheckinClientSummaryApi[]>(`/checkins/admin/summary?days=${days}`);
}
