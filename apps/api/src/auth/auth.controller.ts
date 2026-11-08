import {
  Body, Controller, Delete, Get, HttpCode, HttpStatus, Param,
  ParseUUIDPipe, Post, Req, Res,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import type { Response } from 'express';
import { AuthService } from './auth.service.js';
import { SessionService } from './session.service.js';
import { CsrfService } from './csrf.service.js';
import { LoginDto } from './dto/login.dto.js';
import { RegisterDto } from './dto/register.dto.js';
import { Public } from './public.decorator.js';
import { CurrentUser } from './current-user.decorator.js';
import type { AuthenticatedRequest } from './auth.types.js';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly sessions: SessionService,
    private readonly csrf: CsrfService,
  ) {}

  @Public()
  @Get('csrf')
  csrfToken(@Req() req: AuthenticatedRequest) {
    return { csrfToken: this.csrf.issue(req.cookies?.[this.sessions.cookieName]) };
  }

  @Public()
  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  register(
    @Body() dto: RegisterDto,
    @Req() req: AuthenticatedRequest,
    @Res({ passthrough: true }) res: Response,
  ) {
    return this.auth.register(dto, req, res);
  }

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  login(
    @Body() dto: LoginDto,
    @Req() req: AuthenticatedRequest,
    @Res({ passthrough: true }) res: Response,
  ) {
    return this.auth.login(dto, req, res);
  }

  @Get('me')
  me(@CurrentUser() user: AuthenticatedRequest['user']) {
    return { user };
  }

  @Get('sessions')
  async listSessions(@Req() req: AuthenticatedRequest) {
    const sessions = await this.sessions.list(req.user!.id);
    return { sessions: sessions.map((session) => ({
      ...session,
      current: session.id === req.sessionId,
    })) };
  }

  @Delete('sessions/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async revokeSession(
    @Req() req: AuthenticatedRequest,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Res({ passthrough: true }) res: Response,
  ) {
    await this.sessions.revokeById(req.user!.id, id);
    if (req.sessionId === id) this.sessions.clearCookie(res);
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  logout(
    @Req() req: AuthenticatedRequest,
    @Res({ passthrough: true }) res: Response,
  ) {
    return this.auth.logout(req, res);
  }

  @Post('logout-all')
  @HttpCode(HttpStatus.OK)
  logoutAll(
    @Req() req: AuthenticatedRequest,
    @Res({ passthrough: true }) res: Response,
  ) {
    return this.auth.logoutAll(req.user!.id, req, res);
  }
}