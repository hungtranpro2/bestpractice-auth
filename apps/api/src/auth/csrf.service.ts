import { ForbiddenException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash, createHmac, randomBytes, timingSafeEqual } from 'node:crypto';

const MAX_AGE_SECONDS = 10 * 60;

@Injectable()
export class CsrfService {
  private readonly secret: string;
  constructor(config: ConfigService) {
    this.secret = config.getOrThrow<string>('CSRF_SECRET');
  }

  private binding(sessionToken?: unknown): string {
    const raw = typeof sessionToken === 'string' ? sessionToken : 'anonymous';
    return createHash('sha256').update(raw).digest('hex');
  }

  issue(sessionToken?: unknown): string {
    const nonce = randomBytes(24).toString('base64url');
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const message = [nonce, timestamp, this.binding(sessionToken)].join('.');
    const mac = createHmac('sha256', this.secret).update(message).digest('base64url');
    return [nonce, timestamp, mac].join('.');
  }

  verify(token?: string, sessionToken?: unknown): void {
    const invalid = () => new ForbiddenException('CSRF token missing or invalid');
    if (!token || token.length > 256) throw invalid();
    const parts = token.split('.');
    if (parts.length !== 3) throw invalid();
    const [nonce, timestamp, supplied] = parts;
    if (!/^[A-Za-z0-9_-]{32}$/.test(nonce) || !/^\d{10}$/.test(timestamp) ||
        !/^[A-Za-z0-9_-]{43}$/.test(supplied)) throw invalid();
    const ts = Number(timestamp);
    const age = Math.floor(Date.now() / 1000) - ts;
    if (!Number.isSafeInteger(ts) || age < 0 || age > MAX_AGE_SECONDS) throw invalid();
    const message = [nonce, timestamp, this.binding(sessionToken)].join('.');
    const expected = createHmac('sha256', this.secret).update(message).digest();
    const actual = Buffer.from(supplied, 'base64url');
    if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) throw invalid();
  }
}