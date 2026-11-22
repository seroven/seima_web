import { Router, type RequestHandler } from 'express';
import { validate } from '../../common/middleware/validate';
import { idParamsSchema, reorderSchema } from '../../common/schemas';
import { requireRole } from '../auth/auth.middleware';
import type { CatalogPanelController } from './catalog-panel.controller';
import { createOptionSchema, createQuestionSchema, createServiceSchema, updateOptionSchema, updateQuestionSchema, updateServiceSchema } from './catalog.schemas';

/** Gestión del catálogo del cotizador (servicios, preguntas y opciones). Todo con JWT de admin. Se monta en `/catalog`. */
export function catalogPanelRoutes(controller: CatalogPanelController, authenticate: RequestHandler): Router {
  const router = Router();
  router.use(authenticate, requireRole('admin'));
  const params = validate(idParamsSchema, 'params');

  // Las rutas fijas (`/orden`) van antes que las que llevan `:id`.
  router.get('/services', controller.listServices);
  router.post('/services', validate(createServiceSchema), controller.createService);
  router.put('/services/orden', validate(reorderSchema), controller.reorderServices);
  router.patch('/services/:id', params, validate(updateServiceSchema), controller.updateService);

  router.get('/questions', controller.listQuestions);
  router.post('/questions', validate(createQuestionSchema), controller.createQuestion);
  router.put('/questions/orden', validate(reorderSchema), controller.reorderQuestions);
  router.get('/questions/:id', params, controller.getQuestion);
  router.patch('/questions/:id', params, validate(updateQuestionSchema), controller.updateQuestion);
  router.post('/questions/:id/options', params, validate(createOptionSchema), controller.createOption);
  router.put('/questions/:id/options/orden', params, validate(reorderSchema), controller.reorderOptions);

  router.patch('/options/:id', params, validate(updateOptionSchema), controller.updateOption);
  return router;
}
