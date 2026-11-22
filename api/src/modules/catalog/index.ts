import type { RequestHandler } from 'express';
import type { DataSource } from 'typeorm';
import { CatalogPanelController } from './catalog-panel.controller';
import { catalogPanelRoutes } from './catalog-panel.routes';
import { CatalogPanelService } from './catalog-panel.service';
import { CatalogController } from './catalog.controller';
import { CatalogRepository } from './catalog.repository';
import { catalogRoutes } from './catalog.routes';
import { CatalogService } from './catalog.service';

/**
 * Catálogo del cotizador (servicios, preguntas, opciones). El módulo de cotizaciones usa su repositorio para validar.
 * `router` es el público (`/quote-form`); `panelRouter` es la gestión desde la app (`/catalog`, con JWT).
 */
export function buildCatalogModule(dataSource: DataSource, authenticate: RequestHandler) {
  const repository = new CatalogRepository(dataSource);
  const service = new CatalogService(repository);
  const panel = new CatalogPanelService(repository);
  const router = catalogRoutes(new CatalogController(service));
  const panelRouter = catalogPanelRoutes(new CatalogPanelController(panel), authenticate);
  return { repository, service, panel, router, panelRouter };
}
