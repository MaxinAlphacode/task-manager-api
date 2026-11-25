import type { RateLimitInfo } from 'express-rate-limit';

// Le enseñamos a TypeScript qué cosas extra pueden venir pegadas a cada petición.
declare global {
  namespace Express {
    interface Request {
      /** Quién es el usuario (lo pone el middleware `authenticate`). */
      user?: { id: string };
      /** Cuántas peticiones le quedan a esta IP (lo pone `express-rate-limit`). */
      rateLimit?: RateLimitInfo;
    }
  }
}

export {};
