import { Router } from 'express';
import { authenticate } from '../../middlewares/authenticate';
import { taskController } from './task.controller';

// El "menú": qué se puede pedir y a quién se le pide.
export const taskRouter = Router();

// Todas las rutas de tareas pasan primero por el guardia.
taskRouter.use(authenticate);

taskRouter.get('/', taskController.list);
taskRouter.get('/:id', taskController.getById);
taskRouter.post('/', taskController.create);
taskRouter.patch('/:id', taskController.update);
taskRouter.delete('/:id', taskController.remove);
