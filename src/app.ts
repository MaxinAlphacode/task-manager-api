import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import swaggerUi from 'swagger-ui-express';
import { openApiDocument } from './docs/openapi';
import { prisma } from './lib/prisma';
import { authRouter } from './modules/auth/auth.routes';
import { taskRouter } from './modules/tasks/task.routes';
import { errorHandler, notFoundHandler } from './middlewares/error-handler';

// Armamos la app (el "restaurante") sin encenderla todavía.
// Así los tests pueden usarla sin abrir un puerto real.
export function createApp() {
  const app = express();

  app.use(helmet()); // cabeceras de seguridad
  app.use(cors()); // permite que otros sitios web llamen a la API
  app.use(express.json({ limit: '100kb' })); // entiende cuerpos JSON

  // "¿Estás vivo?" Docker y los balanceadores lo preguntan cada pocos segundos.
  // Si la base de datos no responde, decimos 503 para que no nos manden tráfico.
  app.get('/api/health', async (_req, res) => {
    try {
      await prisma.$queryRaw`SELECT 1`;
      res.json({ status: 'ok', database: 'up', timestamp: new Date().toISOString() });
    } catch {
      res.status(503).json({ status: 'error', database: 'down', timestamp: new Date().toISOString() });
    }
  });

  // Documentación: el JSON "crudo" para máquinas y la página bonita para personas.
  app.get('/api/docs.json', (_req, res) => {
    res.json(openApiDocument);
  });
  app.use(
    '/api/docs',
    swaggerUi.serve,
    swaggerUi.setup(openApiDocument, {
      customSiteTitle: 'Task Manager API · Docs',
      swaggerOptions: { persistAuthorization: true }, // recuerda el token al recargar
    }),
  );

  app.use('/api/auth', authRouter);
  app.use('/api/tasks', taskRouter);

  app.use(notFoundHandler);
  app.use(errorHandler); // siempre al final

  return app;
}
