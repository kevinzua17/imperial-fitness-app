import { API_URL, apiRequest } from './api';

export type EvolutionItemType = 'all' | 'post' | 'photo' | 'checkin' | 'metric';
export type EvolutionVisibility = 'all' | 'public' | 'friends' | 'staff' | 'private';
export type EvolutionPeriod = '7d' | '30d' | '60d' | '90d' | 'all';

export interface EvolutionHistoryUser {
  id: number;
  name: string;
  email: string;
  role: string;
  avatar_url?: string | null;
}

export interface EvolutionHistoryItem {
  id: string;
  source_id: number;
  type: 'post' | 'photo' | 'checkin' | 'metric';
  type_label: string;
  title: string;
  subtitle: string;
  description: string;
  image_url?: string | null;
  visibility: string;
  visibility_label: string;
  created_at?: string | null;
  meta: Record<string, unknown>;
}

export interface EvolutionHistoryResponse {
  user: EvolutionHistoryUser;
  summary: {
    period?: EvolutionPeriod | string;
    start_date?: string | null;
    end_date?: string | null;
    total_items: number;
    posts: number;
    photos: number;
    checkins: number;
    metrics: number;
    last_activity_at?: string | null;
  };
  items: EvolutionHistoryItem[];
}

function absoluteUrl(url?: string | null): string | undefined {
  if (!url) return undefined;
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  return `${API_URL}${url}`;
}

export function normalizeEvolutionItem(item: EvolutionHistoryItem): EvolutionHistoryItem {
  return {
    ...item,
    image_url: absoluteUrl(item.image_url),
  };
}

function buildQuery(
  itemType: EvolutionItemType,
  visibility: EvolutionVisibility,
  period: EvolutionPeriod = '30d',
): string {
  const params = new URLSearchParams();
  params.set('item_type', itemType);
  params.set('period', period);
  if (visibility !== 'all') params.set('visibility', visibility);
  params.set('limit', period === 'all' ? '120' : '180');
  return params.toString();
}

export async function getMyEvolutionHistory(
  itemType: EvolutionItemType = 'all',
  visibility: EvolutionVisibility = 'all',
  period: EvolutionPeriod = '30d',
): Promise<EvolutionHistoryResponse> {
  const query = buildQuery(itemType, visibility, period);
  const payload = await apiRequest<EvolutionHistoryResponse>(`/history/me?${query}`);
  return { ...payload, items: payload.items.map(normalizeEvolutionItem) };
}

export async function getUserEvolutionHistory(
  userId: string | number,
  itemType: EvolutionItemType = 'all',
  visibility: EvolutionVisibility = 'all',
  period: EvolutionPeriod = '30d',
): Promise<EvolutionHistoryResponse> {
  const query = buildQuery(itemType, visibility, period);
  const payload = await apiRequest<EvolutionHistoryResponse>(`/history/users/${userId}?${query}`);
  return { ...payload, items: payload.items.map(normalizeEvolutionItem) };
}
