import { apiRequest } from './api';
import { ApiUser, apiUserToClientProfile } from './mappers';

interface LoginResponse {
  access_token: string;
  token_type: string;
  user: ApiUser;
}

export async function loginWithApi(email: string, password: string) {
  const response = await apiRequest<LoginResponse>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });

  localStorage.setItem('imperial_access_token', response.access_token);
  return apiUserToClientProfile(response.user);
}

export async function getCurrentUserFromApi() {
  const response = await apiRequest<ApiUser>('/auth/me');
  return apiUserToClientProfile(response);
}

export async function registerClientWithApi(payload: {
  name: string;
  email: string;
  password: string;
  goal?: string;
  weight?: number;
  height?: number;
}) {
  const response = await apiRequest<ApiUser>('/auth/register', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  return apiUserToClientProfile(response);
}

export async function requestPasswordReset(email: string) {
  return apiRequest<{ ok: boolean; detail: string; reset_token_dev?: string }>('/auth/forgot-password', {
    method: 'POST',
    body: JSON.stringify({ email }),
  });
}

export async function resetPasswordWithToken(token: string, newPassword: string) {
  return apiRequest<{ ok: boolean }>('/auth/reset-password', {
    method: 'POST',
    body: JSON.stringify({ token, new_password: newPassword }),
  });
}

export async function logoutFromApi() {
  try {
    await apiRequest<{ ok: boolean }>('/auth/logout', { method: 'POST' });
  } catch {
    // Permite cerrar localmente aunque el backend no responda.
  }
  localStorage.removeItem('imperial_access_token');
}

export async function logoutAllSessionsFromApi() {
  await apiRequest<{ ok: boolean }>('/auth/logout-all', { method: 'POST' });
  await logoutFromApi();
}