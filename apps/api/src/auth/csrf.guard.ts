import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CsrfService } from './csrf.service.js';
import type { Request } from 'express';
@Injectable()
export class CsrfGuard implements CanActivate {
  private readonly origins: Set<string>;
  constructor(private readonly csrf: CsrfService, config: ConfigService) {
    this.origins = new Set(config.get<string>('WEB_ORIGINS', '').split(',').map(x => x.trim()).filter(Boolean));
  }
  canActivate(context: ExecutionContext) {
    const req = context.switchToHttp().getRequest<Request>();
    const origin = req.get('origin');
    if (!origin || !this.origins.has(origin)) throw new ForbiddenException('Origin is not allowed');
    this.csrf.verify(req.get('x-csrf-token'));
    return true;
  }
}