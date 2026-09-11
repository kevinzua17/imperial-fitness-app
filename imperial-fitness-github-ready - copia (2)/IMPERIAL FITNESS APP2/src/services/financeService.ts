import { apiRequest } from './api';

export interface FinanceSummaryApi {
  income_month: number;
  expenses_month: number;
  net_month: number;
  active_memberships: number;
  expiring_soon: number;
}

export async function getFinanceSummaryFromApi(): Promise<FinanceSummaryApi> {
  return apiRequest<FinanceSummaryApi>('/finance/summary');
}

export async function createPaymentInApi(payload: { user_id: number; amount: number; method: string; reference?: string }) {
  return apiRequest('/finance/payments', { method: 'POST', body: JSON.stringify(payload) });
}

export async function createExpenseInApi(payload: { title: string; amount: number; category: string }) {
  return apiRequest('/finance/expenses', { method: 'POST', body: JSON.stringify(payload) });
}

export async function createMembershipInApi(payload: { user_id: number; plan_name: string; starts_at: string; ends_at: string; status?: string }) {
  return apiRequest('/finance/memberships', { method: 'POST', body: JSON.stringify(payload) });
}
export interface FinanceAnalyticsApi {
  generated_at: string;
  engagement: { active_7d: number; at_risk_8_30d: number; inactive_30d: number; never_active: number; total_clients: number };
  inactive_users: Array<{ user_id: number; name: string; days_inactive: number | null }>;
  membership_status: { active: number; trial: number; pending: number; overdue: number; limited: number; suspended: number };
  financial: {
    income_month: number; income_previous_month: number; income_change_percent: number; expenses_month: number; net_month: number;
    expected_monthly_revenue: number; at_risk_or_lost_revenue: number; sales_count_month: number; average_ticket_month: number;
    last_sale_at: string | null; days_since_last_sale: number | null; no_sales_days_month: number; source: string;
  };
  monthly_series: Array<{ month: string; income: number; expenses: number }>;
  client_acquisition: Array<{ month: string; new_clients: number }>;
}

export async function getFinanceAnalyticsFromApi(): Promise<FinanceAnalyticsApi> {
  return apiRequest<FinanceAnalyticsApi>('/finance/analytics');
}

export async function markMembershipPaidInApi(userId: number, amount: number) {
  return apiRequest(`/memberships/admin/accounts/${userId}/mark-paid`, {
    method: 'POST',
    body: JSON.stringify({ amount, reference: 'Pago registrado desde analíticas', admin_notes: 'Validado por administración' }),
  });
}
