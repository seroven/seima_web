import 'reflect-metadata';
import { createApp } from './app';
import { logger } from './common/logger';
import { env } from './config/env';
import { AppDataSource } from './database/data-source';

async function main() {
  await AppDataSource.initialize();
  logger.info('Base de datos conectada');

  const app = createApp(AppDataSource);
  const server = app.listen(env.PORT, () => logger.info(`API escuchando en http://localhost:${env.PORT}${env.API_PREFIX}`));

  // Cierre ordenado (Render envía SIGTERM al desplegar)
  const shutdown = (signal: string) => {
    logger.info(`${signal} recibido: cerrando…`);
    server.close(async () => {
      await AppDataSource.destroy();
      process.exit(0);
    });
    setTimeout(() => process.exit(1), 10_000).unref();
  };
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

main().catch((err) => {
  logger.fatal({ err }, 'No se pudo iniciar la API');
  process.exit(1);
});
