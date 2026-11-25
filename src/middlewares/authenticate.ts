import type { Request, RequestHandler } from 'express';
import { verifyToken } from '../modules/auth/token';
import { AppError } from '../utils/app-error';

// El "guardia de la puerta": revisa la pulsera (token) antes de dejar pasar.
// Espera la cabecera:  Authorization: Bearer <token>
export const authenticate: RequestHandler = (req, _res, next) => {
  const header = req.headers.authorization;

  if (!header?.startsWith('Bearer ')) {
    throw AppError.unauthorized('Falta el token de autenticación');
  }

  const userId = verifyToken(header.slice('Bearer '.length).trim());
  if (!userId) {
    throw AppError.unauthorized('Token inválido o vencido');
  }

  req.user = { id: userId };
  next();
};

/** Saca el id del usuario autenticado (o 401 si la ruta olvidó usar `authenticate`). */
export function getUserId(req: Request): string {
  if (!req.user) throw AppError.unauthorized();
  return req.user.id;
}
