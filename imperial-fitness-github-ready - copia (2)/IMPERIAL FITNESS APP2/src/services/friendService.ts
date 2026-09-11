import { apiRequest } from './api';

export interface FriendshipApi {
  id: number;
  requester_id: number;
  addressee_id: number;
  status: string;
  created_at: string;
}

export async function listFriendsFromApi(): Promise<FriendshipApi[]> {
  return apiRequest<FriendshipApi[]>('/community/friends');
}

export async function listFriendRequestsFromApi(): Promise<FriendshipApi[]> {
  return apiRequest<FriendshipApi[]>('/community/friends/requests');
}

export async function listSentFriendRequestsFromApi(): Promise<FriendshipApi[]> {
  return apiRequest<FriendshipApi[]>('/community/friends/sent');
}

export async function sendFriendRequestInApi(addresseeId: number): Promise<FriendshipApi> {
  return apiRequest<FriendshipApi>('/community/friends/request', {
    method: 'POST',
    body: JSON.stringify({ addressee_id: addresseeId }),
  });
}

export async function acceptFriendRequestInApi(friendshipId: number): Promise<FriendshipApi> {
  return apiRequest<FriendshipApi>(`/community/friends/${friendshipId}/accept`, { method: 'POST' });
}

export async function rejectFriendRequestInApi(friendshipId: number): Promise<FriendshipApi> {
  return apiRequest<FriendshipApi>(`/community/friends/${friendshipId}/reject`, { method: 'POST' });
}

export async function deleteFriendshipInApi(friendshipId: number): Promise<{ ok: boolean }> {
  return apiRequest<{ ok: boolean }>(`/community/friends/${friendshipId}`, { method: 'DELETE' });
}