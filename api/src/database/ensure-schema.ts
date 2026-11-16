// Crea el schema de PostgreSQL (DB_SCHEMA) si todavía no existe. Se ejecuta antes de las migraciones:
// la tabla de migraciones y todas las demás viven dentro de ese schema, así que debe existir primero.
//   npm run db:schema -- --env=qa     (migration:run y db:reset ya lo hacen solos)
import 'reflect-metadata';
import { DataSource } from 'typeorm';
import type { PostgresConnectionOptions } from 'typeorm/driver/postgres/PostgresConnectionOptions';
import { env } from '../config/env';
import { dataSourceOptions } from './data-source';

export async function ensureSchema(): Promise<void> {
  // Misma conexión pero SIN schema/search_path (todavía no existe) y sin entidades ni migraciones
  const { schema: _s, extra: _e, entities: _en, migrations: _m, ...conexion } = dataSourceOptions as PostgresConnectionOptions;
  const ds = new DataSource({ ...conexion, entities: [], migrations: [], logging: false });
  await ds.initialize();
  const qr = ds.createQueryRunner();
  try {
    await qr.createSchema(env.DB_SCHEMA, true); // IF NOT EXISTS
  } finally {
    await qr.release();
    await ds.destroy();
  }
}

if (require.main === module) {
  ensureSchema()
    .then(() => console.error(`[schema] "${env.DB_SCHEMA}" listo`))
    .catch((e) => {
      console.error(`[schema] No se pudo preparar el schema "${env.DB_SCHEMA}": ${e instanceof Error ? e.message : e}`);
      process.exit(1);
    });
}
