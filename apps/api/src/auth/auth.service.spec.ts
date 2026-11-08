import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { AuthService } from './auth.service.js';

describe('AuthService', () => {
  const prisma = {
    user: {
      create: vi.fn(),
      findUnique: vi.fn(),
    },
  };
  const passwords = { hash: vi.fn(), verify: vi.fn() };
  const sessions = { create: vi.fn(), revoke: vi.fn(), revokeAll: vi.fn() };
  const request = { cookies: {} } as never;
  const response = { cookie: vi.fn() } as never;
  let service: AuthService;

  beforeEach(() => {
    vi.resetAllMocks();
    passwords.hash.mockResolvedValue('argon2-hash');
    passwords.verify.mockResolvedValue(true);
    sessions.create.mockResolvedValue(undefined);
    service = new AuthService(prisma as never, passwords as never, sessions as never);
  });

  it('normalizes email and creates a fresh session on login', async () => {
    prisma.user.findUnique.mockResolvedValue({
      id: 'user-1',
      email: 'user@example.com',
      displayName: 'User',
      passwordHash: 'argon2-hash',
      isActive: true,
    });
    await expect(service.login({ email: ' USER@EXAMPLE.COM ', password: 'secret' }, request, response))
      .resolves.toEqual({
        user: { id: 'user-1', email: 'user@example.com', displayName: 'User' },
      });
    expect(prisma.user.findUnique).toHaveBeenCalledWith({
      where: { email: 'user@example.com' },
    });
    expect(sessions.create).toHaveBeenCalledWith('user-1', request, response);
  });

  it('uses a dummy password hash for unknown accounts', async () => {
    prisma.user.findUnique.mockResolvedValue(null);
    passwords.verify.mockResolvedValue(false);
    await expect(service.login({ email: 'missing@example.com', password: 'bad' }, request, response))
      .rejects.toBeInstanceOf(UnauthorizedException);
    expect(passwords.verify).toHaveBeenCalledWith('argon2-hash', 'bad');
    expect(sessions.create).not.toHaveBeenCalled();
  });

  it('rejects invalid password and disabled users', async () => {
    prisma.user.findUnique.mockResolvedValue({
      id: 'user-1', email: 'user@example.com', displayName: null,
      passwordHash: 'argon2-hash', isActive: true,
    });
    passwords.verify.mockResolvedValue(false);
    await expect(service.login({ email: 'user@example.com', password: 'bad' }, request, response))
      .rejects.toBeInstanceOf(UnauthorizedException);

    prisma.user.findUnique.mockResolvedValue({
      id: 'user-1', email: 'user@example.com', displayName: null,
      passwordHash: 'argon2-hash', isActive: false,
    });
    passwords.verify.mockResolvedValue(true);
    await expect(service.login({ email: 'user@example.com', password: 'correct' }, request, response))
      .rejects.toBeInstanceOf(UnauthorizedException);
    expect(sessions.create).not.toHaveBeenCalled();
  });

  it('registers a user with a hashed password and no hash in the response', async () => {
    prisma.user.create.mockResolvedValue({ id: 'user-1', email: 'user@example.com', displayName: 'User' });
    await expect(service.register({
      email: ' USER@EXAMPLE.COM ', password: 'correct horse battery staple', displayName: ' User ',
    }, request, response)).resolves.toEqual({
      user: { id: 'user-1', email: 'user@example.com', displayName: 'User' },
    });
    expect(prisma.user.create).toHaveBeenCalledWith({
      data: { email: 'user@example.com', passwordHash: 'argon2-hash', displayName: 'User' },
      select: { id: true, email: true, displayName: true },
    });
    expect(sessions.create).toHaveBeenCalledWith('user-1', request, response);
  });

  it('handles duplicate user emails', async () => {
    prisma.user.create.mockRejectedValue({ code: 'P2002' });
    await expect(service.register({
      email: 'user@example.com', password: 'valid password', displayName: 'User',
    }, request, response)).rejects.toBeInstanceOf(ConflictException);
  });

  it('revokes the current session and all sessions', async () => {
    await expect(service.logout(request, response)).resolves.toEqual({ success: true });
    await expect(service.logoutAll('user-1', request, response)).resolves.toEqual({ success: true });
    expect(sessions.revokeAll).toHaveBeenCalledWith('user-1');
    expect(sessions.revoke).toHaveBeenCalledTimes(2);
  });
});