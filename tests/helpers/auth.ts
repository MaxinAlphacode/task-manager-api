import request from 'supertest';
import type { Express } from 'express';
import { prisma } from '../../src/lib/prisma';

let counter = 0;

/** Registra un usuario nuevo y devuelve su token listo para usar. */
export async function registerUser(app: Express, overrides: { email?: string } = {}) {
  counter += 1;
  const res = await request(app)
    .post('/api/auth/register')
    .send({
      name: `Usuario ${counter}`,
      email: overrides.email ?? `usuario${counter}@test.com`,
      password: 'contraseña-segura',
    });

  return { token: res.body.data.token as string, user: res.body.data.user as { id: string } };
}

/** Deja la base de pruebas vacía. */
export async function resetDb() {
  await prisma.task.deleteMany();
  await prisma.user.deleteMany();
}
