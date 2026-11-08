import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

describe('browser API client', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('calls a safe endpoint directly with credentials and no-store', async () => {
    const fetchMock = vi.mocked(fetch);
    fetchMock.mockResolvedValueOnce(Response.json({ user: { id: 'u1' } }));
    const { apiRequest } = await import('./api-client');
    await expect(apiRequest('/auth/me')).resolves.toEqual({ user: { id: 'u1' } });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0][0]).toBe('http://localhost:4000/v1/auth/me');
    expect(fetchMock.mock.calls[0][1]).toMatchObject({
      credentials: 'include',
      cache: 'no-store',
      method: 'GET',
    });
  });

  it('fetches a CSRF token before unsafe requests and sends it to NestJS', async () => {
    const fetchMock = vi.mocked(fetch);
    fetchMock
      .mockResolvedValueOnce(Response.json({ csrfToken: 'signed-csrf-token' }))
      .mockResolvedValueOnce(Response.json({ success: true }));
    const { apiRequest } = await import('./api-client');
    await expect(apiRequest('/auth/logout', { method: 'POST' })).resolves.toEqual({ success: true });
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls[0][0]).toBe('http://localhost:4000/v1/auth/csrf');
    const requestInit = fetchMock.mock.calls[1][1] as RequestInit;
    expect(new Headers(requestInit.headers).get('X-CSRF-Token')).toBe('signed-csrf-token');
    expect(requestInit.credentials).toBe('include');
  });

  it('shares a pending CSRF request across concurrent unsafe requests', async () => {
    const fetchMock = vi.mocked(fetch);
    let resolveCsrf!: (response: Response) => void;
    const pending = new Promise<Response>((resolve) => { resolveCsrf = resolve; });
    fetchMock.mockReturnValueOnce(pending);
    fetchMock
      .mockResolvedValueOnce(Response.json({ ok: true }))
      .mockResolvedValueOnce(Response.json({ ok: true }));
    const { apiRequest } = await import('./api-client');
    const first = apiRequest('/auth/logout', { method: 'POST' });
    const second = apiRequest('/auth/logout-all', { method: 'POST' });
    await Promise.resolve();
    expect(fetchMock).toHaveBeenCalledTimes(1);
    resolveCsrf(Response.json({ csrfToken: 'shared-token' }));
    await Promise.all([first, second]);
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(new Headers(fetchMock.mock.calls[1][1]?.headers).get('X-CSRF-Token')).toBe('shared-token');
    expect(new Headers(fetchMock.mock.calls[2][1]?.headers).get('X-CSRF-Token')).toBe('shared-token');
  });

  it('invalidates the CSRF token after a successful login', async () => {
    const fetchMock = vi.mocked(fetch);
    fetchMock
      .mockResolvedValueOnce(Response.json({ csrfToken: 'pre-auth-token' }))
      .mockResolvedValueOnce(Response.json({ user: { id: 'u1', email: 'a@b.com', displayName: 'A' } }))
      .mockResolvedValueOnce(Response.json({ csrfToken: 'post-auth-token' }))
      .mockResolvedValueOnce(Response.json({ success: true }));
    const { login, logout } = await import('./auth-client');
    await login({ email: 'a@b.com', password: 'password' });
    await logout();
    expect(fetchMock).toHaveBeenCalledTimes(4);
    expect(new Headers(fetchMock.mock.calls[1][1]?.headers).get('X-CSRF-Token')).toBe('pre-auth-token');
    expect(fetchMock.mock.calls[2][0]).toBe('http://localhost:4000/v1/auth/csrf');
    expect(new Headers(fetchMock.mock.calls[3][1]?.headers).get('X-CSRF-Token')).toBe('post-auth-token');
  });

  it('surfaces the API error status and message', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(Response.json(
      { statusCode: 401, message: 'Invalid email or password' },
      { status: 401 },
    ));
    const { apiRequest, ApiError } = await import('./api-client');
    await expect(apiRequest('/auth/login')).rejects.toMatchObject({
      name: 'ApiError',
      status: 401,
      message: 'Invalid email or password',
    });
    expect(ApiError).toBeDefined();
  });

  it('returns undefined for 204 responses', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(new Response(null, { status: 204 }));
    const { apiRequest } = await import('./api-client');
    await expect(apiRequest('/auth/sessions/id', { method: 'DELETE' })).resolves.toBeUndefined();
  });
});