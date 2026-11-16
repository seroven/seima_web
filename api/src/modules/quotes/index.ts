import type { DataSource } from 'typeorm';
import type { ProjectsRepository } from '../projects/projects.repository';
import { QuotesController } from './quotes.controller';
import { QuotesRepository } from './quotes.repository';
import { quotesRoutes } from './quotes.routes';
import { QuotesService } from './quotes.service';

/** Depende del repositorio de proyectos (para enlazar "Cotizar algo así") y lo recibe por parámetro. */
export function buildQuotesModule(dataSource: DataSource, projects: ProjectsRepository) {
  const repository = new QuotesRepository(dataSource);
  const service = new QuotesService(repository, projects);
  const router = quotesRoutes(new QuotesController(service));
  return { repository, service, router };
}
