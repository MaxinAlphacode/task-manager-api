import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import swaggerUi from 'swagger-ui-express';
import { env } from './config/env';
import { openApiDocument } from './docs/openapi';
import { prisma } from './lib/prisma';
import { authRouter } from './modules/auth/auth.routes';
import { taskRouter } from './modules/tasks/task.routes';
import { errorHandler, notFoundHandler } from './middlewares/error-handler';
import { createRateLimiters, type RateLimitOptions } from './middlewares/rate-limit';
import { requestLogger } from './middlewares/request-logger';

export interface AppOptions {
  /** Permite a los tests usar límites pequeños sin tocar las variables de entorno. */
  rateLimit?: Partial<RateLimitOptions>;
}

// Armamos la app (el "restaurante") sin encenderla todavía.
// Así los tests pueden usarla sin abrir un puerto real.
export function createApp(options: AppOptions = {}) {
  const app = express();

  // Cuántos proxies hay delante: así req.ip es la IP real del cliente y no la del proxy.
  app.set('trust proxy', env.TRUST_PROXY);

  app.use(requestLogger); // primero: así TODO queda registrado, incluso los errores
  app.use(helmet()); // cabeceras de seguridad
  app.use(cors({ exposedHeaders: ['X-Request-Id', 'RateLimit', 'RateLimit-Policy', 'Retry-After'] }));
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

  // Rate limiting: un límite general para la API y uno estricto para login/registro.
  // (health y docs quedan fuera: Docker y los curiosos no deberían gastar el cupo).
  const limiters = createRateLimiters({
    windowMinutes: env.RATE_LIMIT_WINDOW_MINUTES,
    apiMax: env.RATE_LIMIT_MAX,
    authMax: env.RATE_LIMIT_AUTH_MAX,
    ...options.rateLimit,
  });
  app.use(['/api/auth', '/api/tasks'], limiters.api);
  app.post(['/api/auth/login', '/api/auth/register'], limiters.auth);

  app.use('/api/auth', authRouter);
  app.use('/api/tasks', taskRouter);

  app.use(notFoundHandler);
  app.use(errorHandler); // siempre al final

  return app;
}
