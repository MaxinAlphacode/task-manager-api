import { z } from 'zod';

// Las "reglas del portero": qué datos aceptamos y cuáles no.

export const TASK_STATUS = ['PENDING', 'IN_PROGRESS', 'DONE'] as const;
export const TASK_PRIORITY = ['LOW', 'MEDIUM', 'HIGH'] as const;

export const createTaskSchema = z.object({
  title: z.string().trim().min(1, 'El título es obligatorio').max(120),
  description: z.string().trim().max(1000).optional(),
  status: z.enum(TASK_STATUS).optional(),
  priority: z.enum(TASK_PRIORITY).optional(),
  dueDate: z.iso.datetime({ offset: true }).optional(),
});

// Para actualizar, todos los campos son opcionales, pero debe venir al menos uno.
export const updateTaskSchema = createTaskSchema
  .extend({
    description: z.string().trim().max(1000).nullable().optional(),
    dueDate: z.iso.datetime({ offset: true }).nullable().optional(),
  })
  .partial()
  .refine((data) => Object.keys(data).length > 0, {
    message: 'Envía al menos un campo para actualizar',
  });

export const listTasksQuerySchema = z.object({
  status: z.enum(TASK_STATUS).optional(),
  priority: z.enum(TASK_PRIORITY).optional(),
  search: z.string().trim().min(1).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
  sortBy: z.enum(['createdAt', 'dueDate', 'priority', 'title']).default('createdAt'),
  order: z.enum(['asc', 'desc']).default('desc'),
});

export const taskIdParamSchema = z.object({
  id: z.uuid('El id debe ser un UUID válido'),
});

export type CreateTaskInput = z.infer<typeof createTaskSchema>;
export type UpdateTaskInput = z.infer<typeof updateTaskSchema>;
export type ListTasksQuery = z.infer<typeof listTasksQuerySchema>;
