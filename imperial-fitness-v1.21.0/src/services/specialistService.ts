import { apiRequest } from './api';

export interface SpecialistSuggestionRequest {
  client_id?: number;
  client_name?: string;
  goal: string;
  question: string;
  recent_metrics?: string;
  current_diet?: string;
  current_routine?: string;
}

export interface SpecialistSuggestionResponse {
  summary: string;
  recommendations: string[];
  cautions: string[];
  coach_message_draft: string;
  source: string;
}

export async function requestSpecialistSuggestion(payload: SpecialistSuggestionRequest) {
  return apiRequest<SpecialistSuggestionResponse>('/specialist/suggestions', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}