import { beforeEach, describe, expect, it, vi } from 'vitest';

describe('api token handling', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    vi.resetModules();
  });

  it('guarda el access token solo en sessionStorage para sobrevivir a F5', async () => {
    const api = await import('./api');
    api.clearAccessToken();
    api.setAccessToken('access-token-temporal');

    expect(sessionStorage.getItem('imperial_session_access_token_v123')).toBe('access-token-temporal');
    expect(localStorage.getItem('imperial_access_token')).toBeNull();
    expect(api.hasAuthSessionHint()).toBe(true);
  });

  it('restaura el token después de recargar el módulo JavaScript', async () => {
    const firstLoad = await import('./api');
    firstLoad.setAccessToken('token-que-sobrevive-f5');

    vi.resetModules();
    const afterReload = await import('./api');
    afterReload.bootstrapLegacyAccessToken();

    expect(afterReload.hasAuthSessionHint()).toBe(true);
    expect(sessionStorage.getItem('imperial_session_access_token_v123')).toBe('token-que-sobrevive-f5');
    afterReload.clearAccessToken();
  });

  it('migra el token legado a sessionStorage y limpia localStorage', async () => {
    localStorage.setItem('imperial_access_token', 'legacy-token');
    const api = await import('./api');
    api.bootstrapLegacyAccessToken();

    expect(localStorage.getItem('imperial_access_token')).toBeNull();
    expect(sessionStorage.getItem('imperial_session_access_token_v123')).toBe('legacy-token');
    expect(api.hasAuthSessionHint()).toBe(true);
    api.clearAccessToken();
  });

  it('el cierre de sesión elimina el token de la pestaña', async () => {
    const api = await import('./api');
    api.setAccessToken('token-temporal');
    api.clearAccessToken();

    expect(sessionStorage.getItem('imperial_session_access_token_v123')).toBeNull();
    expect(api.hasAuthSessionHint()).toBe(false);
  });
});
