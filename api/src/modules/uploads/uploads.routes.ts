import { Router } from 'express';
import { uploadsLimiter } from '../../common/middleware/rate-limit';
import type { UploadsController } from './uploads.controller';

export function uploadsRoutes(controller: UploadsController): Router {
  const router = Router();
  // POST /uploads/quote-photos/signature (público, con límite por IP): firma para subir las fotos del cotizador
  router.post('/quote-photos/signature', uploadsLimiter(), controller.signQuotePhotos);
  return router;
}
