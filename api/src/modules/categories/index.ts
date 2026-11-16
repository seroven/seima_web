import type { DataSource } from 'typeorm';
import { CategoriesController } from './categories.controller';
import { CategoriesRepository } from './categories.repository';
import { categoriesRoutes } from './categories.routes';
import { CategoriesService } from './categories.service';

/** Arma el módulo (repositorio → servicio → controlador → rutas). Cada módulo expone una función así. */
export function buildCategoriesModule(dataSource: DataSource) {
  const repository = new CategoriesRepository(dataSource);
  const service = new CategoriesService(repository);
  const router = categoriesRoutes(new CategoriesController(service));
  return { repository, service, router };
}
