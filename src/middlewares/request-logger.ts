import { randomUUID } from 'node:crypto';
import { pinoHttp } from 'pino-http';
import { logger } from '../lib/logger';

// Acepta un ID que venga de afuera (un proxy o el frontend) solo si es "limpio",
// para que nadie pueda inyectar texto raro en nuestros logs.
const SAFE_ID = /^[\w-]{1,64}$/;

// Escribe UNA línea por cada petición: método, URL, código de respuesta y cuánto tardó.
// Cada petición recibe un "número de ticket" (request ID) que también se devuelve
// en la cabecera X-Request-Id. Si un usuario reporta un error, con ese ID encuentras
// exactamente qué pasó en los logs.
export const requestLogger = pinoHttp({
  logger,

  genReqId: (req, res) => {
    const incoming = req.headers['x-request-id'];
    const id = typeof incoming === 'string' && SAFE_ID.test(incoming) ? incoming : randomUUID();
    res.setHeader('X-Request-Id', id);
    return id;
  },

  // 5xx = error (algo se rompió), 4xx = warn (el cliente se equivocó), resto = info.
  customLogLevel: (_req, res, err) => {
    if (err || res.statusCode >= 500) return 'error';
    if (res.statusCode >= 400) return 'warn';
    return 'info';
  },

  // Guardamos solo lo útil de la petición: nada de cabeceras ni cuerpos (podrían llevar secretos).
  serializers: {
    req: (req) => ({ id: req.id, method: req.method, url: req.url }),
    res: (res) => ({ statusCode: res.statusCode }),
  },

  // Docker pregunta por /api/health cada 15 s: no queremos llenar el diario con eso.
  autoLogging: { ignore: (req) => req.url === '/api/health' },
});
