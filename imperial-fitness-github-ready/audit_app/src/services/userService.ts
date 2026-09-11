import { ClientProfile } from '../data/mockData';
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
}): Promise<ClientProfile> {
  const user = await apiRequest<ApiUser>('/users', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  return apiUserToClientProfile(user);
}

export async function updateUserStatusInApi(
  userId: string | number,
  status: 'pending' | 'active' | 'suspended' | 'rejected'
): Promise<ClientProfile> {
  const user = await apiRequest<ApiUser>(`/users/${userId}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  });
  return apiUserToClientProfile(user);
}

export async function updateUserProfileInApi(
  userId: string | number,
  payload: Partial<{
    name: string;
    email: string;
    avatar_url: string;
    assigned_trainer_id: number | null;
    weight: number;
    height: number;
    body_fat: number;
    muscle_mass: number;
    goal: string;
  }>
): Promise<ClientProfile> {
  const user = await apiRequest<ApiUser>(`/users/${userId}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
  return apiUserToClientProfile(user);
}

export async function changePasswordInApi(userId: string | number, currentPassword: string, newPassword: string): Promise<void> {
  await apiRequest<{ ok: boolean }>(`/users/${userId}/change-password`, {
    method: 'POST',
    body: JSON.stringify({ current_password: currentPassword, new_password: newPassword }),
  });
}
