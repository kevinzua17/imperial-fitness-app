import type { ClientProfile } from '../data/mockData';
import { apiRequest } from './api';
import { ApiUser, apiUserToClientProfile } from './mappers';

export async function listUsersFromApi(role?: string): Promise<ClientProfile[]> {
  const query = role ? `?role=${encodeURIComponent(role)}` : '';
  const users = await apiRequest<ApiUser[]>(`/users${query}`);
  return users.map(apiUserToClientProfile);
}

export async function listClientsFromApi(): Promise<ClientProfile[]> {
  const users = await apiRequest<ApiUser[]>('/users/clients');
  return users.map(apiUserToClientProfile);
}

export async function getUserFromApi(userId: string | number): Promise<ClientProfile> {
  const user = await apiRequest<ApiUser>(`/users/${userId}`);
  return apiUserToClientProfile(user);
}

export async function createUserInApi(payload: {
  name: string;
  email: string;
  password: string;
  role: 'admin' | 'trainer' | 'client';
  status?: 'pending' | 'active' | 'suspended' | 'rejected';
  goal?: string;
  assigned_trainer_id?: number;
  phone_number?: string;
  whatsapp_opt_in?: number;
  age?: number;
  gender?: 'M' | 'F';
  height?: number;
  weight?: number;
}): Promise<ClientProfile> {
  const user = await apiRequest<ApiUser>('/users', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  return apiUserToClientProfile(user);
}

export async function updateUserStatusInApi(
  userId: string | number,
  status: 'pending' | 'active' | 'suspended' | 'rejected',
): Promise<ClientProfile> {
  const user = await apiRequest<ApiUser>(`/users/${userId}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  });
  return apiUserToClientProfile(user);
}


export async function updateUserAccessInApi(
  userId: string | number,
  payload: Partial<{
    status: 'pending' | 'active' | 'suspended' | 'rejected';
    pending_at: string | null;
    activated_at: string | null;
    suspended_at: string | null;
    status_changed_at: string | null;
    access_note: string;
  }>,
): Promise<ClientProfile> {
  const user = await apiRequest<ApiUser>(`/users/${userId}/access`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
  return apiUserToClientProfile(user);
}

export async function updateUserProfileInApi(
  userId: string | number,
  payload: Partial<{
    name: string;
    email: string;
    avatar_url: string;
    phone_number: string;
    whatsapp_opt_in: number;
    assigned_trainer_id: number | null;
    weight: number;
    height: number;
    age: number;
    gender: 'M' | 'F';
    body_fat: number;
    muscle_mass: number;
    goal: string;
    activity_level: 'sedentary' | 'light' | 'moderate' | 'very_active' | 'athlete';
    workouts_per_week: number;
    average_daily_steps: number;
    occupation_activity: 'sedentary' | 'light' | 'active' | 'physical';
    eating_pattern: 'omnivore' | 'flexitarian' | 'pescatarian' | 'vegetarian' | 'vegan';
    dietary_preferences: string;
    excluded_foods: string;
    food_allergies: string;
    food_intolerances: string;
    medical_conditions: string;
    medications: string;
  }>,
): Promise<ClientProfile> {
  const user = await apiRequest<ApiUser>(`/users/${userId}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
  return apiUserToClientProfile(user);
}

export async function changePasswordInApi(
  userId: string | number,
  currentPassword: string | undefined,
  newPassword: string,
): Promise<void> {
  await apiRequest<{ ok: boolean }>(`/users/${userId}/change-password`, {
    method: 'POST',
    body: JSON.stringify({
      current_password: currentPassword || undefined,
      new_password: newPassword,
    }),
  });
}

export async function resetUserPasswordInApi(userId: string | number, newPassword: string): Promise<void> {
  await changePasswordInApi(userId, undefined, newPassword);
}
