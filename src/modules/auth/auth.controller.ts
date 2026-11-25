import type { Request, Response } from 'express';
import { getUserId } from '../../middlewares/authenticate';
import { authService } from './auth.service';
import { loginSchema, registerSchema } from './auth.schema';

export const authController = {
  async register(req: Request, res: Response) {
    const input = registerSchema.parse(req.body);
    res.status(201).json({ data: await authService.register(input) });
  },

  async login(req: Request, res: Response) {
    const input = loginSchema.parse(req.body);
    res.json({ data: await authService.login(input) });
  },

  async me(req: Request, res: Response) {
    res.json({ data: await authService.me(getUserId(req)) });
  },
};
