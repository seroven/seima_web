import { Router, type RequestHandler } from 'express';
import { requireRole } from '../auth/auth.middleware';
import { validate } from '../../common/middleware/validate';
import type { DevicesController } from './devices.controller';
import { deviceTokenParamsSchema, deviceTokenSchema } from './devices.schemas';

export function devicesRoutes(controller: DevicesController, authenticate: RequestHandler): Router {
  const router = Router();
  const admin = [authenticate, requireRole('admin')] as const;
  router.post('/', ...admin, validate(deviceTokenSchema), controller.register);
  router.delete('/:token', ...admin, validate(deviceTokenParamsSchema, 'params'), controller.remove);
  return router;
}
