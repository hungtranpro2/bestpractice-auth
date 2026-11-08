import 'server-only';

import { cookies } from 'next/headers';
import type { Session, User } from './auth-client';

const API_INTERNAL_URL = (process.env.API_INTERNAL_URL || 'http://localhost:4000/v1').replace(/\/+$/, '');
const SESSION_COOKIE_NAME = process.env.SESSION_COOKIE_NAME || '__Host-session';

type ApiEnvelope<T> = T;

async function serverGet<T>(path: string): Promise<ApiEnvelope<T> | null> {
  const cookie = (await cookies()).get(SESSION_COOKIE_NAME);
  if (!cookie?.value) return null;

  // Forward only the opaque session cookie. Do not forward all incoming headers.
  const response = await fetch(API_INTERNAL_URL + path, {
    method: 'GET',
    headers: {
      Accept: 'application/json',
      Cookie: SESSION_COOKIE_NAME + '=' + cookie.value,
    },
    cache: 'no-store',
    redirect: 'manual',
  });

  if (response.status === 401) return null;
  if (!response.ok) {
    throw new Error('NestJS API request failed with status ' + response.status);
  }
  return (await response.json()) as ApiEnvelope<T>;
}

/** Server Component data access. No session secret is returned to the browser. */
export async function getCurrentUser(): Promise<User | null> {
  const result = await serverGet<{ user: User }>('/auth/me');
  return result?.user ?? null;
}

/** Returns null when the upstream session is no longer valid. */
export async function getCurrentSessions(): Promise<Session[] | null> {
  const result = await serverGet<{ sessions: Session[] }>('/auth/sessions');
  return result?.sessions ?? null;
}