import type { Prisma } from '../../generated/prisma/client';
import { prisma } from '../../lib/prisma';
import { AppError } from '../../utils/app-error';
import type { CreateTaskInput, ListTasksQuery, UpdateTaskInput } from './task.schema';

// El "cocinero": aquí vive la lógica de negocio.
// No sabe nada de HTTP (req/res), solo recibe datos y devuelve resultados.
// Cada función recibe el userId: un usuario SOLO puede tocar sus propias tareas.

const toDate = (value: string | null | undefined) =>
  value === undefined ? undefined : value === null ? null : new Date(value);

export const taskService = {
  async list(userId: string, query: ListTasksQuery) {
    const { status, priority, search, page, limit, sortBy, order } = query;

    const where: Prisma.TaskWhereInput = {
      userId,
      ...(status && { status }),
      ...(priority && { priority }),
      ...(search && {
        // insensitive: "PRISMA", "prisma" y "Prisma" encuentran lo mismo
        OR: [
          { title: { contains: search, mode: 'insensitive' } },
          { description: { contains: search, mode: 'insensitive' } },
        ],
      }),
    };

    // Pedimos la página y el total al mismo tiempo (en una transacción).
    const [items, total] = await prisma.$transaction([
      prisma.task.findMany({
        where,
        orderBy: { [sortBy]: order },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.task.count({ where }),
    ]);

    return {
      data: items,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  },

  async getById(userId: string, id: string) {
    // Buscamos por id Y dueño. Si la tarea es de otro, respondemos 404 (no 403)
    // para no revelar siquiera que esa tarea existe.
    const task = await prisma.task.findFirst({ where: { id, userId } });
    if (!task) throw AppError.notFound('Tarea no encontrada');
    return task;
  },

  async create(userId: string, input: CreateTaskInput) {
    return prisma.task.create({
      data: { ...input, dueDate: toDate(input.dueDate), userId },
    });
  },

  async update(userId: string, id: string, input: UpdateTaskInput) {
    await this.getById(userId, id); // 404 si no existe o no es suya
    return prisma.task.update({
      where: { id },
      data: { ...input, dueDate: toDate(input.dueDate) },
    });
  },

  async remove(userId: string, id: string) {
    await this.getById(userId, id);
    await prisma.task.delete({ where: { id } });
  },
};
