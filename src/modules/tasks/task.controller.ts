import type { Request, Response } from 'express';
import { taskService } from './task.service';
import {
  createTaskSchema,
  listTasksQuerySchema,
  taskIdParamSchema,
  updateTaskSchema,
} from './task.schema';

// El "mesero": recibe el pedido (req), lo revisa con el portero (Zod),
// se lo pasa al cocinero (service) y entrega la respuesta (res).
// Si algo falla, Express 5 manda el error al errorHandler automáticamente.

export const taskController = {
  async list(req: Request, res: Response) {
    const query = listTasksQuerySchema.parse(req.query);
    res.json(await taskService.list(query));
  },

  async getById(req: Request, res: Response) {
    const { id } = taskIdParamSchema.parse(req.params);
    res.json({ data: await taskService.getById(id) });
  },

  async create(req: Request, res: Response) {
    const input = createTaskSchema.parse(req.body);
    const task = await taskService.create(input);
    res.status(201).location(`/api/tasks/${task.id}`).json({ data: task });
  },

  async update(req: Request, res: Response) {
    const { id } = taskIdParamSchema.parse(req.params);
    const input = updateTaskSchema.parse(req.body);
    res.json({ data: await taskService.update(id, input) });
  },

  async remove(req: Request, res: Response) {
    const { id } = taskIdParamSchema.parse(req.params);
    await taskService.remove(id);
    res.status(204).send();
  },
};
