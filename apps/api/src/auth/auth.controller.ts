import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Post, Req, Res, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import type { Request, Response } from 'express';
import { AuthService } from './auth.service.js';
import { CsrfService } from './csrf.service.js';
import { LoginDto } from './dto/login.dto.js';
import { RegisterDto } from './dto/register.dto.js';
import { Public } from './public.decorator.js';
import { CurrentUser } from './current-user.decorator.js';
import type { AuthenticatedRequest } from './auth.types.js';
import { CsrfGuard } from './csrf.guard.js';

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService, private readonly csrf: CsrfService) {}
  @Public()
  @Get('csrf')
  csrfToken() { return { csrfToken: this.csrf.issue() }; }

  @Public()
  @Post('register')
  @UseGuards(CsrfGuard)
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  register(@Body() dto: RegisterDto, @Res({ passthrough: true }) res: Response) {
    return this.auth.register(dto, res);
  }

  @Public()
  @Post('login')
  @UseGuards(CsrfGuard)
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  login(@Body() dto: LoginDto, @Res({ passthrough: true }) res: Response) {
    return this.auth.login(dto, res);
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @UseGuards(CsrfGuard)
  logout(@Req() req: AuthenticatedRequest, @Res({ passthrough: true }) res: Response) {
    return this.auth.logout(req, res);
  }

  @Get('me')
  me(@CurrentUser() user: AuthenticatedRequest['user']) { return { user }; }

  @Delete('sessions')
  @UseGuards(CsrfGuard)
  logoutAll(@Req() req: AuthenticatedRequest, @Res({ passthrough: true }) res: Response) {
    return this.auth.logoutAll(req.user!.id, req, res);
  }
}