import { API_URL, apiRequest } from './api';

function absoluteUrl(url: string): string {
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  return `${API_URL}${url}`;
}

export async function getLogoFromApi(): Promise<string> {
  const response = await apiRequest<{ logo_url: string }>('/media/logo');
  return absoluteUrl(response.logo_url);
}

export interface BrandingSettings {
  gym_logo_url: string;
  login_background_url: string;
  gym_name: string;
  primary_color: string;
}

function absolutizeBranding(settings: BrandingSettings): BrandingSettings {
  return {
    ...settings,
    gym_logo_url: absoluteUrl(settings.gym_logo_url),
    login_background_url: absoluteUrl(settings.login_background_url),
  };
}

export async function getBrandingFromApi(): Promise<BrandingSettings> {
  const settings = await apiRequest<BrandingSettings>('/media/branding');
  return absolutizeBranding(settings);
}

export async function uploadLogoToApi(file: File): Promise<string> {
  const formData = new FormData();
  formData.append('file', file);
  const response = await apiRequest<{ logo_url: string }>('/media/logo', {
    method: 'POST',
    body: formData,
  });
  return absoluteUrl(response.logo_url);
}

export async function uploadLoginBackgroundToApi(file: File): Promise<string> {
  const formData = new FormData();
  formData.append('file', file);
  const response = await apiRequest<{ login_background_url: string }>('/media/login-background', {
    method: 'POST',
    body: formData,
  });
  return absoluteUrl(response.login_background_url);
}

export async function updateBrandingInApi(payload: Partial<Pick<BrandingSettings, 'gym_name' | 'primary_color'>>): Promise<BrandingSettings> {
  const settings = await apiRequest<BrandingSettings>('/media/branding', {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
  return absolutizeBranding(settings);
}

export async function uploadAvatarToApi(userId: string, file: File): Promise<string> {
  const formData = new FormData();
  formData.append('file', file);
  const response = await apiRequest<{ user_id: number; avatar_url: string }>(`/media/users/${userId}/avatar`, {
    method: 'POST',
    body: formData,
  });
  return absoluteUrl(response.avatar_url);
}