import { apiRequest } from './api';

export interface RewardProductApi {
  id: number;
  title: string;
  description: string;
  cost: number;
  stock: number;
  active: number;
  image_url?: string | null;
  created_at: string;
}

export interface RewardEventApi {
  id: number;
  user_id: number;
  points: number;
  reason: string;
  source_type: string;
  created_at: string;
}

export async function getRewardBalanceFromApi(userId?: string): Promise<{ user_id: number; balance: number }> {
  const suffix = userId ? `?user_id=${encodeURIComponent(userId)}` : '';
  return apiRequest<{ user_id: number; balance: number }>(`/rewards/balance${suffix}`);
}

export async function listRewardProductsFromApi(): Promise<RewardProductApi[]> {
  return apiRequest<RewardProductApi[]>('/rewards/products');
}

export async function listRewardEventsFromApi(userId?: string): Promise<RewardEventApi[]> {
  const suffix = userId ? `?user_id=${encodeURIComponent(userId)}` : '';
  return apiRequest<RewardEventApi[]>(`/rewards/events${suffix}`);
}

export async function redeemRewardProductInApi(productId: number): Promise<{ ok: boolean; redemption_id: number; balance: number }> {
  return apiRequest<{ ok: boolean; redemption_id: number; balance: number }>('/rewards/redeem', {
    method: 'POST',
    body: JSON.stringify({ product_id: productId }),
  });
}

export async function createRewardProductInApi(payload: { title: string; description: string; cost: number; stock: number; image_url?: string }) {
  return apiRequest<RewardProductApi>('/rewards/products', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}