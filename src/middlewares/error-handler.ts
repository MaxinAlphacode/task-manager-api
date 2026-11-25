import type { ErrorRequestHandler, RequestHandler } from 'express';
import { Prisma } from '../generated/prisma/client';
import { ZodError } from 'zod';
import { AppError } from '../utils/app-error';

// Si nadie respondió, la ruta no existe.
export const notFoundHandler: RequestHandler = (req, res) => {
  res.status(404).json({ error: { message: `Ruta ${req.method} ${req.originalUrl} no existe` } });
};

// El "botiquín": todos los errores de la app terminan aquí y se responden
// siempre con el mismo formato JSON.
export const errorHandler: ErrorRequestHandler = (err, req, res, _next) => {
  if (err instanceof ZodError) {
    res.status(400).json({
      error: {
        message: 'Datos inválidos',
        details: err.issues.map((i) => ({ field: i.path.join('.'), message: i.message })),
      },
    });
    return;
  }

  if (err instanceof AppError) {
    res.status(err.statusCode).json({ error: { message: err.message } });
    return;
  }

  // Dato repetido en un campo único (ej: dos registros con el mismo email al mismo tiempo)
  if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
    res.status(409).json({ error: { message: 'El recurso ya existe' } });
    return;
  }

  // JSON mal escrito en el body
  if (err instanceof SyntaxError && 'body' in err) {
    res.status(400).json({ error: { message: 'JSON mal formado' } });
    return;
  }

  // Error inesperado: lo registramos con todo el detalle (stack incluido) en el log,
  // pero al cliente solo le damos el "número de ticket" para que pueda reportarlo.
  req.log.error({ err }, 'error no controlado');
  res.status(500).json({ error: { message: 'Error interno del servidor', requestId: req.id } });
};
