const API_BASE_URL = (process.env.NEXT_PUBLIC_API_BASE_URL || '/v1').replace(/\/+$/, '');
const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);
const CSRF_CACHE_MS = 8 * 60 * 1000;

type CsrfPayload = { csrfToken: string };

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

let csrfToken: string | null = null;
let csrfExpiresAt = 0;
let csrfRequest: Promise<string> | null = null;
let csrfEpoch = 0;

function apiUrl(path: string): string {
  return API_BASE_URL + (path.startsWith('/') ? path : '/' + path);
}

/** Call after login/logout/session rotation because CSRF tokens are session-bound. */
export function invalidateCsrfToken(): void {
  csrfEpoch += 1;
  csrfToken = null;
  csrfExpiresAt = 0;
  csrfRequest = null;
}

async function getCsrfToken(): Promise<string> {
  if (csrfToken && Date.now() < csrfExpiresAt) return csrfToken;
  if (csrfRequest) return csrfRequest;

  const epoch = csrfEpoch;
  const pending = (async () => {
    const response = await fetch(apiUrl('/auth/csrf'), {
      method: 'GET',
      credentials: 'include',
      cache: 'no-store',
      headers: { Accept: 'application/json' },
    });
    if (!response.ok) {
      throw new ApiError('Unable to obtain a CSRF token. Please refresh and try again.', response.status);
    }
    const payload = (await response.json()) as Partial<CsrfPayload>;
    if (typeof payload.csrfToken !== 'string' || payload.csrfToken.length === 0) {
      throw new ApiError('The API returned an invalid CSRF response.', response.status);
    }
    if (epoch === csrfEpoch) {
      csrfToken = payload.csrfToken;
      // The server expires the token at 10 minutes; refresh it earlier.
      csrfExpiresAt = Date.now() + CSRF_CACHE_MS;
    }
    return payload.csrfToken;
  })();

  csrfRequest = pending;
  try {
    return await pending;
  } finally {
    if (epoch === csrfEpoch && csrfRequest === pending) csrfRequest = null;
  }
}

/**
 * Browser-only API transport. Calls NestJS directly; no Next.js Route Handler
 * proxies business requests. The browser manages the HttpOnly session cookie.
 */
export async function apiFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const method = (init.method || 'GET').toUpperCase();
  const headers = new Headers(init.headers);
  if (!headers.has('Accept')) headers.set('Accept', 'application/json');

  if (!SAFE_METHODS.has(method)) {
    headers.set('X-CSRF-Token', await getCsrfToken());
  }

  return fetch(apiUrl(path), {
    ...init,
    method,
    headers,
    credentials: 'include',
    cache: 'no-store',
  });
}

export async function apiRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await apiFetch(path, init);
  if (response.status === 401) invalidateCsrfToken();

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as
      | { message?: string | string[]; error?: string }
      | null;
    const message = Array.isArray(payload?.message)
      ? payload.message.join(', ')
      : payload?.message || payload?.error || 'The request could not be completed.';
    throw new ApiError(message, response.status);
  }

  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}