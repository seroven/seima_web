import { Router } from 'express';
import type { CategoriesController } from './categories.controller';

export function categoriesRoutes(controller: CategoriesController): Router {
  const router = Router();
  router.get('/', controller.list); // GET /categories (público)
  return router;
}
