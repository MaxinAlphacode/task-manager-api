import request from 'supertest';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../src/app';
import { prisma } from '../src/lib/prisma';
import { registerUser, resetDb } from './helpers/auth';

const app = createApp();

// Cada test empieza con la base vacía y un usuario con su token.
let token: string;
let userId: string;
const auth = () => ({ Authorization: `Bearer ${token}` });

beforeEach(async () => {
  await resetDb();
  const session = await registerUser(app);
  token = session.token;
  userId = session.user.id;
});

afterAll(() => prisma.$disconnect());

describe('GET /api/health', () => {
  it('responde ok sin necesitar token', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
  });
});

describe('Tasks CRUD', () => {
  it('exige token (401)', async () => {
    const res = await request(app).get('/api/tasks');
    expect(res.status).toBe(401);
  });

  it('crea una tarea con valores por defecto', async () => {
    const res = await request(app).post('/api/tasks').set(auth()).send({ title: 'Estudiar Prisma' });

    expect(res.status).toBe(201);
    expect(res.body.data).toMatchObject({
      title: 'Estudiar Prisma',
      status: 'PENDING',
      priority: 'MEDIUM',
      userId,
    });
    expect(res.headers.location).toBe(`/api/tasks/${res.body.data.id}`);
  });

  it('rechaza una tarea sin título (400)', async () => {
    const res = await request(app).post('/api/tasks').set(auth()).send({ priority: 'HIGH' });

    expect(res.status).toBe(400);
    expect(res.body.error.details[0].field).toBe('title');
  });

  it('lista con filtros y paginación', async () => {
    await prisma.task.createMany({
      data: [
        { title: 'A', priority: 'HIGH', userId },
        { title: 'B', priority: 'LOW', userId },
        { title: 'C', priority: 'HIGH', userId },
      ],
    });

    const res = await request(app).get('/api/tasks?priority=HIGH&limit=1').set(auth());

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.meta).toMatchObject({ total: 2, totalPages: 2, page: 1, limit: 1 });
  });

  it('actualiza parcialmente una tarea', async () => {
    const task = await prisma.task.create({ data: { title: 'Original', userId } });

    const res = await request(app).patch(`/api/tasks/${task.id}`).set(auth()).send({ status: 'DONE' });

    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({ title: 'Original', status: 'DONE' });
  });

  it('elimina una tarea y luego da 404', async () => {
    const task = await prisma.task.create({ data: { title: 'Borrar', userId } });

    const del = await request(app).delete(`/api/tasks/${task.id}`).set(auth());
    expect(del.status).toBe(204);

    const get = await request(app).get(`/api/tasks/${task.id}`).set(auth());
    expect(get.status).toBe(404);
  });

  it('valida que el id sea UUID', async () => {
    const res = await request(app).get('/api/tasks/no-es-uuid').set(auth());
    expect(res.status).toBe(400);
  });
});

describe('Aislamiento entre usuarios', () => {
  it('un usuario no puede ver, editar ni borrar tareas de otro', async () => {
    const ajena = await prisma.task.create({ data: { title: 'Secreta', userId } });
    const intruso = await registerUser(app);
    const as = { Authorization: `Bearer ${intruso.token}` };

    const list = await request(app).get('/api/tasks').set(as);
    expect(list.body.meta.total).toBe(0);

    expect((await request(app).get(`/api/tasks/${ajena.id}`).set(as)).status).toBe(404);
    expect((await request(app).patch(`/api/tasks/${ajena.id}`).set(as).send({ title: 'x' })).status).toBe(404);
    expect((await request(app).delete(`/api/tasks/${ajena.id}`).set(as)).status).toBe(404);

    // La tarea sigue intacta
    const still = await prisma.task.findUniqueOrThrow({ where: { id: ajena.id } });
    expect(still.title).toBe('Secreta');
  });
});
