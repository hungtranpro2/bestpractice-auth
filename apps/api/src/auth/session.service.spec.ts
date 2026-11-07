import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ConfigService } from '@nestjs/config';
import { SessionService } from './session.service.js';
describe('SessionService', () => {
  const prisma = {
    session: {
      create: vi.fn(), findUnique: vi.fn(), updateMany: vi.fn(), deleteMany: vi.fn(),
    },
  };
  const config = new ConfigService({
    SESSION_COOKIE_NAME: 'sid',
    SESSION_COOKIE_SECURE: false,
    SESSION_COOKIE_SAME_SITE: 'lax',
    SESSION_TTL_DAYS: 7,
    SESSION_IDLE_TTL_MINUTES: 1440,
  });
  let service: SessionService;
  beforeEach(() => {
    vi.clearAllMocks();
    service = new SessionService(prisma as never, config);
  });
  it('stores only a SHA-256 token hash and sets HttpOnly cookie', async () => {
    const res = { cookie: vi.fn() } as never;
    await service.create('user-1', res);
    const data = prisma.session.create.mock.calls[0][0].data;
    expect(data.tokenHash).toMatch(/^[a-f0-9]{64}$/);
    expect(data.tokenHash).not.toBe(res.cookie.mock.calls[0][1]);
    expect(res.cookie.mock.calls[0][2]).toMatchObject({ httpOnly: true, secure: false, path: '/' });
  });
  it('rejects __Host cookie misconfiguration', () => {
    const bad = new ConfigService({ SESSION_COOKIE_NAME: '__Host-session', SESSION_COOKIE_SECURE: false });
    expect(() => new SessionService(prisma as never, bad)).toThrow('__Host- cookie requires Secure and no Domain');
  });
  it('resolves valid sessions and attaches user and session id', async () => {
    prisma.session.findUnique.mockResolvedValue({
      id: 'session-1', revokedAt: null, expiresAt: new Date(Date.now() + 60000),
      lastSeenAt: new Date(), user: { id: 'user-1', email: 'a@example.com', displayName: null, isActive: true },
    });
    const req = { cookies: { sid: 'A'.repeat(43) } } as never;
    await expect(service.resolve(req)).resolves.toMatchObject({ id: 'user-1' });
    expect(req.sessionId).toBe('session-1');
  });
  it('rejects expired or revoked sessions', async () => {
    prisma.session.findUnique.mockResolvedValue({
      id: 'session-1', revokedAt: new Date(), expiresAt: new Date(Date.now() + 60000),
      lastSeenAt: new Date(), user: { id: 'user-1', email: 'a@example.com', displayName: null, isActive: true },
    });
    await expect(service.resolve({ cookies: { sid: 'A'.repeat(43) } } as never)).resolves.toBeNull();
  });
});