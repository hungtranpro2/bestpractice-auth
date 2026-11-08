import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import Joi from 'joi';
import { ThrottlerModule } from '@nestjs/throttler';
import { PrismaModule } from './prisma/prisma.module.js';
import { AuthModule } from './auth/auth.module.js';
import { AppController } from './app.controller.js';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validationSchema: Joi.object({
        NODE_ENV: Joi.string().valid('development', 'test', 'production').default('development'),
        PORT: Joi.number().port().default(4000),
        DATABASE_URL: Joi.string().required(),
        WEB_ORIGINS: Joi.string().required(),
        SESSION_COOKIE_NAME: Joi.string().default('__Host-session'),
        SESSION_COOKIE_SECURE: Joi.boolean().truthy('true').falsy('false').default(true),
        SESSION_COOKIE_DOMAIN: Joi.string().allow('').default(''),
        SESSION_COOKIE_SAME_SITE: Joi.string().valid('lax', 'strict', 'none').default('lax'),
        SESSION_TTL_DAYS: Joi.number().integer().min(1).max(90).default(7),
        SESSION_IDLE_TTL_MINUTES: Joi.number().integer().min(0).max(43_200).default(1_440),
        CSRF_SECRET: Joi.string().min(32).required(),
        TRUST_PROXY_HOPS: Joi.number().integer().min(0).default(0),
      }),
    }),
    ThrottlerModule.forRoot([{ name: 'default', ttl: 60_000, limit: 100 }]),
    PrismaModule,
    AuthModule,
  ],
  controllers: [AppController],
})
export class AppModule {}