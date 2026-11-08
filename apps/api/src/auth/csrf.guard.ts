import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Request } from 'express';
import { CsrfService } from './csrf.service.js';
import { SessionService } from './session.service.js';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

@Injectable()
export class CsrfGuard implements CanActivate {
  private readonly origins: Set<string>;

  constructor(
    private readonly csrf: CsrfService,
    private readonly sessions: SessionService,
    config: ConfigService,
  ) {
    this.origins = new Set(
      config.get<string>('WEB_ORIGINS', '').split(',').map((value) => value.trim()).filter(Boolean),
    );
  }

  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<Request>();
    if (SAFE_METHODS.has(req.method)) return true;

    // This is a browser-only cookie API. Explicitly authorize each trusted origin.
    const origin = req.get('origin');
    if (!origin || !this.origins.has(origin)) {
      throw new ForbiddenException('Origin is not allowed');
    }
    this.csrf.verify(req.get('x-csrf-token'), req.cookies?.[this.sessions.cookieName]);
    return true;
  }
}