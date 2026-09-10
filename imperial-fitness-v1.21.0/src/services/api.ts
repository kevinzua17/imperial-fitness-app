import {
  safeGetItem,
  safeRemoveItem,
  safeSessionGetItem,
  safeSessionRemoveItem,
  safeSessionSetItem,
  safeSetItem,
} from '../utils/safeStorage';

const CONFIGURED_API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
const USE_SAME_ORIGIN_API = import.meta.env.PROD
  && import.meta.env.VITE_USE_SAME_ORIGIN_API === 'true'
  && typeof window !== 'undefined'
  && ['http:', 'https:'].includes(window.location.protocol)
  && !['localhost', '127.0.0.1'].includes(window.location.hostname);

// El proxy /api solo se activa de forma explícita. Por defecto se conserva
// VITE_API_BASE_URL, igual que en v1.20.0, para no cambiar una integración
// Vercel-Render que ya funciona.
const API_BASE_URL = USE_SAME_ORIGIN_API ? '/api' : CONFIGURED_API_BASE_URL.replace(/\/$/, '');
const API_TIMEOUT_MS = Number(import.meta.env.VITE_API_TIMEOUT_MS || 45000);
const DEFAULT_GET_CACHE_TTL_MS = Number(import.meta.env.VITE_API_GET_CACHE_TTL_MS || 12000);
const MAX_GET_CACHE_ENTRIES = Number(import.meta.env.VITE_API_GET_CACHE_MAX_ENTRIES || 80);

type CacheEntry = {
  expiresAt: number;
  value: unknown;
};

const getCache = new Map<string, CacheEntry>();
const inFlightGets = new Map<string, Promise<unknown>>();
let refreshPromise: Promise<string | null> | null = null;
let accessTokenInMemory = '';

const LEGACY_TOKEN_KEY = 'imperial_access_token';
const SESSION_HINT_KEY = 'imperial_session_hint';
const SESSION_ACCESS_TOKEN_KEY = 'imperial_session_access_token_v123';

export function setAccessToken(token: string | null) {
  accessTokenInMemory = token || '';
  if (token) {
    // sessionStorage sobrevive a F5 y permanece limitado a la pestaña actual.
    // No se guarda el token en localStorage ni se almacenan contraseñas.
    safeSessionSetItem(SESSION_ACCESS_TOKEN_KEY, token);
    safeSetItem(SESSION_HINT_KEY, '1');
  } else {
    safeSessionRemoveItem(SESSION_ACCESS_TOKEN_KEY);
    safeRemoveItem(SESSION_HINT_KEY);
  }
}

export function clearAccessToken() {
  accessTokenInMemory = '';
  safeSessionRemoveItem(SESSION_ACCESS_TOKEN_KEY);
  safeRemoveItem(LEGACY_TOKEN_KEY);
  safeRemoveItem(SESSION_HINT_KEY);
}

export function bootstrapLegacyAccessToken() {
  // Restauración principal para una recarga normal de la misma pestaña.
  const sessionToken = safeSessionGetItem(SESSION_ACCESS_TOKEN_KEY);
  if (sessionToken) {
    accessTokenInMemory = sessionToken;
    safeSetItem(SESSION_HINT_KEY, '1');
    return;
  }

  // Compatibilidad de una sola vez con versiones antiguas que usaban localStorage.
  const legacyToken = safeGetItem(LEGACY_TOKEN_KEY);
  if (legacyToken) {
    accessTokenInMemory = legacyToken;
    safeSessionSetItem(SESSION_ACCESS_TOKEN_KEY, legacyToken);
    safeSetItem(SESSION_HINT_KEY, '1');
    safeRemoveItem(LEGACY_TOKEN_KEY);
  }
}

export function hasAuthSessionHint() {
  return Boolean(
    accessTokenInMemory
    || safeSessionGetItem(SESSION_ACCESS_TOKEN_KEY)
    || safeGetItem(SESSION_HINT_KEY)
  );
}


export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

function clientMessageForStatus(status: number): string {
  if (status === 400 || status === 422) return 'Revisa los datos ingresados e intenta nuevamente.';
  if (status === 401) return 'Tu sesión expiró. Ingresa nuevamente para continuar.';
  if (status === 402) return 'La membresía requiere validación o regularización para acceder a este módulo.';
  if (status === 403) return 'No tienes permiso para realizar esta acción.';
  if (status === 404) return 'No encontramos la información solicitada.';
  if (status === 408) return 'La conexión está tardando más de lo esperado. Intenta nuevamente.';
  if (status === 409) return 'Ya existe un registro similar o hay un conflicto con la información.';
  if (status === 413) return 'El archivo es demasiado pesado. Usa una imagen más liviana.';
  if (status === 415) return 'El formato del archivo no es compatible.';
  if (status === 429) return 'Se hicieron demasiadas solicitudes. Espera un momento e intenta de nuevo.';
  if (status >= 500) return 'El servicio está teniendo un inconveniente temporal. Intenta nuevamente en unos minutos.';
  return 'No pudimos completar la acción. Intenta nuevamente.';
}

function cleanServiceMessage(raw: unknown, status: number): string {
  const text = typeof raw === 'string' ? raw : '';
  const normalized = text.toLowerCase();

  const technicalTerms = [
    'api', 'backend', 'frontend', 'server', 'servidor', 'endpoint', 'database', 'base de datos',
    'sql', 'json', 'traceback', 'exception', 'stack', 'supabase', 'cloudinary', 'render', 'vercel',
    'fastapi', 'postgres', 'jwt', 'token', 'internal server error', 'networkerror', 'failed to fetch',
  ];

  if (!text || technicalTerms.some(term => normalized.includes(term))) {
    return clientMessageForStatus(status);
  }

  return text.length > 160 ? clientMessageForStatus(status) : text;
}

function getToken() {
  return accessTokenInMemory;
}

function cacheKey(path: string) {
  return `${getToken()}::${path}`;
}

function shouldUseGetCache(path: string, options: RequestInit) {
  const method = (options.method || 'GET').toUpperCase();
  if (method !== 'GET') return false;
  if (options.cache === 'no-store') return false;
  if (path.startsWith('/auth/refresh')) return false;
  return true;
}

function clearExpiredCache() {
  const now = Date.now();
  for (const [key, entry] of getCache.entries()) {
    if (entry.expiresAt <= now) getCache.delete(key);
  }
}

function limitCacheSize() {
  while (getCache.size > MAX_GET_CACHE_ENTRIES) {
    const oldestKey = getCache.keys().next().value;
    if (!oldestKey) break;
    getCache.delete(oldestKey);
  }
}

export function clearApiCache(prefix?: string) {
  if (!prefix) {
    getCache.clear();
    inFlightGets.clear();
    return;
  }
  for (const key of Array.from(getCache.keys())) {
    if (key.includes(prefix)) getCache.delete(key);
  }
  for (const key of Array.from(inFlightGets.keys())) {
    if (key.includes(prefix)) inFlightGets.delete(key);
  }
}

export async function refreshAccessToken(): Promise<string | null> {
  if (!refreshPromise) {
    refreshPromise = fetch(`${API_BASE_URL}/auth/refresh`, {
      method: 'POST',
      credentials: 'include',
    })
      .then(async response => {
        if (!response.ok) return null;
        const payload = await response.json();
        const token = payload.access_token || null;
        if (token) setAccessToken(token);
        return token;
      })
      .catch(() => null)
      .finally(() => {
        refreshPromise = null;
      });
  }
  return refreshPromise;
}

async function fetchWithTimeout(url: string, options: RequestInit) {
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), API_TIMEOUT_MS);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new ApiError(clientMessageForStatus(408), 408);
    }
    throw new ApiError('No hay conexión estable en este momento. Verifica tu internet e intenta nuevamente.', 0);
  } finally {
    window.clearTimeout(timeoutId);
  }
}

export async function apiRequest<T>(path: string, options: RequestInit = {}): Promise<T> {
  const useCache = shouldUseGetCache(path, options);
  const key = useCache ? cacheKey(path) : '';

  if (useCache) {
    clearExpiredCache();
    const cached = getCache.get(key);
    if (cached && cached.expiresAt > Date.now()) return cached.value as T;

    const pending = inFlightGets.get(key);
    if (pending) return pending as Promise<T>;
  }

  const requestPromise = apiRequestInternal<T>(path, options, true).then(value => {
    if (useCache) {
      getCache.set(key, { value, expiresAt: Date.now() + DEFAULT_GET_CACHE_TTL_MS });
      limitCacheSize();
      inFlightGets.delete(key);
    } else if ((options.method || 'GET').toUpperCase() !== 'GET') {
      clearApiCache();
    }
    return value;
  }).catch(error => {
    if (useCache) inFlightGets.delete(key);
    throw error;
  });

  if (useCache) inFlightGets.set(key, requestPromise as Promise<unknown>);
  return requestPromise;
}

async function apiRequestInternal<T>(path: string, options: RequestInit = {}, allowRefresh: boolean): Promise<T> {
  const token = getToken();
  const headers = new Headers(options.headers);

  if (!headers.has('Content-Type') && options.body && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const response = await fetchWithTimeout(`${API_BASE_URL}${path}`, {
    ...options,
    headers,
    credentials: 'include',
  });

  if (response.status === 401 && allowRefresh && !path.startsWith('/auth/refresh')) {
    const newToken = await refreshAccessToken();
    if (newToken) return apiRequestInternal<T>(path, options, false);
  }

  if (!response.ok) {
    let rawMessage: unknown = '';
    try {
      const payload = await response.json();
      rawMessage = payload.detail || payload.message || '';
    } catch {
      rawMessage = '';
    }
    throw new ApiError(cleanServiceMessage(rawMessage, response.status), response.status);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}


export async function apiBlobRequest(path: string, options: RequestInit = {}): Promise<Blob> {
  const headers = new Headers(options.headers || {});
  const token = getToken();
  if (token) headers.set('Authorization', `Bearer ${token}`);
  const response = await fetchWithTimeout(`${API_BASE_URL}${path}`, { ...options, headers, credentials: 'include' });
  if (response.status === 401) {
    const newToken = await refreshAccessToken();
    if (newToken) {
      const retryHeaders = new Headers(options.headers || {});
      retryHeaders.set('Authorization', `Bearer ${newToken}`);
      const retry = await fetchWithTimeout(`${API_BASE_URL}${path}`, { ...options, headers: retryHeaders, credentials: 'include' });
      if (!retry.ok) throw new ApiError(clientMessageForStatus(retry.status), retry.status);
      return retry.blob();
    }
  }
  if (!response.ok) throw new ApiError(clientMessageForStatus(response.status), response.status);
  return response.blob();
}

export const API_URL = API_BASE_URL;
export const USING_SAME_ORIGIN_API = USE_SAME_ORIGIN_API;
