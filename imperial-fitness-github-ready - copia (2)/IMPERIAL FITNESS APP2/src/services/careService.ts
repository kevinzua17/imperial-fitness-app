import { safeGetItem, safeParseJson, safeSetItem } from '../utils/safeStorage';
import { apiRequest } from './api';
import { CareBodyArea, CareSeverity, UserLimitationInput } from '../data/careRules';

const DEV_MODE = import.meta.env.VITE_DEV_MODE === 'true';

interface ApiLimitation {
  id: number;
  user_id: number;
  body_area: CareBodyArea;
  severity: CareSeverity;
  comment: string;
  trainer_note: string;
  status: 'active' | 'resolved';
  created_at?: string;
  resolved_at?: string | null;
}

const keyFor = (userId: string) => `imperial_care_limitations_${userId}`;

function toLocal(row: ApiLimitation): UserLimitationInput {
  return {
    id: row.id,
    userId: String(row.user_id),
    bodyArea: row.body_area,
    severity: row.severity,
    comment: row.comment,
    trainerNote: row.trainer_note,
    status: row.status,
  };
}

function readLocal(userId: string): UserLimitationInput[] {
  try {
    return safeParseJson(safeGetItem(keyFor(userId)), []);
  } catch {
    return [];
  }
}

function writeLocal(userId: string, rows: UserLimitationInput[]) {
  safeSetItem(keyFor(userId), JSON.stringify(rows));
}

export async function listUserLimitations(userId: string): Promise<UserLimitationInput[]> {
  try {
    const rows = await apiRequest<ApiLimitation[]>(`/limitations/users/${encodeURIComponent(userId)}`);
    const mapped = rows.map(toLocal);
    writeLocal(userId, mapped);
    return mapped;
  } catch (error) {
    if (DEV_MODE) return readLocal(userId);
    throw error;
  }
}

export async function createUserLimitation(userId: string, payload: UserLimitationInput): Promise<UserLimitationInput> {
  const body = {
    user_id: Number(userId),
    body_area: payload.bodyArea,
    severity: payload.severity,
    comment: payload.comment || '',
    trainer_note: payload.trainerNote || '',
    status: payload.status || 'active',
  };
  try {
    const row = await apiRequest<ApiLimitation>('/limitations', {
      method: 'POST',
      body: JSON.stringify(body),
    });
    const mapped = toLocal(row);
    const next = [mapped, ...readLocal(userId).filter(item => String(item.id) !== String(mapped.id))];
    writeLocal(userId, next);
    return mapped;
  } catch (error) {
    if (!DEV_MODE) throw error;
    const local = { ...payload, id: `local-${Date.now()}`, userId, status: payload.status || 'active' };
    writeLocal(userId, [local, ...readLocal(userId)]);
    return local;
  }
}

export async function resolveUserLimitation(userId: string, limitationId: string | number): Promise<void> {
  try {
    await apiRequest(`/limitations/${encodeURIComponent(String(limitationId))}/resolve`, { method: 'PUT' });
  } catch (error) {
    if (!DEV_MODE) throw error;
  }
  writeLocal(userId, readLocal(userId).map(item => String(item.id) === String(limitationId) ? { ...item, status: 'resolved' } : item));
}
