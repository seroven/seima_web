import type { DataSource } from 'typeorm';
import { CatalogController } from './catalog.controller';
import { CatalogRepository } from './catalog.repository';
import { catalogRoutes } from './catalog.routes';
import { CatalogService } from './catalog.service';

/** Catálogo del cotizador (servicios, preguntas, opciones). El módulo de cotizaciones usa su repositorio para validar. */
export function buildCatalogModule(dataSource: DataSource) {
  const repository = new CatalogRepository(dataSource);
  const service = new CatalogService(repository);
  const router = catalogRoutes(new CatalogController(service));
  return { repository, service, router };
}
