import { Router } from 'express';
import { quotesLimiter } from '../../common/middleware/rate-limit';
import { validate } from '../../common/middleware/validate';
import type { QuotesController } from './quotes.controller';
import { createQuoteSchema } from './quotes.schemas';

export function quotesRoutes(controller: QuotesController): Router {
  const router = Router();
  // POST /quotes (público, con límite por IP): lo usa el cotizador de la web
  router.post('/', quotesLimiter(), validate(createQuoteSchema, 'body'), controller.create);
  return router;
}
