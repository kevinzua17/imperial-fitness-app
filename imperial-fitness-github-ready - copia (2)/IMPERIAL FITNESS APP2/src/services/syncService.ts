import { apiRequest } from './api';

export type SyncEventType = 'plan' | 'photo' | 'chat' | 'checkin' | 'system';

export interface ApiSyncEvent {
  id: number;
  title: string;
  detail: string;
  source: string;
  target: string;
  event_type: SyncEventType | string;
  actor_user_id?: number | null;
  target_user_id?: number | null;
  created_at: string;
}

export interface SyncEventPayload {
  title: string;
  detail: string;
  source: string;
  target: string;
  event_type: SyncEventType;
  target_user_id?: number | null;
}

export async function listSyncEventsFromApi(): Promise<ApiSyncEvent[]> {
  return apiRequest<ApiSyncEvent[]>('/sync/events');
}

export async function createSyncEventInApi(payload: SyncEventPayload): Promise<ApiSyncEvent> {
  return apiRequest<ApiSyncEvent>('/sync/events', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}
