import { env } from './config/env';
import { createApp } from './app';
import { logger } from './lib/logger';
import { prisma } from './lib/prisma';

// El "interruptor": enciende el restaurante y abre la puerta (el puerto).
const app = createApp();

const server = app.listen(env.PORT, () => {
  logger.info({ port: env.PORT, env: env.NODE_ENV }, `🚀 API corriendo en http://localhost:${env.PORT}`);
});

// Apagado ordenado: cerramos la puerta y la conexión a la base de datos.
const shutdown = (signal: string) => {
  logger.info({ signal }, 'apagando...');
  server.close(async () => {
    await prisma.$disconnect();
    process.exit(0);
  });
};

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

// Si algo explota fuera de una petición, lo dejamos registrado antes de caer.
// Docker (restart: unless-stopped) se encarga de volver a levantar la API.
process.on('unhandledRejection', (reason) => {
  logger.fatal({ err: reason }, 'promesa rechazada sin manejar');
  process.exit(1);
});
process.on('uncaughtException', (err) => {
  logger.fatal({ err }, 'excepción no capturada');
  process.exit(1);
});
