import { Router } from 'express';
import { authenticate } from '../../middlewares/authenticate';
import { authController } from './auth.controller';

export const authRouter = Router();

authRouter.post('/register', authController.register); // público
authRouter.post('/login', authController.login); // público
authRouter.get('/me', authenticate, authController.me); // necesita token
