import { Router } from 'express';
import { validate } from '../../common/middleware/validate';
import type { ProjectsController } from './projects.controller';
import { listProjectsQuerySchema, projectSlugParamsSchema } from './projects.schemas';

export function projectsRoutes(controller: ProjectsController): Router {
  const router = Router();
  router.get('/', validate(listProjectsQuerySchema, 'query'), controller.list); // GET /projects?categoria=  (público)
  router.get('/:slug', validate(projectSlugParamsSchema, 'params'), controller.getBySlug); // GET /projects/:slug  (público)
  return router;
}
