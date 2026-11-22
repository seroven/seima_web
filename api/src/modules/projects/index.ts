import type { DataSource } from 'typeorm';
import type { RequestHandler } from 'express';
import { CategoriesRepository } from '../categories/categories.repository';
import { UploadsService } from '../uploads/uploads.service';
import { sinAviso, type AvisoReconstruccion } from '../web-rebuild/web-rebuild.service';
import { PanelProjectsService } from './projects-panel.service';
import { ProjectsController } from './projects.controller';
import { ProjectsRepository } from './projects.repository';
import { projectsRoutes } from './projects.routes';
import { ProjectsService } from './projects.service';

export function buildProjectsModule(dataSource: DataSource, authenticate: RequestHandler, rebuild: AvisoReconstruccion = sinAviso) {
  const repository = new ProjectsRepository(dataSource);
  const service = new ProjectsService(repository);
  const panel = new PanelProjectsService(repository, new CategoriesRepository(dataSource), new UploadsService(), rebuild);
  const router = projectsRoutes(new ProjectsController(service, panel), authenticate);
  return { repository, service, panel, router };
}
