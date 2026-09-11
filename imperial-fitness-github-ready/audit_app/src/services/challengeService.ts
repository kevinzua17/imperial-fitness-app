import { apiRequest } from './api';

export interface ApiChallenge {
  id: number;
  title: string;
  description: string;
  status: string;
  participants_count: number;
  starts_at?: string | null;
  ends_at?: string | null;
  created_at: string;
}

export async function listChallengesFromApi(): Promise<ApiChallenge[]> {
  return apiRequest<ApiChallenge[]>('/challenges');
}

export async function createChallengeInApi(payload: {
  title: string;
  description: string;
  status?: string;
  starts_at?: string;
  ends_at?: string;
}): Promise<ApiChallenge> {
  return apiRequest<ApiChallenge>('/challenges', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function joinChallengeInApi(challengeId: number) {
  return apiRequest(`/challenges/${challengeId}/join`, { method: 'POST' });
}