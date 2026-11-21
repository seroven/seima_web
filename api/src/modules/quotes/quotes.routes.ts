import { Router, type RequestHandler } from 'express';
import { requireRole } from '../auth/auth.middleware';
import { quotesLimiter } from '../../common/middleware/rate-limit';
import { validate } from '../../common/middleware/validate';
import type { QuotesController } from './quotes.controller';
import { createQuoteSchema, listQuotesQuerySchema, quoteEstadoSchema, quoteIdParamsSchema } from './quotes.schemas';

export function quotesRoutes(controller: QuotesController, authenticate: RequestHandler): Router {
  const router = Router();
  const admin = [authenticate, requireRole('admin')] as const;
  // POST /quotes (público, con límite por IP): lo usa el cotizador de la web
  router.post('/', quotesLimiter(), validate(createQuoteSchema), controller.create);
  router.get('/', ...admin, validate(listQuotesQuerySchema, 'query'), controller.list);
  router.get('/:id', ...admin, validate(quoteIdParamsSchema, 'params'), controller.get);
  router.patch('/:id/estado', ...admin, validate(quoteIdParamsSchema, 'params'), validate(quoteEstadoSchema), controller.setEstado);
  return router;
}
