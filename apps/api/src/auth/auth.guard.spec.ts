import { describe, expect, it, vi } from 'vitest';
import { UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from './auth.guard.js';

function context(req: Record<string, unknown>) {
  return {
    getHandler: () => ({}),
    getClass: () => ({}),
    switchToHttp: () => ({ getRequest: () => req }),
  } as never;
}

describe('AuthGuard', () => {
  it('allows explicitly public endpoints', async () => {
    const reflector = { getAllAndOverride: vi.fn().mockReturnValue(true) };
    const sessions = { resolve: vi.fn() };
    const guard = new AuthGuard(reflector as never, sessions as never);
    await expect(guard.canActivate(context({}))).resolves.toBe(true);
    expect(sessions.resolve).not.toHaveBeenCalled();
  });

  it('denies anonymous access to protected endpoints', async () => {
    const reflector = { getAllAndOverride: vi.fn().mockReturnValue(false) };
    const sessions = { resolve: vi.fn().mockResolvedValue(null) };
    const guard = new AuthGuard(reflector as never, sessions as never);
    await expect(guard.canActivate(context({}))).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('attaches the authenticated user to the request', async () => {
    const reflector = { getAllAndOverride: vi.fn().mockReturnValue(false) };
    const sessions = {
      resolve: vi.fn().mockResolvedValue({ id: 'user-1', email: 'a@b.com', displayName: null }),
    };
    const req: Record<string, unknown> = {};
    const guard = new AuthGuard(reflector as never, sessions as never);
    await expect(guard.canActivate(context(req))).resolves.toBe(true);
    expect(req.user).toEqual({ id: 'user-1', email: 'a@b.com', displayName: null });
  });
});