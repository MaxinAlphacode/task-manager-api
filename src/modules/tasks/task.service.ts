import type { Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma';
import { AppError } from '../../utils/app-error';
import type { CreateTaskInput, ListTasksQuery, UpdateTaskInput } from './task.schema';

// El "cocinero": aquí vive la lógica de negocio.
// No sabe nada de HTTP (req/res), solo recibe datos y devuelve resultados.

const toDate = (value: string | null | undefined) =>
  value === undefined ? undefined : value === null ? null : new Date(value);

export const taskService = {
  async list(query: ListTasksQuery) {
    const { status, priority, search, page, limit, sortBy, order } = query;

    const where: Prisma.TaskWhereInput = {
      ...(status && { status }),
      ...(priority && { priority }),
      ...(search && {
        OR: [{ title: { contains: search } }, { description: { contains: search } }],
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

  async getById(id: string) {
    const task = await prisma.task.findUnique({ where: { id } });
    if (!task) throw AppError.notFound('Tarea no encontrada');
    return task;
  },

  async create(input: CreateTaskInput) {
    return prisma.task.create({
      data: { ...input, dueDate: toDate(input.dueDate) },
    });
  },

  async update(id: string, input: UpdateTaskInput) {
    await this.getById(id); // lanza 404 si no existe
    return prisma.task.update({
      where: { id },
      data: { ...input, dueDate: toDate(input.dueDate) },
    });
  },

  async remove(id: string) {
    await this.getById(id);
    await prisma.task.delete({ where: { id } });
  },
};
