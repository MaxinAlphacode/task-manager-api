import pino, { type LoggerOptions } from 'pino';
import { env } from '../config/env';

// El "diario de a bordo" de la API.
//
// En vez de console.log("algo pasó"), escribimos una línea JSON por evento:
//   {"level":30,"time":...,"reqId":"...","msg":"request completed","res":{"statusCode":201}}
// Las herramientas de monitoreo (Datadog, Grafana Loki, CloudWatch...) pueden
// buscar y filtrar esas líneas como si fueran una base de datos.

/** Configuración común (exportada para poder probarla en los tests). */
export const loggerOptions: LoggerOptions = {
  base: { service: 'task-manager-api' },

  // Nunca escribir secretos en los logs: se reemplazan por "[OCULTO]".
  redact: {
    paths: [
      'req.headers.authorization',
      'req.headers.cookie',
      '*.password',
      '*.passwordHash',
      '*.token',
    ],
    censor: '[OCULTO]',
  },
};

export const logger = pino({
  ...loggerOptions,
  level: env.LOG_LEVEL,

  // En desarrollo, líneas bonitas y con colores para humanos.
  // En producción, JSON puro (más rápido y fácil de procesar por máquinas).
  ...(env.NODE_ENV === 'development' && {
    transport: {
      target: 'pino-pretty',
      options: { colorize: true, translateTime: 'HH:MM:ss', ignore: 'pid,hostname,service' },
    },
  }),
});
