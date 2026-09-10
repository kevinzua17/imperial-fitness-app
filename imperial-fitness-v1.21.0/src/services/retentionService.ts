import { apiRequest } from './api';

export interface RetentionAlertApi {
  id: number;
  user_id: number;
  client_name: string;
  risk: string;
  reason: string;
  suggested_action: string;
  status: string;
  created_at: string;
}
export interface RetentionSetupStatusApi {
  ready: boolean;
  missing_tables: string[];
  checked_at: string;
}

export async function getRetentionSetupStatusFromApi(): Promise<RetentionSetupStatusApi> {
  return apiRequest<RetentionSetupStatusApi>('/retention/setup-status');
}

export async function listRetentionAlertsFromApi(): Promise<RetentionAlertApi[]> {
  return apiRequest<RetentionAlertApi[]>('/retention/alerts');
}

export async function generateRetentionAlertsInApi(): Promise<RetentionAlertApi[]> {
  return apiRequest<RetentionAlertApi[]>('/retention/generate-alerts', { method: 'POST' });
}

export async function resolveRetentionAlertInApi(alertId: number): Promise<RetentionAlertApi> {
  return apiRequest<RetentionAlertApi>(`/retention/alerts/${alertId}/resolve`, { method: 'POST' });
}

export async function registerAttendanceInApi(userId?: string): Promise<unknown> {
  return apiRequest('/retention/attendance', {
    method: 'POST',
    body: JSON.stringify({ user_id: userId ? Number(userId) : undefined, source: 'app' }),
  });
}