// Ensamblado de Express. No abre puertos ni conecta la base (eso lo hace server.ts), así se puede probar con supertest.
import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import { pinoHttp } from 'pino-http';
import type { DataSource } from 'typeorm';
import { logger } from './common/logger';
import { errorHandler, notFoundHandler } from './common/middleware/error-handler';
import { env } from './config/env';
import { buildAuthModule } from './modules/auth';
import { buildCatalogModule } from './modules/catalog';
import { buildCategoriesModule } from './modules/categories';
import { buildDevicesModule } from './modules/devices';
import { healthRoutes } from './modules/health/health.routes';
import { enviarAvisoCotizacion } from './modules/notifications/push';
import { buildProjectsModule } from './modules/projects';
import { buildQuotesModule } from './modules/quotes';
import { buildUploadsModule } from './modules/uploads';

export function createApp(dataSource: DataSource) {
  const app = express();
  app.disable('x-powered-by');
  if (env.TRUST_PROXY) app.set('trust proxy', 1); // detrás del proxy de Render

  app.use(helmet());
  app.use(
    cors({
      // Solo los orígenes del .env (la web y, luego, el panel). Sin origen (curl, servidor a servidor) se permite.
      origin: (origin, cb) => cb(null, !origin || env.corsOrigins.includes(origin)),
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
      allowedHeaders: ['Content-Type', 'Authorization'],
      maxAge: 600,
    }),
  );
  if (!env.isTest) app.use(pinoHttp({ logger }));
  app.use(express.json({ limit: '100kb' }));

  // Módulos (cada uno: repositorio → servicio → controlador → rutas)
  const auth = buildAuthModule(dataSource);
  const categories = buildCategoriesModule(dataSource);
  const projects = buildProjectsModule(dataSource, auth.authenticate);
  const catalog = buildCatalogModule(dataSource);
  const devices = buildDevicesModule(dataSource, auth.authenticate);
  const quotes = buildQuotesModule(dataSource, projects.repository, catalog.repository, auth.authenticate, async (aviso) => {
    await enviarAvisoCotizacion(aviso, await devices.service.tokens());
  });
  const uploads = buildUploadsModule();

  const api = express.Router();
  api.use('/health', healthRoutes(dataSource));
  // ---- Rutas PÚBLICAS (las usa la web; sin JWT) ----
  api.use('/categories', categories.router);
  api.use('/projects', projects.router);
  api.use('/quote-form', catalog.router); // servicios y preguntas del cotizador (el formulario se arma con esto)
  api.use('/quotes', quotes.router);
  api.use('/uploads', uploads.router);
  // ---- App de Luis (JWT) ----
  api.use('/auth', auth.router);
  api.use('/devices', devices.router);

  app.use(env.API_PREFIX, api);
  app.get('/health', healthRoutes(dataSource)); // alias sin prefijo para el chequeo del hosting

  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}
