import { ForbiddenException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
@Injectable()
export class CsrfService {
  private readonly secret: string;
  constructor(config: ConfigService) { this.secret = config.getOrThrow('CSRF_SECRET'); }
  issue(): string {
    const nonce = randomBytes(32).toString('base64url');
    const mac = createHmac('sha256', this.secret).update(nonce).digest('base64url');
    return nonce + '.' + mac;
  }
  verify(token?: string): void {
    if (!token) throw new ForbiddenException('CSRF token missing or invalid');
    const [nonce, supplied, extra] = token.split('.');
    if (!nonce || !supplied || extra !== undefined) throw new ForbiddenException('CSRF token missing or invalid');
    const expected = createHmac('sha256', this.secret).update(nonce).digest();
    let actual: Buffer;
    try { actual = Buffer.from(supplied, 'base64url'); } catch { throw new ForbiddenException('CSRF token missing or invalid'); }
    if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) {
      throw new ForbiddenException('CSRF token missing or invalid');
    }
  }
}