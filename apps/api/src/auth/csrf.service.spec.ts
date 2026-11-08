import { describe, expect, it, vi, afterEach } from 'vitest';
import { ConfigService } from '@nestjs/config';
import { ForbiddenException } from '@nestjs/common';
import { CsrfService } from './csrf.service.js';

describe('CsrfService', () => {
  const service = new CsrfService(new ConfigService({
    CSRF_SECRET: 'this-is-only-a-long-enough-test-csrf-secret',
  }));

  afterEach(() => vi.useRealTimers());

  it('accepts a freshly issued token bound to the same session', () => {
    const token = service.issue('session-token-A');
    expect(() => service.verify(token, 'session-token-A')).not.toThrow();
  });

  it('rejects missing, malformed and modified tokens', () => {
    const valid = service.issue();
    for (const token of [
      undefined, '', 'bad.token', valid + '.extra', valid.slice(0, -1) + '#',
    ]) {
      expect(() => service.verify(token)).toThrow(ForbiddenException);
    }
  });

  it('does not accept a CSRF token from another browser session', () => {
    const token = service.issue('session-token-A');
    expect(() => service.verify(token, 'session-token-B')).toThrow(ForbiddenException);
    expect(() => service.verify(token)).toThrow(ForbiddenException);
  });

  it('expires a token after 10 minutes', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-11-07T12:00:00.000Z'));
    const token = service.issue();
    vi.setSystemTime(new Date('2026-11-07T12:11:00.000Z'));
    expect(() => service.verify(token)).toThrow(ForbiddenException);
  });
});