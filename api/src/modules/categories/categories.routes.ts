import { Router, type RequestHandler } from 'express';
import { validate } from '../../common/middleware/validate';
import { idParamsSchema, reorderSchema } from '../../common/schemas';
import { requireRole } from '../auth/auth.middleware';
import type { CategoriesController } from './categories.controller';
import { createCategorySchema, updateCategorySchema } from './categories.schemas';

export function categoriesRoutes(controller: CategoriesController, authenticate: RequestHandler): Router {
  const router = Router();
  const admin = [authenticate, requireRole('admin')] as const;

  router.get('/', controller.list); // GET /categories (público)

  // ---- App de Luis (JWT). Las rutas fijas van antes que `/:id`. ----
  router.get('/gestion', ...admin, controller.gestion);
  router.put('/orden', ...admin, validate(reorderSchema), controller.reorder);
  router.post('/', ...admin, validate(createCategorySchema), controller.create);
  router.patch('/:id', ...admin, validate(idParamsSchema, 'params'), validate(updateCategorySchema), controller.update);
  return router;
}
