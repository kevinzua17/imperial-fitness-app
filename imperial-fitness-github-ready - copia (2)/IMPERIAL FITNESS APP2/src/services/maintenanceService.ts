import { apiRequest } from './api';

export async function cleanupDemoDataInApi(): Promise<{ ok: boolean; detail: string }> {
  return apiRequest<{ ok: boolean; detail: string }>('/maintenance/cleanup-demo', { method: 'POST' });
}