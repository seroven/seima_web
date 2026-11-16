// Comprueba el entorno activo: variables válidas (env.ts ya aborta si no) y conexión a la base.
//   npm run env:check -- --env=qa
import 'reflect-metadata';
import { describirBase, env } from '../src/config/env';
import { AppDataSource } from '../src/database/data-source';

async function main() {
  console.log(`Entorno: ${env.APP_ENV} (NODE_ENV=${env.NODE_ENV}) · puerto ${env.PORT} · prefijo ${env.API_PREFIX}`);
  console.log(`CORS: ${env.corsOrigins.join(', ')}`);
  console.log(`Cloudinary: ${env.CLOUDINARY_CLOUD_NAME ? 'configurado' : 'sin configurar'} · Admin inicial: ${env.ADMIN_EMAIL ? 'definido' : 'sin definir'}`);
  console.log(`Base: ${describirBase()}`);
  await AppDataSource.initialize();
  const pendientes = await AppDataSource.showMigrations();
  console.log(`Conexión OK · migraciones pendientes: ${pendientes ? 'SÍ (corre migration:run)' : 'no'}`);
  await AppDataSource.destroy();
}

main().catch((e) => {
  console.error(`Conexión FALLIDA: ${e instanceof Error ? e.message : e}`);
  process.exit(1);
});
