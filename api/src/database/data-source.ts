// Conexión a PostgreSQL. Lo usan la app, las migraciones (CLI de TypeORM) y los seeds.
// IMPORTANTE: `synchronize` está apagado SIEMPRE; la estructura de la base solo cambia por migraciones.
import 'reflect-metadata';
import path from 'node:path';
import { DataSource, type DataSourceOptions } from 'typeorm';
import { SnakeNamingStrategy } from 'typeorm-naming-strategies';
import { env } from '../config/env';
import { entities } from './entities';

export const dataSourceOptions: DataSourceOptions = {
  type: 'postgres',
  ...(env.DATABASE_URL
    ? { url: env.DATABASE_URL }
    : { host: env.DB_HOST, port: env.DB_PORT, username: env.DB_USER, password: env.DB_PASSWORD, database: env.DB_NAME }),
  ssl: env.DB_SSL ? { rejectUnauthorized: false } : false,
  // Schema de PostgreSQL (DB_SCHEMA). `schema` lo usa TypeORM en sus consultas y en la tabla de migraciones;
  // el search_path hace que el SQL sin prefijo de las migraciones (tablas, enums, índices) caiga en ese mismo schema.
  schema: env.DB_SCHEMA,
  extra: { options: `-c search_path=${env.DB_SCHEMA}` },
  entities, // lista explícita (database/entities.ts): funciona igual con tsx, con la app compilada y en las pruebas
  // Las migraciones sí se buscan por patrón: el CLI las genera y se detectan solas (.ts en desarrollo, .js compilado).
  // Dentro de Vitest no se cargan (Node no entiende .ts nativamente ahí); las pruebas crean la base con el CLI en otro proceso.
  migrations: process.env.VITEST ? [] : [path.join(__dirname, 'migrations', '*.{ts,js}')],
  migrationsTableName: 'migrations',
  namingStrategy: new SnakeNamingStrategy(), // propiedadCamel → columna_snake
  uuidExtension: 'pgcrypto',
  synchronize: false,
  logging: env.isTest ? false : ['error', 'warn', 'migration'],
};

export const AppDataSource = new DataSource(dataSourceOptions);
