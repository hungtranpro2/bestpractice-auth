import { describe, expect, it } from 'vitest';
import { ConfigService } from '@nestjs/config';
import { ForbiddenException } from '@nestjs/common';
import { CsrfService } from './csrf.service.js';
describe('CsrfService', () => {
  const service = new CsrfService(new ConfigService({ CSRF_SECRET: 'test-secret-that-is-long-enough-for-hmac-256' }));
  it('issues verifiable tokens', () => { const token = service.issue(); expect(() => service.verify(token)).not.toThrow(); });
  it('rejects missing, malformed and tampered tokens', () => {
    for (const token of [undefined, '', 'bad.token', service.issue() + '.extra', 'a.' + 'x'.repeat(43)]) {
      expect(() => service.verify(token)).toThrow(ForbiddenException);
    }
  });
});