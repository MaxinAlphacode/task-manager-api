import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { taskRouter } from './modules/tasks/task.routes';
import { errorHandler, notFoundHandler } from './middlewares/error-handler';

// Armamos la app (el "restaurante") sin encenderla todavía.
// Así los tests pueden usarla sin abrir un puerto real.
export function createApp() {
  const app = express();

  app.use(helmet()); // cabeceras de seguridad
  app.use(cors()); // permite que otros sitios web llamen a la API
  app.use(express.json({ limit: '100kb' })); // entiende cuerpos JSON

  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  app.use('/api/tasks', taskRouter);

  app.use(notFoundHandler);
  app.use(errorHandler); // siempre al final

  return app;
}
