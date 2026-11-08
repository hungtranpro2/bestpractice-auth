import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { Test } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { randomUUID } from 'node:crypto';
import { AppModule } from '../src/app.module.js';
import { configureApp } from '../src/app.bootstrap.js';
import { PrismaService } from '../src/prisma/prisma.module.js';

const ORIGIN = 'http://localhost:3000';
const PASSWORD = 'a-strong-test-password-123';

describe('Authentication E2E (PostgreSQL)', () => {
  let app: INestApplication;
  let db: PrismaService;

  beforeAll(async () => {
    const testing = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = testing.createNestApplication();
    configureApp(app);
    await app.init();
    db = app.get(PrismaService);
  });

  afterAll(async () => {
    if (app) await app.close();
  });

  function agent() {
    return request(app.getHttpServer());
  }

  async function csrf(cookie?: string): Promise<string> {
    let req = agent().get('/v1/auth/csrf');
    if (cookie) req = req.set('Cookie', cookie);
    const res = await req.expect(200);
    expect(res.headers['cache-control']).toContain('no-store');
    return res.body.csrfToken as string;
  }

  function sessionCookie(response: request.Response): string {
    const header = response.headers['set-cookie'];
    const setCookie = Array.isArray(header) ? header[0] : header;
    expect(setCookie).toBeDefined();
    expect(setCookie).toContain('HttpOnly');
    expect(setCookie).toContain('Secure');
    expect(setCookie).toContain('SameSite=Lax');
    return (setCookie as string).split(';')[0];
  }

  async function register(): Promise<{ userId: string; cookie: string; email: string }> {
    const email = 'test-' + randomUUID() + '@example.com';
    const token = await csrf();
    const result = await agent()
      .post('/v1/auth/register')
      .set('Origin', ORIGIN)
      .set('X-CSRF-Token', token)
      .send({ email, password: PASSWORD, displayName: 'Test User' })
      .expect(201);
    const cookie = sessionCookie(result);
    expect(result.body.user).toMatchObject({ email, displayName: 'Test User' });
    expect(result.body.user).not.toHaveProperty('passwordHash');
    return { userId: result.body.user.id as string, cookie, email };
  }

  it('registers, stores only the cookie hash, and authenticates the current user', async () => {
    const { cookie, userId, email } = await register();
    const me = await agent().get('/v1/auth/me').set('Cookie', cookie).expect(200);
    expect(me.body.user).toMatchObject({ id: userId, email });
    const sessions = await db.session.findMany({ where: { userId } });
    expect(sessions).toHaveLength(1);
    expect(sessions[0].tokenHash).toMatch(/^[a-f0-9]{64}$/);
    expect(cookie).not.toContain(sessions[0].tokenHash);
    await agent().get('/v1/auth/me').expect(401);
  });

  it('requires CSRF and a trusted Origin for register', async () => {
    const token = await csrf();
    const input = { email: 'test-' + randomUUID() + '@example.com', password: PASSWORD, displayName: 'T' };
    await agent().post('/v1/auth/register')
      .set('Origin', ORIGIN).send(input).expect(403);
    await agent().post('/v1/auth/register')
      .set('Origin', 'https://attacker.invalid')
      .set('X-CSRF-Token', token).send(input).expect(403);
    await agent().post('/v1/auth/register')
      .set('Origin', ORIGIN)
      .set('X-CSRF-Token', 'tampered').send(input).expect(403);
  });

  it('rotates the session on login and rejects old cookies', async () => {
    const { cookie: oldCookie, userId, email } = await register();
    const token = await csrf(oldCookie);
    const login = await agent().post('/v1/auth/login')
      .set('Origin', ORIGIN).set('Cookie', oldCookie)
      .set('X-CSRF-Token', token)
      .send({ email, password: PASSWORD }).expect(200);
    const newCookie = sessionCookie(login);
    expect(newCookie).not.toBe(oldCookie);
    await agent().get('/v1/auth/me').set('Cookie', oldCookie).expect(401);
    await agent().get('/v1/auth/me').set('Cookie', newCookie).expect(200);
    expect(await db.session.count({ where: { userId } })).toBe(1);
  });

  it('lists sessions, revokes a selected session and rejects old cookies', async () => {
    const { cookie, userId } = await register();
    const list = await agent().get('/v1/auth/sessions').set('Cookie', cookie).expect(200);
    expect(list.body.sessions).toHaveLength(1);
    expect(list.body.sessions[0].current).toBe(true);
    expect(list.body.sessions[0]).not.toHaveProperty('tokenHash');
    const id = list.body.sessions[0].id as string;
    const token = await csrf(cookie);
    await agent().delete('/v1/auth/sessions/' + id)
      .set('Cookie', cookie).set('Origin', ORIGIN).set('X-CSRF-Token', token)
      .expect(204);
    await agent().get('/v1/auth/me').set('Cookie', cookie).expect(401);
    expect(await db.session.count({ where: { userId } })).toBe(0);
  });

  it('logs out and prevents replay of a revoked cookie', async () => {
    const { cookie } = await register();
    const token = await csrf(cookie);
    const logout = await agent().post('/v1/auth/logout')
      .set('Origin', ORIGIN).set('Cookie', cookie).set('X-CSRF-Token', token)
      .expect(200);
    expect(logout.body).toEqual({ success: true });
    await agent().get('/v1/auth/me').set('Cookie', cookie).expect(401);
  });

  it('logout-all revokes every session created for the user', async () => {
    const { cookie: firstCookie, email, userId } = await register();
    const anonymousCsrf = await csrf();
    const login = await agent().post('/v1/auth/login')
      .set('Origin', ORIGIN).set('X-CSRF-Token', anonymousCsrf)
      .send({ email, password: PASSWORD }).expect(200);
    const secondCookie = sessionCookie(login);
    expect(await db.session.count({ where: { userId } })).toBe(2);
    const token = await csrf(firstCookie);
    await agent().post('/v1/auth/logout-all')
      .set('Origin', ORIGIN).set('Cookie', firstCookie).set('X-CSRF-Token', token)
      .expect(200);
    expect(await db.session.count({ where: { userId } })).toBe(0);
    await agent().get('/v1/auth/me').set('Cookie', firstCookie).expect(401);
    await agent().get('/v1/auth/me').set('Cookie', secondCookie).expect(401);
  });

  it('returns generic invalid credentials for existing and missing accounts', async () => {
    const { email } = await register();
    const token = await csrf();
    for (const attempt of [
      { email, password: 'incorrect-password' },
      { email: 'missing-' + randomUUID() + '@example.com', password: PASSWORD },
    ]) {
      const res = await agent().post('/v1/auth/login')
        .set('Origin', ORIGIN).set('X-CSRF-Token', token)
        .send(attempt).expect(401);
      expect(res.body.message).toBe('Invalid email or password');
    }
  });
});
