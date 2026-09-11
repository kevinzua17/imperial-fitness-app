import { API_URL, apiRequest } from './api';

function absoluteUrl(url?: string | null): string | undefined {
  if (!url) return undefined;
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  return `${API_URL}${url}`;
}

export type MembershipStatus =
  | 'trial_active'
  | 'active'
  | 'expiring_soon'
  | 'pending_validation'
  | 'overdue'
  | 'limited'
  | 'suspended';

export interface PaymentPlanApi {
  id: string;
  title: string;
  months: number;
  amount: number;
  compare_at?: number | null;
  badge?: string | null;
  highlight?: boolean;
  active?: boolean;
}

export interface MembershipAccountApi {
  user_id: number;
  trial_started_at: string;
  trial_ends_at: string;
  billing_day: number;
  monthly_price: number;
  currency: string;
  last_payment_at?: string | null;
  next_payment_due: string;
  grace_until?: string | null;
  status: MembershipStatus;
  activated_at?: string | null;
  pending_validation_at?: string | null;
  suspended_at?: string | null;
  status_changed_at?: string | null;
  manual_status?: MembershipStatus | null;
  manual_status_until?: string | null;
  status_note?: string | null;
  updated_at: string;
}

export interface MembershipPaymentApi {
  id: number;
  user_id?: number;
  amount: number;
  currency: string;
  method: string;
  reference?: string | null;
  receipt_url?: string | null;
  status: 'pending' | 'approved' | 'rejected';
  period_start?: string | null;
  period_end?: string | null;
  submitted_at: string;
  reviewed_at?: string | null;
  admin_notes?: string | null;
  months_paid?: number;
  plan_id?: string | null;
}

export interface MembershipSettingsApi {
  nequi_number: string;
  monthly_price: number;
  currency: string;
  trial_days: number;
  grace_days?: number;
  suspension_days?: number;
  payment_instructions: string;
  launch_offer_enabled?: boolean;
  launch_offer_title?: string;
  launch_offer_badge?: string;
  launch_offer_deadline?: string;
  launch_spots_limit?: number;
  launch_spots_used?: number;
  payment_plans?: PaymentPlanApi[];
}

export interface MembershipNoticeApi {
  type: 'info' | 'warning' | 'danger';
  title: string;
  message: string;
}

export interface MyMembershipApi {
  account: MembershipAccountApi | null;
  payments: MembershipPaymentApi[];
  settings: MembershipSettingsApi;
  notices: MembershipNoticeApi[];
  feature_limited: boolean;
  restricted_access?: boolean;
  payment_required?: boolean;
  premium_modules_blocked?: boolean;
  days_to_due?: number | null;
  days_past_due?: number | null;
  allowed_client_tabs?: string[];
}

export interface AdminMembershipRowApi {
  user: {
    id: number;
    name: string;
    email: string;
    phone_number?: string | null;
    whatsapp_opt_in?: number | null;
    created_at: string;
  };
  account: MembershipAccountApi;
  last_payment?: MembershipPaymentApi | null;
  pending_payments: number;
}

export interface PendingPaymentApi {
  id: number;
  user_id: number;
  name: string;
  email: string;
  phone_number?: string | null;
  whatsapp_opt_in?: number | null;
  amount: number;
  currency: string;
  method: string;
  reference?: string | null;
  receipt_url?: string | null;
  status: 'pending';
  submitted_at: string;
  months_paid?: number;
  plan_id?: string | null;
}

function normalizePayment(payment: MembershipPaymentApi): MembershipPaymentApi {
  return { ...payment, receipt_url: absoluteUrl(payment.receipt_url) };
}

export async function getMyMembershipFromApi(): Promise<MyMembershipApi> {
  const data = await apiRequest<MyMembershipApi>('/memberships/me');
  return {
    ...data,
    payments: data.payments.map(normalizePayment),
  };
}

export async function uploadPaymentReceiptToApi(file: File): Promise<string> {
  const formData = new FormData();
  formData.append('file', file);
  const response = await apiRequest<{ receipt_url: string }>('/memberships/me/payments/upload', {
    method: 'POST',
    body: formData,
  });
  // The upload response is an opaque private reference. It is sent back only when submitting the payment.
  return response.receipt_url;
}

export async function submitPaymentToApi(payload: {
  amount: number;
  reference?: string;
  receipt_url?: string;
  plan_id?: string;
  months?: number;
}): Promise<{ ok: boolean; detail: string }> {
  return apiRequest('/memberships/me/payments', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function getAdminMembershipSettingsFromApi(): Promise<MembershipSettingsApi> {
  return apiRequest<MembershipSettingsApi>('/memberships/admin/settings');
}

export async function getAdminMembershipOverviewFromApi(): Promise<AdminMembershipRowApi[]> {
  const rows = await apiRequest<AdminMembershipRowApi[]>('/memberships/admin/overview?limit=600');
  return rows.map((row) => ({
    ...row,
    last_payment: row.last_payment ? normalizePayment(row.last_payment) : row.last_payment,
  }));
}

export async function getPendingMembershipPaymentsFromApi(): Promise<PendingPaymentApi[]> {
  const rows = await apiRequest<PendingPaymentApi[]>('/memberships/admin/pending-payments');
  return rows.map((row) => ({ ...row, receipt_url: absoluteUrl(row.receipt_url) }));
}

export async function approveMembershipPaymentInApi(paymentId: number): Promise<{ ok: boolean; next_payment_due: string; months_paid?: number }> {
  return apiRequest(`/memberships/admin/payments/${paymentId}/approve`, { method: 'POST' });
}

export async function rejectMembershipPaymentInApi(paymentId: number, admin_notes: string): Promise<{ ok: boolean }> {
  return apiRequest(`/memberships/admin/payments/${paymentId}/reject`, {
    method: 'POST',
    body: JSON.stringify({ admin_notes }),
  });
}

export async function markMembershipPaidManuallyInApi(
  userId: number,
  payload: { amount: number; months?: number; reference?: string; admin_notes?: string },
): Promise<{ ok: boolean; next_payment_due: string; months_paid?: number }> {
  return apiRequest(`/memberships/admin/accounts/${userId}/mark-paid`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}


export async function updateMembershipAccountInApi(
  userId: number,
  payload: Partial<{
    trial_started_at: string;
    trial_ends_at: string;
    last_payment_at: string | null;
    next_payment_due: string;
    activated_at: string | null;
    pending_validation_at: string | null;
    suspended_at: string | null;
    status_changed_at: string | null;
    manual_status: MembershipStatus | null;
    manual_status_until: string | null;
    status_note: string;
    clear_manual_status: boolean;
  }>,
): Promise<MembershipAccountApi> {
  return apiRequest(`/memberships/admin/accounts/${userId}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export async function updateMembershipSettingsInApi(payload: {
  nequi_number?: string;
  monthly_price?: number;
  payment_instructions?: string;
  launch_offer_enabled?: boolean;
  launch_offer_title?: string;
  launch_offer_badge?: string;
  launch_offer_deadline?: string;
  launch_spots_limit?: number;
  launch_spots_used?: number;
  payment_plans?: PaymentPlanApi[];
}): Promise<MembershipSettingsApi> {
  return apiRequest('/memberships/admin/settings', {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}
