import { Router, type RequestHandler } from 'express';
import { requireRole } from '../auth/auth.middleware';
import { validate } from '../../common/middleware/validate';
import type { ProjectsController } from './projects.controller';
import {
  confirmMediaSchema,
  createMediaSchema,
  createProjectSchema,
  estadoProyectoSchema,
  gestionQuerySchema,
  idParamsSchema,
  listProjectsQuerySchema,
  medioParamsSchema,
  parSchema,
  projectSlugParamsSchema,
  reorderMediaSchema,
  updateProjectSchema,
} from './projects.schemas';

export function projectsRoutes(controller: ProjectsController, authenticate: RequestHandler): Router {
  const router = Router();
  const admin = [authenticate, requireRole('admin')] as const;

  router.get('/', validate(listProjectsQuerySchema, 'query'), controller.list);
  router.get('/gestion', ...admin, validate(gestionQuerySchema, 'query'), controller.gestion);
  router.post('/', ...admin, validate(createProjectSchema), controller.create);
  router.get('/gestion/:id', ...admin, validate(idParamsSchema, 'params'), controller.getGestion);
  router.patch('/:id/estado', ...admin, validate(idParamsSchema, 'params'), validate(estadoProyectoSchema), controller.setEstado);
  router.put('/:id/comparador', ...admin, validate(idParamsSchema, 'params'), validate(parSchema), controller.setComparador);
  router.put('/:id/portada', ...admin, validate(idParamsSchema, 'params'), validate(parSchema), controller.setPortada);
  router.post('/:id/medios', ...admin, validate(idParamsSchema, 'params'), validate(createMediaSchema), controller.crearMedio);
  router.post('/:id/medios/:medioId/confirmar', ...admin, validate(medioParamsSchema, 'params'), validate(confirmMediaSchema), controller.confirmarMedio);
  router.patch('/:id/medios/orden', ...admin, validate(idParamsSchema, 'params'), validate(reorderMediaSchema), controller.reordenar);
  router.delete('/:id/medios/:medioId', ...admin, validate(medioParamsSchema, 'params'), controller.borrarMedio);
  router.patch('/:id', ...admin, validate(idParamsSchema, 'params'), validate(updateProjectSchema), controller.update);
  router.delete('/:id', ...admin, validate(idParamsSchema, 'params'), controller.remove);
  router.get('/:slug', validate(projectSlugParamsSchema, 'params'), controller.getBySlug);
  return router;
}
