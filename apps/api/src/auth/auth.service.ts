import { ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.module.js';
import { PasswordService } from './password.service.js';
import { SessionService } from './session.service.js';
import type { Response } from 'express';
import type { AuthenticatedRequest } from './auth.types.js';

@Injectable()
export class AuthService {
  private dummyHash?: Promise<string>;

  constructor(
    private readonly prisma: PrismaService,
    private readonly passwords: PasswordService,
    private readonly sessions: SessionService,
  ) {}

  private getDummyHash(): Promise<string> {
    // Lazily initialize to avoid an unhandled rejection in a constructor.
    return (this.dummyHash ??= this.passwords
      .hash('dummy-password-not-associated-with-a-user')
      .catch((error: unknown) => {
        this.dummyHash = undefined;
        throw error;
      }));
  }

  async register(
    input: { email: string; password: string; displayName: string },
    req: AuthenticatedRequest,
    res: Response,
  ) {
    const email = input.email.trim().toLowerCase();
    const passwordHash = await this.passwords.hash(input.password);
    try {
      const user = await this.prisma.user.create({
        data: { email, passwordHash, displayName: input.displayName.trim() },
        select: { id: true, email: true, displayName: true },
      });
      await this.sessions.create(user.id, req, res);
      return { user };
    } catch (error) {
      if (typeof error === 'object' && error !== null && 'code' in error && error.code === 'P2002') {
        throw new ConflictException('Email is already registered');
      }
      throw error;
    }
  }

  async login(
    input: { email: string; password: string },
    req: AuthenticatedRequest,
    res: Response,
  ) {
    const user = await this.prisma.user.findUnique({
      where: { email: input.email.trim().toLowerCase() },
    });
    const hash = user?.passwordHash ?? (await this.getDummyHash());
    const valid = await this.passwords.verify(hash, input.password);
    if (!user || !valid || !user.isActive) {
      throw new UnauthorizedException('Invalid email or password');
    }

    // SessionService invalidates the previous browser session (fixation defense).
    await this.sessions.create(user.id, req, res);
    return { user: { id: user.id, email: user.email, displayName: user.displayName } };
  }

  async logout(req: AuthenticatedRequest, res: Response) {
    await this.sessions.revoke(req, res);
    return { success: true };
  }

  async logoutAll(userId: string, req: AuthenticatedRequest, res: Response) {
    await this.sessions.revokeAll(userId);
    await this.sessions.revoke(req, res);
    return { success: true };
  }
}