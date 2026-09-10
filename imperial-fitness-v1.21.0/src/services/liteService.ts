import { API_URL, apiBlobRequest, apiRequest } from './api';

export type LiteClient = {
  id: number;
  name: string;
  goal?: string | null;
  service_tier: 'lite' | 'premium' | 'hybrid';
  experience_mode: 'lite' | 'premium' | 'hybrid';
};

export type LiteCheckinInput = {
  weight?: number;
  training_sessions?: number;
  nutrition_adherence?: number;
  energy?: number;
  sleep_hours?: number;
  hunger?: number;
  stress?: number;
  pain_present: boolean;
  pain_score?: number;
  pain_area?: string;
  pain_trigger?: string;
  notes?: string;
};

export type LitePlans = {
  routine: null | { id: number; title: string; objective?: string; content: Record<string, unknown>; publication_id?: number; version?: number };
  diet: null | { id: number; title: string; calories?: number; protein?: number; carbs?: number; fat?: number; notes?: string; content: unknown; publication_id?: number; version?: number };
};

const LITE_SESSION_KEY = 'imperial_lite_session_v1';

export function getLiteSession() {
  try { return sessionStorage.getItem(LITE_SESSION_KEY) || ''; } catch { return ''; }
}

export function setLiteSession(token: string) {
  try { sessionStorage.setItem(LITE_SESSION_KEY, token); } catch { /* noop */ }
}

export function clearLiteSession() {
  try { sessionStorage.removeItem(LITE_SESSION_KEY); } catch { /* noop */ }
}

async function liteFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers || {});
  const session = getLiteSession();
  if (session) headers.set('X-Lite-Session', session);
  if (!headers.has('Content-Type') && options.body) headers.set('Content-Type', 'application/json');
  const response = await fetch(`${API_URL}${path}`, { ...options, headers });
  if (!response.ok) {
    let message = 'No pudimos completar la acción.';
    try { const body = await response.json(); message = body.detail || message; } catch { /* noop */ }
    throw new Error(message);
  }
  return response.json();
}

export async function exchangeLiteLink(token: string) {
  const result = await liteFetch<{ session_token: string; expires_at: string; client: LiteClient }>('/lite/exchange', { method: 'POST', body: JSON.stringify({ token }) });
  setLiteSession(result.session_token);
  return result;
}


export type LiteIntake = {
  medical_clearance_needed: boolean;
  chest_pain_or_fainting: boolean;
  pregnancy_or_lactation: boolean;
  diabetes: boolean;
  kidney_disease: boolean;
  hypertension: boolean;
  eating_disorder_history: boolean;
  digestive_condition: boolean;
  food_allergies: string;
  medications: string;
  injuries_or_surgeries: string;
  dietary_preferences: string;
  foods_disliked: string;
  cooking_access: 'limited'|'normal'|'full';
  budget_level: 'low'|'medium'|'flexible';
  notes: string;
};

export const getLiteIntake = () => liteFetch<{completed:boolean;data:Partial<LiteIntake>;updated_at?:string}>('/lite/intake');
export const saveLiteIntake = (payload: LiteIntake) => liteFetch<{ok:boolean;flags:string[];updated_at:string}>('/lite/intake', { method:'PUT', body: JSON.stringify(payload) });

export const getLiteMe = () => liteFetch<LiteClient>('/lite/me');
export const getLitePlans = () => liteFetch<LitePlans>('/lite/plans');
export const getLiteCheckins = () => liteFetch<any[]>('/lite/checkins');
export const submitLiteCheckin = (payload: LiteCheckinInput) => liteFetch<{ ok: boolean; id: number; alert: boolean }>('/lite/checkins', { method: 'POST', body: JSON.stringify(payload) });

export async function downloadLitePdf(publicationId: number, filename: string) {
  const headers = new Headers();
  const session = getLiteSession();
  if (session) headers.set('X-Lite-Session', session);
  const response = await fetch(`${API_URL}/lite/publications/${publicationId}/pdf`, { headers });
  if (!response.ok) throw new Error('No fue posible descargar el PDF.');
  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename; document.body.appendChild(a); a.click(); a.remove();
  URL.revokeObjectURL(url);
}

export type AttentionItem = { user_id: number; client_name: string; priority: 'critical'|'high'|'medium'|'ok'; score: number; reasons: string[]; last_checkin_at?: string | null };
export type PortalLinkRow = { id:number; user_id:number; client_name:string; label:string; expires_at:string; revoked_at?:string|null; last_used_at?:string|null; created_at:string };
export type PublicationRow = { id:number; user_id:number; client_name:string; plan_type:'routine'|'diet'; title:string; version:number; status:string; warnings:string[]; published_at?:string|null };

export const getAttention = () => apiRequest<AttentionItem[]>('/professional/attention', { cache: 'no-store' });
export const getClientIntake = (userId:number) => apiRequest<{completed:boolean;data:Partial<LiteIntake>;updated_at?:string}>(`/professional/intake/${userId}`, { cache:'no-store' });
export const getPortalLinks = (userId?: string) => apiRequest<PortalLinkRow[]>(`/lite/links${userId ? `?user_id=${encodeURIComponent(userId)}` : ''}`, { cache: 'no-store' });
export const createPortalLink = (userId: number, days=30, setLiteMode=true) => apiRequest<{id:number;url:string;expires_at:string}>('/lite/links', { method:'POST', body: JSON.stringify({ user_id:userId, expires_days:days, set_lite_mode:setLiteMode }) });
export const revokePortalLink = (id:number) => apiRequest<{ok:boolean}>(`/lite/links/${id}`, { method:'DELETE' });
export const setClientExperienceMode = (userId:number, mode:'lite'|'premium'|'hybrid') => apiRequest<{ok:boolean;client:LiteClient}>(`/lite/clients/${userId}/experience`, { method:'PATCH', body: JSON.stringify({ mode }) });
export const getPublications = (userId?: string) => apiRequest<PublicationRow[]>(`/professional/publications${userId ? `?user_id=${encodeURIComponent(userId)}` : ''}`, { cache:'no-store' });
export const validateProfessionalPlan = (userId:number, planType:'routine'|'diet') => apiRequest<{can_publish:boolean;blockers:string[];warnings:string[];source_id:number;title:string}>('/professional/validate', { method:'POST', body: JSON.stringify({ user_id:userId, plan_type:planType }) });
export const publishProfessionalPlan = (userId:number, planType:'routine'|'diet', acknowledgeWarnings=false) => apiRequest<{id:number;version:number;warnings:string[];pdf_url:string}>('/professional/publish', { method:'POST', body: JSON.stringify({ user_id:userId, plan_type:planType, acknowledge_warnings:acknowledgeWarnings }) });

export async function downloadProfessionalPdf(publicationId:number, filename:string) {
  const blob = await apiBlobRequest(`/professional/publications/${publicationId}/pdf`);
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename; document.body.appendChild(a); a.click(); a.remove();
  URL.revokeObjectURL(url);
}
