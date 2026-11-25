import jwt from 'jsonwebtoken';
import { env } from '../../config/env';

// El token es como una pulsera de un parque de diversiones:
// dice quién eres (sub = id del usuario), cuándo vence (exp)
// y lleva un sello (la firma) que solo nuestro servidor sabe hacer.

const ALGORITHM = 'HS256';

export function signToken(userId: string): string {
  return jwt.sign({}, env.JWT_SECRET, {
    subject: userId,
    expiresIn: env.JWT_EXPIRES_IN as jwt.SignOptions['expiresIn'],
    algorithm: ALGORITHM,
  });
}

/** Devuelve el id del usuario si el token es válido; si no, null. */
export function verifyToken(token: string): string | null {
  try {
    // Fijamos el algoritmo para que nadie pueda engañarnos con uno distinto (ej: "none").
    const payload = jwt.verify(token, env.JWT_SECRET, { algorithms: [ALGORITHM] });
    return typeof payload === 'object' && typeof payload.sub === 'string' ? payload.sub : null;
  } catch {
    return null; // firma falsa, token vencido o mal formado
  }
}
