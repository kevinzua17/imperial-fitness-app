const memoryFallback = new Map<string, string>();
const sessionMemoryFallback = new Map<string, string>();

function getStorage(): Storage | null {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return null;
    const probeKey = '__imperial_storage_probe__';
    window.localStorage.setItem(probeKey, '1');
    window.localStorage.removeItem(probeKey);
    return window.localStorage;
  } catch {
    return null;
  }
}

export function safeGetItem(key: string): string | null {
  const storage = getStorage();
  if (!storage) return memoryFallback.get(key) ?? null;
  try {
    return storage.getItem(key);
  } catch {
    return memoryFallback.get(key) ?? null;
  }
}

export function safeSetItem(key: string, value: string): void {
  const storage = getStorage();
  memoryFallback.set(key, value);
  if (!storage) return;
  try {
    storage.setItem(key, value);
  } catch {
    // Safari private mode, quota errors or hardened browsers: keep memory fallback only.
  }
}

export function safeRemoveItem(key: string): void {
  memoryFallback.delete(key);
  const storage = getStorage();
  if (!storage) return;
  try {
    storage.removeItem(key);
  } catch {
    // Ignore storage failures; session state is protected by server-side cookies/tokens.
  }
}

export function safeParseJson<T>(raw: string | null, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}


function getSessionStorage(): Storage | null {
  try {
    if (typeof window === 'undefined' || !window.sessionStorage) return null;
    const probeKey = '__imperial_session_storage_probe__';
    window.sessionStorage.setItem(probeKey, '1');
    window.sessionStorage.removeItem(probeKey);
    return window.sessionStorage;
  } catch {
    return null;
  }
}

export function safeSessionGetItem(key: string): string | null {
  const storage = getSessionStorage();
  if (!storage) return sessionMemoryFallback.get(key) ?? null;
  try {
    return storage.getItem(key);
  } catch {
    return sessionMemoryFallback.get(key) ?? null;
  }
}

export function safeSessionSetItem(key: string, value: string): void {
  const storage = getSessionStorage();
  sessionMemoryFallback.set(key, value);
  if (!storage) return;
  try {
    storage.setItem(key, value);
  } catch {
    // En navegadores con almacenamiento restringido se conserva en memoria.
  }
}

export function safeSessionRemoveItem(key: string): void {
  sessionMemoryFallback.delete(key);
  const storage = getSessionStorage();
  if (!storage) return;
  try {
    storage.removeItem(key);
  } catch {
    // La limpieza local no debe bloquear el cierre de sesión.
  }
}
