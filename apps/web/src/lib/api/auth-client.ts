import { apiRequest, invalidateCsrfToken } from './api-client';

export type User = {
  id: string;
  email: string;
  displayName: string | null;
};

export type Session = {
  id: string;
  createdAt: string;
  lastSeenAt: string;
  expiresAt: string;
  current: boolean;
};

export async function login(input: { email: string; password: string }): Promise<User> {
  const result = await apiRequest<{ user: User }>('/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  invalidateCsrfToken();
  return result.user;
}

export async function register(input: {
  email: string;
  password: string;
  displayName: string;
}): Promise<User> {
  const result = await apiRequest<{ user: User }>('/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  invalidateCsrfToken();
  return result.user;
}

export async function logout(): Promise<void> {
  await apiRequest<{ success: boolean }>('/auth/logout', { method: 'POST' });
  invalidateCsrfToken();
}

export async function logoutAll(): Promise<void> {
  await apiRequest<{ success: boolean }>('/auth/logout-all', { method: 'POST' });
  invalidateCsrfToken();
}

export async function revokeSession(sessionId: string): Promise<void> {
  await apiRequest<void>('/auth/sessions/' + encodeURIComponent(sessionId), {
    method: 'DELETE',
  });
}