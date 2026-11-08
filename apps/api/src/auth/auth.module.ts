import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard } from '@nestjs/throttler';
import { AuthController } from './auth.controller.js';
import { AuthService } from './auth.service.js';
import { AuthGuard } from './auth.guard.js';
import { PasswordService } from './password.service.js';
import { SessionService } from './session.service.js';
import { CsrfService } from './csrf.service.js';
import { CsrfGuard } from './csrf.guard.js';

@Module({
  controllers: [AuthController],
  providers: [
    AuthService,
    PasswordService,
    SessionService,
    CsrfService,
    CsrfGuard,
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: AuthGuard },
    { provide: APP_GUARD, useExisting: CsrfGuard },
  ],
  exports: [AuthService, SessionService, PasswordService],
})
export class AuthModule {}