import { apiRequest } from './api';

export interface ChallengeParticipantApi {
  id: number;
  challenge_id: number;
  user_id: number;
  progress_value: number;
  status: 'pending_payment' | 'active' | 'completed' | 'withdrawn' | string;
  payment_status: 'not_required' | 'pending' | 'approved' | 'rejected' | string;
  paid_amount_cop: number;
  baseline_weight?: number | null;
  baseline_waist?: number | null;
  baseline_body_fat?: number | null;
  baseline_muscle_mass?: number | null;
  final_weight?: number | null;
  final_waist?: number | null;
  final_body_fat?: number | null;
  final_muscle_mass?: number | null;
  completion_percent?: number;
  improvement_indicators?: number;
  guarantee_status?: string;
  admin_notes?: string;
  joined_at: string;
  updated_at?: string | null;
}

export interface ChallengeProgressApi {
  days_total: number;
  days_elapsed: number;
  current_week: number;
  duration_weeks: number;
  training_target: number;
  training_done: number;
  nutrition_done: number;
  checkins_total: number;
  completed_habits: number;
  habit_target: number;
  habit_percent: number;
  training_percent: number;
  nutrition_percent: number;
  strength_logs_count: number;
  strength_percent: number;
  attendance_count: number;
  attendance_percent: number;
  improved_exercises: number;
  completion_percent: number;
  improvement_indicators: number;
  guarantee_status: string;
  active_days?: number;
  evidence_summary?: { progress_photos?: number; body_metrics?: number };
  integrity_flags?: string[];
  improvement_details?: Array<{ key: string; label: string; achieved: boolean; value?: number | null; target: string }>;
  body_change?: Record<string, number | null>;
  goal_summary?: Record<string, any>;
  selected_week?: {
    week: number;
    start_date: string;
    end_date: string;
    completion_percent: number;
    completed_habits: number;
    training_done: number;
    nutrition_done: number;
    strength_logs_count: number;
    attendance_count: number;
    active_days?: number;
  } | null;
}

export interface ApiChallenge {
  id: number;
  title: string;
  description: string;
  status: string;
  participants_count: number;
  starts_at?: string | null;
  ends_at?: string | null;
  created_at: string;
  challenge_type?: string;
  price_cop: number;
  compare_at_cop?: number | null;
  currency?: string;
  launch_badge?: string | null;
  slots_total?: number;
  slots_remaining?: number | null;
  duration_weeks?: number;
  guarantee_enabled?: boolean;
  min_completion_percent?: number;
  min_improvement_indicators?: number;
  refund_terms?: string;
  training_days_per_week?: number;
  target_focus?: string;
  goal_label?: string;
  goal_description?: string;
  realistic_targets?: Record<string, any>;
  my_participation?: ChallengeParticipantApi | null;
  my_progress?: ChallengeProgressApi | null;
}

export interface ChallengePayload {
  title: string;
  description: string;
  status?: string;
  starts_at?: string | null;
  ends_at?: string | null;
  challenge_type?: string;
  price_cop?: number;
  compare_at_cop?: number | null;
  currency?: string;
  launch_badge?: string;
  slots_total?: number;
  duration_weeks?: number;
  guarantee_enabled?: boolean;
  min_completion_percent?: number;
  min_improvement_indicators?: number;
  refund_terms?: string;
  training_days_per_week?: number;
  target_focus?: string;
}

export interface ChallengeParticipantProgressRow {
  participant: ChallengeParticipantApi & {
    name?: string;
    email?: string;
    phone_number?: string | null;
  };
  progress: ChallengeProgressApi;
}

export async function listChallengesFromApi(status?: string): Promise<ApiChallenge[]> {
  const suffix = status ? `?status=${encodeURIComponent(status)}` : '';
  return apiRequest<ApiChallenge[]>(`/challenges${suffix}`);
}

export async function createChallengeInApi(payload: ChallengePayload): Promise<ApiChallenge> {
  return apiRequest<ApiChallenge>('/challenges', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function createDefaultChallengeInApi(): Promise<ApiChallenge> {
  return apiRequest<ApiChallenge>('/challenges/quick-start', { method: 'POST' });
}

export async function ensurePremiumChallengeInApi(): Promise<ApiChallenge> {
  return apiRequest<ApiChallenge>('/challenges/ensure-premium', { method: 'POST' });
}

export async function updateChallengeInApi(challengeId: number, payload: Partial<ChallengePayload>): Promise<ApiChallenge> {
  return apiRequest<ApiChallenge>(`/challenges/${challengeId}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export async function joinChallengeInApi(challengeId: number): Promise<ChallengeParticipantApi> {
  return apiRequest<ChallengeParticipantApi>(`/challenges/${challengeId}/join`, { method: 'POST' });
}

export async function getMyChallengeProgressFromApi(challengeId: number): Promise<{ participant: ChallengeParticipantApi; progress: ChallengeProgressApi }> {
  return apiRequest(`/challenges/${challengeId}/me`);
}

export async function listChallengeParticipantsFromApi(
  challengeId: number,
  filters: { week?: number | null; payment_status?: string; status?: string } = {},
): Promise<ChallengeParticipantProgressRow[]> {
  const params = new URLSearchParams({ limit: '600' });
  if (filters.week) params.set('week', String(filters.week));
  if (filters.payment_status) params.set('payment_status', filters.payment_status);
  if (filters.status) params.set('status', filters.status);
  return apiRequest<ChallengeParticipantProgressRow[]>(`/challenges/${challengeId}/participants?${params.toString()}`);
}

export async function reviewChallengeParticipantPaymentInApi(
  challengeId: number,
  participantId: number,
  payload: { payment_status: 'approved' | 'pending' | 'rejected' | 'not_required'; paid_amount_cop?: number; admin_notes?: string },
): Promise<{ ok: boolean }> {
  return apiRequest(`/challenges/${challengeId}/participants/${participantId}/payment`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export async function updateChallengeParticipantMeasurementsInApi(
  challengeId: number,
  participantId: number,
  payload: {
    baseline_weight?: number | null;
    baseline_waist?: number | null;
    baseline_body_fat?: number | null;
    baseline_muscle_mass?: number | null;
    final_weight?: number | null;
    final_waist?: number | null;
    final_body_fat?: number | null;
    final_muscle_mass?: number | null;
    admin_notes?: string;
  },
): Promise<{ ok: boolean }> {
  return apiRequest(`/challenges/${challengeId}/participants/${participantId}/measurements`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}
