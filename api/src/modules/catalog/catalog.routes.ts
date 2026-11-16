import { Router } from 'express';
import type { CatalogController } from './catalog.controller';

export function catalogRoutes(controller: CatalogController): Router {
  const router = Router();
  router.get('/', controller.quoteForm); // GET /quote-form (público): servicios y preguntas del cotizador
  return router;
}
