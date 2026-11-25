import request from 'supertest';
import jwt from 'jsonwebtoken';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../src/app';
import { prisma } from '../src/lib/prisma';
import { registerUser, resetDb } from './helpers/auth';

const app = createApp();
const credentials = { name: 'Cristian', email: 'Cristian@Test.com', password: 'contraseña-segura' };

beforeEach(resetDb);
afterAll(() => prisma.$disconnect());

describe('POST /api/auth/register', () => {
  it('crea el usuario, devuelve un token y nunca la contraseña', async () => {
    const res = await request(app).post('/api/auth/register').send(credentials);

    expect(res.status).toBe(201);
    expect(res.body.data.token).toEqual(expect.any(String));
    expect(res.body.data.user).toMatchObject({ name: 'Cristian', email: 'cristian@test.com' });
    expect(res.body.data.user).not.toHaveProperty('passwordHash');

    const stored = await prisma.user.findUniqueOrThrow({ where: { email: 'cristian@test.com' } });
    expect(stored.passwordHash).not.toBe(credentials.password); // guardada como hash
  });

  it('no permite registrar el mismo email dos veces (409)', async () => {
    await request(app).post('/api/auth/register').send(credentials);
    const res = await request(app)
      .post('/api/auth/register')
      .send({ ...credentials, email: 'cristian@test.com' });

    expect(res.status).toBe(409);
  });

  it('valida email y largo de contraseña (400)', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ name: 'C', email: 'no-es-email', password: '123' });

    expect(res.status).toBe(400);
    const fields = res.body.error.details.map((d: { field: string }) => d.field);
    expect(fields).toEqual(expect.arrayContaining(['name', 'email', 'password']));
  });
});

describe('POST /api/auth/login', () => {
  beforeEach(async () => {
    await request(app).post('/api/auth/register').send(credentials);
  });

  it('entra con credenciales correctas', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: credentials.email, password: credentials.password });

    expect(res.status).toBe(200);
    expect(res.body.data.token).toEqual(expect.any(String));
  });

  it('responde igual si falla la contraseña o el email (401)', async () => {
    const wrongPass = await request(app)
      .post('/api/auth/login')
      .send({ email: credentials.email, password: 'otra-cosa' });
    const wrongEmail = await request(app)
      .post('/api/auth/login')
      .send({ email: 'nadie@test.com', password: credentials.password });

    expect(wrongPass.status).toBe(401);
    expect(wrongEmail.status).toBe(401);
    expect(wrongPass.body).toEqual(wrongEmail.body);
  });
});

describe('GET /api/auth/me', () => {
  it('devuelve el usuario del token', async () => {
    const { token, user } = await registerUser(app);
    const res = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.data.id).toBe(user.id);
  });

  it('rechaza sin token, con token falso o vencido (401)', async () => {
    const { user } = await registerUser(app);
    const forged = jwt.sign({}, 'otro-secreto-que-no-es-el-nuestro-xxxxxxxx', { subject: user.id });
    const expired = jwt.sign({}, process.env.JWT_SECRET!, { subject: user.id, expiresIn: -10 });

    expect((await request(app).get('/api/auth/me')).status).toBe(401);
    for (const token of [forged, expired, 'basura']) {
      const res = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(401);
    }
  });
});
