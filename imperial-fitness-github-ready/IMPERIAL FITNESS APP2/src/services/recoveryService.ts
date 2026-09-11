import { apiRequest } from './api';

export type RecoveryRequestStatus = 'pending' | 'resolved' | 'rejected';

export interface RecoveryRequestItem {
  id: number;
  user_id: number | null;
  email: string;
  user_name: string | null;
  phone_number: string | null;
  status: RecoveryRequestStatus;
  requested_at: string | null;
  resolved_at: string | null;
  resolved_by: number | null;
  admin_notes: string;
  temporary_password_issued: boolean;
  known_user: boolean;
}

export async function getRecoveryPendingCountFromApi(): Promise<number> {
  const response = await apiRequest<{ count: number }>('/recovery/pending-count');
  return response.count || 0;
}

export async function listRecoveryRequestsFromApi(status: RecoveryRequestStatus | 'all' = 'pending'): Promise<RecoveryRequestItem[]> {
  return apiRequest<RecoveryRequestItem[]>(`/recovery/requests?status=${encodeURIComponent(status)}`);
}

export async function generateTemporaryPasswordFromApi(
  requestId: number,
  adminNotes = '',
): Promise<{ ok: boolean; temporary_password: string; message: string }> {
  return apiRequest<{ ok: boolean; temporary_password: string; message: string }>(
    `/recovery/requests/${requestId}/temporary-password`,
    {
      method: 'POST',
      body: JSON.stringify({ admin_notes: adminNotes }),
    },
  );
}

export async function rejectRecoveryRequestFromApi(requestId: number, adminNotes = ''): Promise<void> {
  await apiRequest<{ ok: boolean }>(`/recovery/requests/${requestId}/reject`, {
    method: 'POST',
    body: JSON.stringify({ admin_notes: adminNotes }),
  });
}
