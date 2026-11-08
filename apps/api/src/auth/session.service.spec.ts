import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ConfigService } from '@nestjs/config';
import { SessionService } from './session.service.js';

describe('SessionService', () => {
  const prisma = {
    session: {
      create: vi.fn(),
      findUnique: vi.fn(),
      findMany: vi.fn(),
      updateMany: vi.fn(),
      deleteMany: vi.fn(),
    },
  };
  const config = new ConfigService({
    NODE_ENV: 'test',
    SESSION_COOKIE_NAME: 'sid',
    SESSION_COOKIE_SECURE: false,
    SESSION_COOKIE_SAME_SITE: 'lax',
    SESSION_TTL_DAYS: 7,
    SESSION_IDLE_TTL_MINUTES: 1_440,
  });
  let service: SessionService;

  beforeEach(() => {
    vi.resetAllMocks();
    prisma.session.create.mockResolvedValue({});
    prisma.session.updateMany.mockResolvedValue({ count: 1 });
    prisma.session.deleteMany.mockResolvedValue({ count: 1 });
    service = new SessionService(prisma as never, config);
  });

  function liveSession(overrides: Record<string, unknown> = {}) {
    return {
      id: 'session-1',
      revokedAt: null,
      expiresAt: new Date(Date.now() + 60_000),
      lastSeenAt: new Date(),
      user: { id: 'user-1', email: 'a@example.com', displayName: null, isActive: true },
      ...overrides,
    };
  }

  it('stores only a hash of the random token and sets HttpOnly cookie', async () => {
    const res = { cookie: vi.fn() } as never;
    await service.create('user-1', undefined, res);
    const data = prisma.session.create.mock.calls[0][0].data;
    const cookie = res.cookie.mock.calls[0];
    expect(data.tokenHash).toMatch(/^[a-f0-9]{64}$/);
    expect(cookie[1]).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(data.tokenHash).not.toEqual(cookie[1]);
    expect(cookie[2]).toMatchObject({ httpOnly: true, secure: false, path: '/' });
  });

  it('revokes the previous cookie before creating a new session', async () => {
    const existingToken = 'A'.repeat(43);
    const req = { cookies: { sid: existingToken } } as never;
    const res = { cookie: vi.fn() } as never;
    await service.create('user-1', req, res);
    expect(prisma.session.deleteMany).toHaveBeenCalledWith({
      where: { tokenHash: expect.stringMatching(/^[a-f0-9]{64}$/) },
    });
    expect(prisma.session.create).toHaveBeenCalledTimes(1);
    expect(res.cookie.mock.calls[0][1]).not.toBe(existingToken);
  });

  it('rejects an unsafe __Host cookie configuration', () => {
    const bad = new ConfigService({
      SESSION_COOKIE_NAME: '__Host-session',
      SESSION_COOKIE_SECURE: false,
    });
    expect(() => new SessionService(prisma as never, bad))
      .toThrow('__Host- cookie requires Secure, Path=/ and no Domain');
  });

  it('resolves a valid session and attaches user and session id', async () => {
    prisma.session.findUnique.mockResolvedValue(liveSession());
    const req = { cookies: { sid: 'A'.repeat(43) } } as never;
    await expect(service.resolve(req)).resolves.toMatchObject({ id: 'user-1' });
    expect(req.sessionId).toBe('session-1');
  });

  it.each([
    ['expired', { expiresAt: new Date(Date.now() - 1_000) }],
    ['revoked', { revokedAt: new Date() }],
    ['inactive user', { user: { id: 'u', email: 'a@example.com', displayName: null, isActive: false } }],
    ['idle expired', { lastSeenAt: new Date(Date.now() - 2 * 86_400_000) }],
  ])('rejects %s sessions', async (_label, fields) => {
    prisma.session.findUnique.mockResolvedValue(liveSession(fields));
    await expect(service.resolve({ cookies: { sid: 'A'.repeat(43) } } as never))
      .resolves.toBeNull();
  });

  it('does not query the database for malformed tokens', async () => {
    await expect(service.resolve({ cookies: { sid: 'invalid' } } as never))
      .resolves.toBeNull();
    expect(prisma.session.findUnique).not.toHaveBeenCalled();
  });

  it('revokeById always constrains deletion by user ownership', async () => {
    await service.revokeById('user-1', 'session-1');
    expect(prisma.session.deleteMany).toHaveBeenCalledWith({
      where: { id: 'session-1', userId: 'user-1' },
    });
  });

  it('clears cookie after revoking the session', async () => {
    const response = { clearCookie: vi.fn() } as never;
    const req = { sessionId: 'session-1', cookies: { sid: 'A'.repeat(43) } } as never;
    await service.revoke(req, response);
    expect(prisma.session.deleteMany).toHaveBeenCalledWith({ where: { id: 'session-1' } });
    expect(response.clearCookie).toHaveBeenCalledWith(
      'sid',
      expect.objectContaining({ httpOnly: true, path: '/' }),
    );
  });
});