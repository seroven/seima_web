import type { DataSource } from 'typeorm';
import { ProjectsController } from './projects.controller';
import { ProjectsRepository } from './projects.repository';
import { projectsRoutes } from './projects.routes';
import { ProjectsService } from './projects.service';

export function buildProjectsModule(dataSource: DataSource) {
  const repository = new ProjectsRepository(dataSource);
  const service = new ProjectsService(repository);
  const router = projectsRoutes(new ProjectsController(service));
  return { repository, service, router };
}
