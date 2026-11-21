import { Router, type RequestHandler } from 'express';
import { loginLimiter } from '../../common/middleware/rate-limit';
import { validate } from '../../common/middleware/validate';
import type { AuthController } from './auth.controller';
import { loginSchema, passwordSchema, refreshSchema } from './auth.schemas';

export function authRoutes(controller: AuthController, authenticate: RequestHandler): Router {
  const router = Router();
  router.post('/login', loginLimiter(), validate(loginSchema), controller.login);
  router.post('/refresh', validate(refreshSchema), controller.refresh);
  router.post('/logout', validate(refreshSchema), controller.logout);
  router.patch('/password', authenticate, validate(passwordSchema), controller.changePassword);
  router.get('/me', authenticate, controller.me);
  return router;
}
