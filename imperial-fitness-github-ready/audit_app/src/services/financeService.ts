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