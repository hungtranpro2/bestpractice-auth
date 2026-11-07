import { ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.module.js';
import { PasswordService } from './password.service.js';
import { SessionService } from './session.service.js';
import type { Response } from 'express';
import type { AuthenticatedRequest } from './auth.types.js';

@Injectable()
export class AuthService {
  private readonly dummyHash: Promise<string>;
  constructor(private readonly prisma: PrismaService, private readonly passwords: PasswordService, private readonly sessions: SessionService) {
    this.dummyHash = this.passwords.hash('constant-time-dummy-password-not-for-users');
  }
  async register(input: { email: string; password: string; displayName: string }, res: Response) {
    const email = input.email.trim().toLowerCase();
    const passwordHash = await this.passwords.hash(input.password);
    try {
      const user = await this.prisma.user.create({
        data: { email, passwordHash, displayName: input.displayName.trim() },
        select: { id: true, email: true, displayName: true },
      });
      await this.sessions.create(user.id, res);
      return { user };
    } catch (error) {
      if (typeof error === 'object' && error !== null && 'code' in error && error.code === 'P2002') {
        throw new ConflictException('Email is already registered');
      }
      throw error;
    }
  }
  async login(input: { email: string; password: string }, res: Response) {
    const user = await this.prisma.user.findUnique({ where: { email: input.email.trim().toLowerCase() } });
    const valid = await this.passwords.verify(user?.passwordHash ?? await this.dummyHash, input.password);
    if (!user || !valid || !user.isActive) throw new UnauthorizedException('Invalid email or password');
    await this.sessions.create(user.id, res);
    return { user: { id: user.id, email: user.email, displayName: user.displayName } };
  }
  async logout(req: AuthenticatedRequest, res: Response) { await this.sessions.revoke(req, res); return { success: true }; }
  async logoutAll(userId: string, req: AuthenticatedRequest, res: Response) {
    await this.sessions.revokeAll(userId);
    await this.sessions.revoke(req, res);
    return { success: true };
  }
}