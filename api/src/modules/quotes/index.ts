import type { RequestHandler } from 'express';
import type { DataSource } from 'typeorm';
import type { CatalogRepository } from '../catalog/catalog.repository';
import type { AvisoCotizacion } from '../notifications/push';
import type { ProjectsRepository } from '../projects/projects.repository';
import { QuotesController } from './quotes.controller';
import { QuotesRepository } from './quotes.repository';
import { quotesRoutes } from './quotes.routes';
import { QuotesService } from './quotes.service';

/** Depende del repositorio de proyectos (enlazar "Cotizar algo así") y del catálogo (validar servicios y respuestas). */
export function buildQuotesModule(
  dataSource: DataSource,
  projects: ProjectsRepository,
  catalog: CatalogRepository,
  authenticate: RequestHandler,
  avisar?: (aviso: AvisoCotizacion) => Promise<void>,
) {
  const repository = new QuotesRepository(dataSource);
  const service = new QuotesService(repository, projects, catalog, avisar);
  const router = quotesRoutes(new QuotesController(service), authenticate);
  return { repository, service, router };
}
