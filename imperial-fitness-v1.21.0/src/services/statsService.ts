import { apiRequest } from './api';

export interface StatsSummary {
  users_total: number;
  clients_total: number;
  trainers_total: number;
  admins_total: number;
  pending_users: number;
  active_users: number;
  diet_plans_total: number;
  progress_photos_total: number;
  body_metrics_total: number;
  workout_sets_total: number;
  community_posts_total: number;
  comments_total: number;
  reactions_total: number;
  active_challenges: number;
  challenge_participants_total: number;
  latest_weight?: number | null;
  latest_body_fat?: number | null;
  latest_muscle_mass?: number | null;
}

export async function getStatsSummaryFromApi(): Promise<StatsSummary> {
  return apiRequest<StatsSummary>('/stats/summary');
}