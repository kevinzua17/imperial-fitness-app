import { apiRequest } from './api';

export type GamificationActionKind = 'water' | 'sleep' | 'mental' | 'progress';
export type HabitCategory = 'training' | 'nutrition' | 'water' | 'sleep' | 'mental' | 'mobility' | 'gym' | 'custom';
export type HabitTargetType = 'boolean' | 'number' | 'weight' | 'reps' | 'minutes';
export type StrengthGoalStatus = 'active' | 'completed' | 'paused';
export type GamificationPeriod = '7d' | '30d' | '90d' | '180d' | '365d' | 'current_month' | 'previous_month';
export type GamificationAdminPeriod = '7d' | '30d' | '60d' | '90d' | '180d' | '365d';

export interface GamificationStatusApi {
  level: number;
  title: string;
  xp: number;
  imperial_coins: number;
  streak_shields: number;
  prestige?: number;
}

export interface GamificationStreakApi {
  streak_type: string;
  label: string;
  current_count: number;
  best_count: number;
  last_date?: string | null;
}

export interface GamificationNotificationApi {
  id: number;
  title: string;
  message: string;
  is_read?: boolean;
  type?: string;
  created_at?: string;
}

export interface GamificationMissionApi {
  key: string;
  title: string;
  xp: number;
  coins: number;
  completed: boolean;
  habit_id?: number;
  category?: HabitCategory;
  target_type?: HabitTargetType;
  target_value?: number;
  unit?: string;
  current_value?: number;
  editable?: boolean;
  streak?: number;
}

export interface GamificationBadgeApi {
  badge_key: string;
  title: string;
  description: string;
  tier?: string;
  earned_at?: string;
}

export interface HabitApi {
  id: number;
  user_id: number;
  title: string;
  category: HabitCategory;
  target_type: HabitTargetType;
  target_value: number;
  unit: string;
  frequency_days: number;
  sort_order: number;
  active: number;
  is_default: number;
  created_at?: string;
  updated_at?: string;
  completed_today?: boolean;
  current_value_today?: number;
  current_streak?: number;
  weekly_completed?: number;
  period_target?: number;
  weekly_grid?: {
    date: string;
    label: string;
    completed: boolean;
    current_value?: number;
    is_today?: boolean;
  }[];
}

export interface HabitInput {
  title: string;
  category: HabitCategory;
  target_type?: HabitTargetType;
  target_value?: number;
  unit?: string;
  frequency_days?: number;
}

export interface HabitCompletionInput {
  date?: string;
  completed: boolean;
  current_value?: number;
  note?: string;
}

export interface StrengthGoalApi {
  id: number;
  user_id: number;
  exercise_name: string;
  base_weight_kg: number;
  current_weight_kg: number;
  target_weight_kg: number;
  target_reps: number;
  increment_kg: number;
  status: StrengthGoalStatus;
  target_date?: string | null;
  next_weight_kg?: number | null;
  last_reps?: number | null;
  last_logged_at?: string | null;
  suggestion?: string;
  progress_percent: number;
  created_at?: string;
  updated_at?: string;
  period_logs?: StrengthLogApi[];
}

export interface StrengthGoalInput {
  exercise_name: string;
  base_weight_kg: number;
  target_weight_kg: number;
  target_reps?: number;
  increment_kg?: number;
  target_date?: string;
}

export interface StrengthLogInput {
  weight_kg: number;
  reps: number;
  sets?: number;
  rir?: number;
  note?: string;
}

export interface StrengthLogApi {
  id: number;
  user_id: number;
  goal_id: number;
  exercise_name: string;
  weight_kg: number;
  reps: number;
  sets: number;
  rir?: number | null;
  next_weight_kg: number;
  deload_recommended: number;
  suggestion: string;
  created_at: string;
}

export interface WeeklySummaryApi {
  period?: GamificationPeriod | string;
  period_label?: string;
  week_start: string;
  week_end: string;
  total_habit_slots: number;
  completed_habit_slots: number;
  remaining_habit_slots: number;
  completion_percent: number;
  days: { date: string; label: string; completed: number; total: number; percent: number }[];
}

export interface MyGamificationApi {
  status: GamificationStatusApi;
  streaks: GamificationStreakApi[];
  notifications: GamificationNotificationApi[];
  daily_missions: GamificationMissionApi[];
  habits: HabitApi[];
  strength_goals: StrengthGoalApi[];
  weekly_summary: WeeklySummaryApi;
  badges: GamificationBadgeApi[];
  recent_events?: { event_key: string; points: number; coins: number; reason: string; created_at: string }[];
}

export interface AdminGamificationSummaryApi {
  period?: GamificationAdminPeriod | string;
  period_start?: string;
  period_end?: string;
  user_id: number;
  name: string;
  phone_number?: string | null;
  whatsapp_opt_in?: boolean;
  level: number;
  title: string;
  xp: number;
  imperial_coins: number;
  training_streak: number;
  nutrition_streak: number;
  perfect_streak: number;
  active_habits?: number;
  weekly_habit_target?: number;
  weekly_habit_completions?: number;
  weekly_habit_percent?: number;
  active_strength_goals?: number;
  completed_strength_goals?: number;
  strength_progress_percent?: number;
  strength_logs_count?: number;
  last_strength_log_at?: string | null;
  last_checkin_date?: string | null;
}

export async function getMyGamificationFromApi(period: GamificationPeriod = '7d'): Promise<MyGamificationApi> {
  const params = new URLSearchParams({ period });
  return apiRequest<MyGamificationApi>(`/gamification/me?${params.toString()}`);
}

export async function submitGamificationActionToApi(kind: GamificationActionKind, status: 'completed' | 'partial' | 'missed' = 'completed'): Promise<void> {
  await apiRequest('/gamification/action', {
    method: 'POST',
    body: JSON.stringify({ kind, status }),
  });
}

export async function markGamificationNotificationReadFromApi(id: number): Promise<void> {
  await apiRequest(`/gamification/notifications/${id}/read`, { method: 'POST' });
}

export async function createHabitInApi(payload: HabitInput): Promise<HabitApi> {
  return apiRequest<HabitApi>('/gamification/habits', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function updateHabitInApi(id: number, payload: Partial<HabitInput> & { active?: number }): Promise<HabitApi> {
  return apiRequest<HabitApi>(`/gamification/habits/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}

export async function deleteHabitInApi(id: number): Promise<void> {
  await apiRequest(`/gamification/habits/${id}`, { method: 'DELETE' });
}

export async function toggleHabitCompletionInApi(id: number, payload: HabitCompletionInput): Promise<{ ok: boolean }> {
  return apiRequest<{ ok: boolean }>(`/gamification/habits/${id}/completion`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function createStrengthGoalInApi(payload: StrengthGoalInput): Promise<StrengthGoalApi> {
  return apiRequest<StrengthGoalApi>('/gamification/strength-goals', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function updateStrengthGoalInApi(id: number, payload: Partial<StrengthGoalInput> & { status?: StrengthGoalStatus }): Promise<StrengthGoalApi> {
  return apiRequest<StrengthGoalApi>(`/gamification/strength-goals/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}

export async function deleteStrengthGoalInApi(id: number): Promise<void> {
  await apiRequest(`/gamification/strength-goals/${id}`, { method: 'DELETE' });
}

export async function logStrengthGoalInApi(id: number, payload: StrengthLogInput): Promise<StrengthLogApi> {
  return apiRequest<StrengthLogApi>(`/gamification/strength-goals/${id}/logs`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function getAdminGamificationSummaryFromApi(period: GamificationAdminPeriod = '30d'): Promise<AdminGamificationSummaryApi[]> {
  const params = new URLSearchParams({ period });
  return apiRequest<AdminGamificationSummaryApi[]>(`/gamification/admin/summary?${params.toString()}`);
}
