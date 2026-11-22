import type { RequestHandler } from 'express';
import type { DataSource } from 'typeorm';
import { env } from '../../config/env';
import { AnalyticsController } from './analytics.controller';
import { AnalyticsRepository } from './analytics.repository';
import { analyticsRoutes } from './analytics.routes';
import { AnalyticsService } from './analytics.service';

/** Depende de las cotizaciones solo para contarlas (se inyecta la función, no el repositorio entero). */
export function buildAnalyticsModule(dataSource: DataSource, authenticate: RequestHandler, contarCotizaciones: (desde: Date, hasta: Date) => Promise<number>) {
  const repository = new AnalyticsRepository(dataSource);
  const hostsPropios = env.corsOrigins.flatMap((o) => {
    try {
      return [new URL(o).hostname.toLowerCase()];
    } catch {
      return [];
    }
  });
  const service = new AnalyticsService(repository, contarCotizaciones, { secreto: env.JWT_SECRET, hostsPropios });
  const router = analyticsRoutes(new AnalyticsController(service), authenticate);
  return { repository, service, router };
}
