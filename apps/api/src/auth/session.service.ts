import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash, randomBytes } from 'node:crypto';
import type { Response } from 'express';
import { PrismaService } from '../prisma/prisma.module.js';
import type { AuthenticatedRequest } from './auth.types.js';

@Injectable()
export class SessionService {
  readonly cookieName: string;
  private readonly secure: boolean;
  private readonly domain?: string;
  private readonly sameSite: 'lax' | 'strict' | 'none';
  private readonly ttlMs: number;
  private readonly idleMs: number;

  constructor(private readonly prisma: PrismaService, config: ConfigService) {
    this.cookieName = config.get('SESSION_COOKIE_NAME', '__Host-session');
    this.secure = config.get<boolean>('SESSION_COOKIE_SECURE', true);
    this.domain = config.get<string>('SESSION_COOKIE_DOMAIN') || undefined;
    this.sameSite = config.get('SESSION_COOKIE_SAME_SITE', 'lax');
    this.ttlMs = config.get<number>('SESSION_TTL_DAYS', 7) * 86400000;
    this.idleMs = config.get<number>('SESSION_IDLE_TTL_MINUTES', 1440) * 60000;
    if (this.cookieName.startsWith('__Host-') && (!this.secure || this.domain)) {
      throw new Error('__Host- cookie requires Secure and no Domain');
    }
    if (this.sameSite === 'none' && !this.secure) throw new Error('SameSite=None requires Secure');
  }
  private hash(token: string) { return createHash('sha256').update(token).digest('hex'); }
  private cookieOptions() {
    return { httpOnly: true, secure: this.secure, sameSite: this.sameSite, path: '/', domain: this.domain };
  }
  async create(userId: string, res: Response) {
    const token = randomBytes(32).toString('base64url');
    const now = new Date();
    await this.prisma.session.create({
      data: { tokenHash: this.hash(token), userId, expiresAt: new Date(now.getTime() + this.ttlMs), lastSeenAt: now },
    });
    res.cookie(this.cookieName, token, { ...this.cookieOptions(), maxAge: this.ttlMs });
  }
  async resolve(req: AuthenticatedRequest) {
    const token = req.cookies?.[this.cookieName];
    if (typeof token !== 'string' || token.length < 40 || token.length > 128) return null;
    const now = new Date();
    const session = await this.prisma.session.findUnique({
      where: { tokenHash: this.hash(token) },
      include: { user: { select: { id: true, email: true, displayName: true, isActive: true } } },
    });
    if (!session || session.revokedAt || session.expiresAt <= now ||
      (this.idleMs > 0 && session.lastSeenAt.getTime() + this.idleMs <= now.getTime()) || !session.user.isActive) {
      if (session) await this.prisma.session.deleteMany({ where: { id: session.id } });
      return null;
    }
    if (now.getTime() - session.lastSeenAt.getTime() > 60000) {
      await this.prisma.session.updateMany({
        where: { id: session.id, lastSeenAt: { lt: new Date(now.getTime() - 60000) } },
        data: { lastSeenAt: now },
      });
    }
    req.sessionId = session.id;
    return { id: session.user.id, email: session.user.email, displayName: session.user.displayName };
  }
  async revoke(req: AuthenticatedRequest, res: Response) {
    if (req.sessionId) await this.prisma.session.deleteMany({ where: { id: req.sessionId } });
    res.clearCookie(this.cookieName, this.cookieOptions());
  }
  async revokeAll(userId: string) {
    await this.prisma.session.deleteMany({ where: { userId } });
  }
}