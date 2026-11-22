import type { RequestHandler } from 'express';
import type { DataSource } from 'typeorm';
import { CategoriesPanelService } from './categories-panel.service';
import { CategoriesController } from './categories.controller';
import { CategoriesRepository } from './categories.repository';
import { categoriesRoutes } from './categories.routes';
import { CategoriesService } from './categories.service';

/** Arma el módulo (repositorio → servicio → controlador → rutas). Cada módulo expone una función así. */
export function buildCategoriesModule(dataSource: DataSource, authenticate: RequestHandler) {
  const repository = new CategoriesRepository(dataSource);
  const service = new CategoriesService(repository);
  const panel = new CategoriesPanelService(repository);
  const router = categoriesRoutes(new CategoriesController(service, panel), authenticate);
  return { repository, service, panel, router };
}
