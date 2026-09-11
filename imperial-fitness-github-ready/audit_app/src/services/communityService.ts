import { API_URL, apiRequest } from './api';
import { SocialPost } from '../data/mockData';
import { ApiUser, apiUserToClientProfile } from './mappers';

interface ApiCommunityPost {
  id: number;
  author_id: number;
  author_name: string;
  author_avatar_url?: string | null;
  content: string;
  image_url?: string | null;
  tags: string[];
  likes_count: number;
  comments_count: number;
  created_at: string;
}

function absoluteUrl(url?: string | null): string | undefined {
  if (!url) return undefined;
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  return `${API_URL}${url}`;
}

function mapPost(post: ApiCommunityPost): SocialPost {
  return {
    id: String(post.id),
    authorName: post.author_name,
    authorAvatar: absoluteUrl(post.author_avatar_url) || 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80',
    authorRole: 'client',
    timeAgo: new Date(post.created_at).toLocaleDateString('es-CO', { day: 'numeric', month: 'short' }),
    content: post.tags.length ? `${post.content}\n\n${post.tags.map(tag => `#${tag}`).join(' ')}` : post.content,
    imageUrl: absoluteUrl(post.image_url),
    likes: post.likes_count,
    commentsCount: post.comments_count,
    likedByMe: false,
    comments: [],
  };
}

export async function listCommunityPostsFromApi(tag?: string, onlyFriends = false): Promise<SocialPost[]> {
  const params = new URLSearchParams();
  if (tag) params.set('tag', tag);
  if (onlyFriends) params.set('only_friends', 'true');
  const suffix = params.toString() ? `?${params.toString()}` : '';
  const posts = await apiRequest<ApiCommunityPost[]>(`/community/posts${suffix}`);
  return posts.map(mapPost);
}

export async function createCommunityPostInApi(payload: { content: string; tags: string; file?: File | null }): Promise<SocialPost> {
  const formData = new FormData();
  formData.append('content', payload.content);
  formData.append('tags', payload.tags);
  if (payload.file) formData.append('file', payload.file);
  const post = await apiRequest<ApiCommunityPost>('/community/posts', {
    method: 'POST',
    body: formData,
  });
  return mapPost(post);
}

export async function reactToCommunityPost(postId: string): Promise<{ liked: boolean }> {
  return apiRequest<{ liked: boolean }>(`/community/posts/${postId}/react`, { method: 'POST' });
}

export interface CommunityCommentApi {
  id: number;
  post_id: number;
  author_id: number;
  author_name: string;
  text: string;
  created_at: string;
}

export async function listPostCommentsFromApi(postId: string): Promise<CommunityCommentApi[]> {
  return apiRequest<CommunityCommentApi[]>(`/community/posts/${postId}/comments`);
}

export async function createPostCommentInApi(postId: string, text: string): Promise<{ ok: boolean; comment_id: number }> {
  return apiRequest<{ ok: boolean; comment_id: number }>(`/community/posts/${postId}/comments`, {
    method: 'POST',
    body: JSON.stringify({ text }),
  });
}

export async function deletePostCommentInApi(commentId: number): Promise<{ ok: boolean }> {
  return apiRequest<{ ok: boolean }>(`/community/comments/${commentId}`, { method: 'DELETE' });
}

export async function discoverCommunityUsersFromApi() {
  const users = await apiRequest<ApiUser[]>('/community/discover-users');
  return users.map(apiUserToClientProfile);
}