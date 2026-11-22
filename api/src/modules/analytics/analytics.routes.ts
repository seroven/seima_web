import { Router, type RequestHandler } from 'express';
import { analyticsLimiter } from '../../common/middleware/rate-limit';
import { validate } from '../../common/middleware/validate';
import { requireRole } from '../auth/auth.middleware';
import type { AnalyticsController } from './analytics.controller';
import { hitSchema, resumenQuerySchema } from './analytics.schemas';

export function analyticsRoutes(controller: AnalyticsController, authenticate: RequestHandler): Router {
  const router = Router();
  const admin = [authenticate, requireRole('admin')] as const;
  // POST /analytics/hit (público, con límite por IP): lo manda la web en cada visita
  router.post('/hit', analyticsLimiter(), validate(hitSchema), controller.hit);
  // GET /analytics/summary (app de Luis)
  router.get('/summary', ...admin, validate(resumenQuerySchema, 'query'), controller.resumen);
  return router;
}
