import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash, randomBytes } from 'node:crypto';
import type { Response } from 'express';
import { PrismaService } from '../prisma/prisma.module.js';
import type { AuthenticatedRequest } from './auth.types.js';

const TOKEN_PATTERN = /^[A-Za-z0-9_-]{43}$/;
const TOUCH_INTERVAL_MS = 60_000;

@Injectable()
export class SessionService {
  readonly cookieName: string;
  private readonly secure: boolean;
  private readonly domain?: string;
  private readonly sameSite: 'lax' | 'strict' | 'none';
  private readonly ttlMs: number;
  private readonly idleMs: number;

  constructor(private readonly prisma: PrismaService, config: ConfigService) {
    this.cookieName = config.get<string>('SESSION_COOKIE_NAME', '__Host-session');
    this.secure = config.get<boolean>('SESSION_COOKIE_SECURE', true);
    this.domain = config.get<string>('SESSION_COOKIE_DOMAIN') || undefined;
    this.sameSite = config.get<'lax' | 'strict' | 'none'>('SESSION_COOKIE_SAME_SITE', 'lax');
    this.ttlMs = config.get<number>('SESSION_TTL_DAYS', 7) * 86_400_000;
    this.idleMs = config.get<number>('SESSION_IDLE_TTL_MINUTES', 1_440) * 60_000;

    if (!this.cookieName) throw new Error('SESSION_COOKIE_NAME must not be empty');
    if (this.cookieName.startsWith('__Host-') && (!this.secure || this.domain)) {
      throw new Error('__Host- cookie requires Secure, Path=/ and no Domain');
    }
    if (this.cookieName.startsWith('__Secure-') && !this.secure) {
      throw new Error('__Secure- cookie requires Secure');
    }
    if (this.sameSite === 'none' && !this.secure) throw new Error('SameSite=None requires Secure');
    if (config.get<string>('NODE_ENV') === 'production' && !this.secure) {
      throw new Error('SESSION_COOKIE_SECURE must be true in production');
    }
  }

  private hash(token: string) {
    return createHash('sha256').update(token).digest('hex');
  }

  private readToken(req?: AuthenticatedRequest): string | undefined {
    const token: unknown = req?.cookies?.[this.cookieName];
    return typeof token === 'string' && TOKEN_PATTERN.test(token) ? token : undefined;
  }

  private cookieOptions() {
    return {
      httpOnly: true,
      secure: this.secure,
      sameSite: this.sameSite,
      path: '/' as const,
      ...(this.domain ? { domain: this.domain } : {}),
    };
  }

  clearCookie(res: Response): void {
    res.clearCookie(this.cookieName, this.cookieOptions());
  }

  async create(userId: string, req: AuthenticatedRequest | undefined, res: Response): Promise<void> {
    const previousToken = this.readToken(req);
    if (previousToken) {
      await this.prisma.session.deleteMany({ where: { tokenHash: this.hash(previousToken) } });
    }

    const token = randomBytes(32).toString('base64url');
    const now = new Date();
    await this.prisma.session.create({
      data: {
        tokenHash: this.hash(token),
        userId,
        expiresAt: new Date(now.getTime() + this.ttlMs),
        lastSeenAt: now,
      },
    });
    res.cookie(this.cookieName, token, { ...this.cookieOptions(), maxAge: this.ttlMs });
  }

  async resolve(req: AuthenticatedRequest) {
    const token = this.readToken(req);
    if (!token) return null;
    const now = new Date();
    const session = await this.prisma.session.findUnique({
      where: { tokenHash: this.hash(token) },
      include: {
        user: { select: { id: true, email: true, displayName: true, isActive: true } },
      },
    });
    if (!session) return null;

    const idleExpired =
      this.idleMs > 0 && session.lastSeenAt.getTime() + this.idleMs <= now.getTime();
    if (
      session.revokedAt !== null ||
      session.expiresAt.getTime() <= now.getTime() ||
      idleExpired ||
      !session.user.isActive
    ) {
      // Only delete the current database row; never permit a stale "touch" to revive it.
      await this.prisma.session.deleteMany({ where: { id: session.id } });
      return null;
    }

    if (now.getTime() - session.lastSeenAt.getTime() >= TOUCH_INTERVAL_MS) {
      await this.prisma.session.updateMany({
        where: {
          id: session.id,
          revokedAt: null,
          lastSeenAt: { lt: new Date(now.getTime() - TOUCH_INTERVAL_MS) },
        },
        data: { lastSeenAt: now },
      });
    }

    req.sessionId = session.id;
    return {
      id: session.user.id,
      email: session.user.email,
      displayName: session.user.displayName,
    };
  }

  async list(userId: string) {
    const now = new Date();
    return this.prisma.session.findMany({
      where: {
        userId,
        revokedAt: null,
        expiresAt: { gt: now },
        ...(this.idleMs > 0
          ? { lastSeenAt: { gt: new Date(now.getTime() - this.idleMs) } }
          : {}),
      },
      select: { id: true, createdAt: true, lastSeenAt: true, expiresAt: true },
      orderBy: { lastSeenAt: 'desc' },
    });
  }

  async revokeById(userId: string, sessionId: string): Promise<void> {
    // Ownership is enforced in SQL, not by a preceding unprotected read.
    await this.prisma.session.deleteMany({ where: { id: sessionId, userId } });
  }

  async revoke(req: AuthenticatedRequest, res: Response): Promise<void> {
    if (req.sessionId) {
      await this.prisma.session.deleteMany({ where: { id: req.sessionId } });
    } else {
      const token = this.readToken(req);
      if (token) {
        await this.prisma.session.deleteMany({ where: { tokenHash: this.hash(token) } });
      }
    }
    this.clearCookie(res);
  }

  async revokeAll(userId: string): Promise<void> {
    await this.prisma.session.deleteMany({ where: { userId } });
  }
}