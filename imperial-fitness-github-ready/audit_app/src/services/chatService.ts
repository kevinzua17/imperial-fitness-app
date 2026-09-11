import { apiRequest } from './api';
import { ApiUser, apiUserToClientProfile } from './mappers';

export interface ChatMessageApi {
  id: number;
  sender_id: number;
  receiver_id: number;
  text: string;
  created_at: string;
  read_at?: string | null;
}

export async function listChatMessagesFromApi(withUserId: string): Promise<ChatMessageApi[]> {
  return apiRequest<ChatMessageApi[]>(`/chat/messages?with_user_id=${encodeURIComponent(withUserId)}`);
}

export async function listConversationsFromApi() {
  const users = await apiRequest<ApiUser[]>('/chat/conversations');
  return users.map(apiUserToClientProfile);
}

export async function listChatMessagesByPathFromApi(userId: string): Promise<ChatMessageApi[]> {
  return apiRequest<ChatMessageApi[]>(`/chat/messages/${encodeURIComponent(userId)}`);
}

export async function sendChatMessageToApi(receiverId: string, text: string): Promise<ChatMessageApi> {
  return apiRequest<ChatMessageApi>('/chat/messages', {
    method: 'POST',
    body: JSON.stringify({ receiver_id: Number(receiverId), text }),
  });
}