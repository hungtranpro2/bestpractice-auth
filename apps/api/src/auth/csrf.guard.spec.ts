import { describe, expect, it, vi } from 'vitest';
import { ConfigService } from '@nestjs/config';
import { ForbiddenException } from '@nestjs/common';
import { CsrfGuard } from './csrf.guard.js';

function context(method: string, origin?: string, token?: string) {
  const req = {
    method,
    cookies: { sid: 'session-value' },
    get: (header: string) => {
      if (header === 'origin') return origin;
      if (header === 'x-csrf-token') return token;
      return undefined;
    },
  };
  return { switchToHttp: () => ({ getRequest: () => req }) } as never;
}

describe('CsrfGuard', () => {
  const csrf = { verify: vi.fn() };
  const sessions = { cookieName: 'sid' };
  const guard = new CsrfGuard(
    csrf as never,
    sessions as never,
    new ConfigService({ WEB_ORIGINS: 'https://app.test.com' }),
  );

  it('allows safe GET and HEAD requests', () => {
    expect(guard.canActivate(context('GET'))).toBe(true);
    expect(guard.canActivate(context('HEAD'))).toBe(true);
  });

  it('rejects writes from untrusted or missing Origins', () => {
    for (const origin of ['https://evil.test.com', undefined]) {
      expect(() => guard.canActivate(context('POST', origin, 'csrf')))
        .toThrow(ForbiddenException);
    }
  });

  it('verifies the CSRF token for trusted writes', () => {
    csrf.verify.mockReset();
    expect(guard.canActivate(context('DELETE', 'https://app.test.com', 'csrf'))).toBe(true);
    expect(csrf.verify).toHaveBeenCalledWith('csrf', 'session-value');
  });
});