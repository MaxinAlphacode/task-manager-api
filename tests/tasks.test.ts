import request from 'supertest';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../src/app';
import { prisma } from '../src/lib/prisma';

const app = createApp();

beforeEach(async () => {
  await prisma.task.deleteMany();
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe('GET /api/health', () => {
  it('responde ok', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
  });
});

describe('Tasks CRUD', () => {
  it('crea una tarea con valores por defecto', async () => {
    const res = await request(app).post('/api/tasks').send({ title: 'Estudiar Prisma' });

    expect(res.status).toBe(201);
    expect(res.body.data).toMatchObject({
      title: 'Estudiar Prisma',
      status: 'PENDING',
      priority: 'MEDIUM',
    });
    expect(res.headers.location).toBe(`/api/tasks/${res.body.data.id}`);
  });

  it('rechaza una tarea sin título (400)', async () => {
    const res = await request(app).post('/api/tasks').send({ priority: 'HIGH' });

    expect(res.status).toBe(400);
    expect(res.body.error.details[0].field).toBe('title');
  });

  it('lista con filtros y paginación', async () => {
    await prisma.task.createMany({
      data: [
        { title: 'A', priority: 'HIGH' },
        { title: 'B', priority: 'LOW' },
        { title: 'C', priority: 'HIGH' },
      ],
    });

    const res = await request(app).get('/api/tasks?priority=HIGH&limit=1');

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.meta).toMatchObject({ total: 2, totalPages: 2, page: 1, limit: 1 });
  });

  it('actualiza parcialmente una tarea', async () => {
    const task = await prisma.task.create({ data: { title: 'Original' } });

    const res = await request(app).patch(`/api/tasks/${task.id}`).send({ status: 'DONE' });

    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({ title: 'Original', status: 'DONE' });
  });

  it('elimina una tarea y luego da 404', async () => {
    const task = await prisma.task.create({ data: { title: 'Borrar' } });

    const del = await request(app).delete(`/api/tasks/${task.id}`);
    expect(del.status).toBe(204);

    const get = await request(app).get(`/api/tasks/${task.id}`);
    expect(get.status).toBe(404);
  });

  it('valida que el id sea UUID', async () => {
    const res = await request(app).get('/api/tasks/no-es-uuid');
    expect(res.status).toBe(400);
  });
});
