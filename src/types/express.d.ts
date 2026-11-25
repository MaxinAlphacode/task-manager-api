// Le enseñamos a TypeScript que, después del middleware de autenticación,
// cada petición puede traer pegado quién es el usuario.
declare global {
  namespace Express {
    interface Request {
      user?: { id: string };
    }
  }
}

export {};
