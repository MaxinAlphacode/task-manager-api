import request from 'supertest';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../src/app';
import { prisma } from '../src/lib/prisma';
import { registerUser, resetDb } from './helpers/auth';

// Cada test crea su PROPIA app con límites pequeños: así el contador empieza
// en cero y no hace falta hacer cientos de peticiones.
const small = (overrides: { apiMax?: number; authMax?: number }) =>
  createApp({ rateLimit: { windowMinutes: 15, apiMax: 1000, authMax: 1000, ...overrides } });

beforeEach(resetDb);
afterAll(() => prisma.$disconnect());

describe('Rate limiting de login (fuerza bruta)', () => {
  it('bloquea con 429 tras demasiados intentos fallidos, incluso con la contraseña correcta', async () => {
    const app = small({ authMax: 3 });
    const email = 'victima@test.com';
    await request(app).post('/api/auth/register').send({ name: 'Víctima', email, password: 'contraseña-segura' });

    for (let i = 0; i < 3; i++) {
      const res = await request(app).post('/api/auth/login').send({ email, password: `intento-${i}` });
      expect(res.status).toBe(401);
    }

    const blocked = await request(app).post('/api/auth/login').send({ email, password: 'otro-intento' });
    expect(blocked.status).toBe(429);
    expect(Number(blocked.headers['retry-after'])).toBeGreaterThan(0);
    expect(blocked.body.error.retryAfterSeconds).toBeGreaterThan(0);

    // El atacante podría adivinar justo ahora: igual queda bloqueado hasta que pase la ventana.
    const correct = await request(app).post('/api/auth/login').send({ email, password: 'contraseña-segura' });
    expect(correct.status).toBe(429);
  });

  it('los logins exitosos no gastan intentos', async () => {
    const app = small({ authMax: 2 });
    const email = 'legitimo@test.com';
    await request(app).post('/api/auth/register').send({ name: 'Legítimo', email, password: 'contraseña-segura' });

    for (let i = 0; i < 5; i++) {
      const res = await request(app).post('/api/auth/login').send({ email, password: 'contraseña-segura' });
      expect(res.status).toBe(200);
    }
  });
});

describe('Rate limiting general de la API', () => {
  it('responde 429 al superar el límite e informa el cupo en cabeceras', async () => {
    const app = small({ apiMax: 3 });
    const { token } = await registerUser(app); // 1 petición

    const ok = await request(app).get('/api/tasks').set('Authorization', `Bearer ${token}`); // 2
    expect(ok.status).toBe(200);
    expect(ok.headers['ratelimit-policy']).toBeDefined();
    // Formato estándar draft-8: "<política>"; r=<restantes>; t=<segundos para reiniciar>
    expect(ok.headers['ratelimit']).toMatch(/; r=1; t=\d+/);

    await request(app).get('/api/tasks').set('Authorization', `Bearer ${token}`); // 3
    const blocked = await request(app).get('/api/tasks').set('Authorization', `Bearer ${token}`); // 4
    expect(blocked.status).toBe(429);
  });

  it('health y docs no tienen límite (Docker los consulta seguido)', async () => {
    const app = small({ apiMax: 1 });
    for (let i = 0; i < 5; i++) {
      expect((await request(app).get('/api/health')).status).toBe(200);
      expect((await request(app).get('/api/docs.json')).status).toBe(200);
    }
  });
});
