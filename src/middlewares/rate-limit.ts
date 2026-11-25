import type { RequestHandler } from 'express';
import { rateLimit } from 'express-rate-limit';

// Rate limiting = el "portero de discoteca con contador".
// Cuenta cuántas veces entra cada IP en una ventana de tiempo. Si se pasa del límite,
// responde 429 (Too Many Requests) hasta que la ventana se reinicie.
//
// Protege contra:
//  - Fuerza bruta: probar miles de contraseñas en /login.
//  - Abuso o bugs de un cliente que llama a la API en bucle y la satura.

export interface RateLimitOptions {
  windowMinutes: number;
  apiMax: number; // peticiones por IP a toda la API
  authMax: number; // intentos FALLIDOS por IP en login/registro
}

function limiter(windowMinutes: number, max: number, extra: Partial<Parameters<typeof rateLimit>[0]> = {}) {
  return rateLimit({
    windowMs: windowMinutes * 60_000,
    limit: max,
    // Cabeceras estándar (RateLimit y RateLimit-Policy) para que el cliente
    // sepa cuántas peticiones le quedan, y Retry-After cuando se pasa.
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    handler: (req, res, _next, options) => {
      const resetTime = req.rateLimit?.resetTime;
      const retryAfterSeconds = resetTime
        ? Math.max(1, Math.ceil((resetTime.getTime() - Date.now()) / 1000))
        : Math.ceil(options.windowMs / 1000);

      req.log?.warn({ ip: req.ip, limit: options.limit }, 'rate limit superado');
      res.status(options.statusCode).json({
        error: { message: 'Demasiadas solicitudes, intenta de nuevo más tarde', retryAfterSeconds },
      });
    },
    ...extra,
  });
}

export function createRateLimiters(opts: RateLimitOptions): { api: RequestHandler; auth: RequestHandler } {
  return {
    api: limiter(opts.windowMinutes, opts.apiMax),

    // Más estricto, y solo cuenta los FALLOS: un usuario legítimo que entra bien
    // no gasta intentos, pero alguien probando contraseñas se bloquea rápido.
    auth: limiter(opts.windowMinutes, opts.authMax, { skipSuccessfulRequests: true }),
  };
}
