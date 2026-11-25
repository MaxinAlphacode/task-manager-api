import { env } from './config/env';
import { createApp } from './app';
import { prisma } from './lib/prisma';

// El "interruptor": enciende el restaurante y abre la puerta (el puerto).
const app = createApp();

const server = app.listen(env.PORT, () => {
  console.log(`🚀 API corriendo en http://localhost:${env.PORT} (${env.NODE_ENV})`);
});

// Apagado ordenado: cerramos la puerta y la conexión a la base de datos.
const shutdown = async (signal: string) => {
  console.log(`\n${signal} recibido, apagando...`);
  server.close(async () => {
    await prisma.$disconnect();
    process.exit(0);
  });
};

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
