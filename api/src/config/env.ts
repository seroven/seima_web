// Variables de entorno: se cargan del archivo del entorno activo y se validan UNA vez al arrancar.
// Si falta algo o está mal, la app no arranca y dice exactamente qué corregir.
//
// ENTORNOS (APP_ENV): dev · qa · pd (producción) · test
//   Se elige con el flag --env=qa en los comandos (ver scripts/run.js) o con la variable APP_ENV (así lo hará Render).
//   Archivo que se lee: .env.<entorno> (.env.dev, .env.qa, .env.pd, .env.test) y, si existe, .env como base común.
//   Las variables que ya estén definidas en el sistema (Render, CI…) MANDAN sobre los archivos.
import { config } from 'dotenv';
import fs from 'node:fs';
import path from 'node:path';
import { z } from 'zod';

export const APP_ENVS = ['dev', 'qa', 'pd', 'test'] as const;
export type AppEnv = (typeof APP_ENVS)[number];

const ALIAS: Record<string, AppEnv> = {
  development: 'dev', dev: 'dev', local: 'dev',
  qa: 'qa', staging: 'qa', stage: 'qa',
  pd: 'pd', prod: 'pd', production: 'pd', produccion: 'pd', pro: 'pd',
  test: 'test',
};

function resolverEntorno(): AppEnv {
  const crudo = (process.env.APP_ENV ?? (process.env.NODE_ENV === 'test' ? 'test' : 'dev')).trim().toLowerCase();
  const entorno = ALIAS[crudo];
  if (!entorno) {
    console.error(`\n[config] Entorno desconocido: "${crudo}". Usa uno de: ${APP_ENVS.join(', ')} (flag --env=qa o variable APP_ENV).\n`);
    process.exit(1);
  }
  return entorno;
}

const appEnv = resolverEntorno();
process.env.APP_ENV = appEnv;
// NODE_ENV se deriva del entorno (qa y pd se comportan como producción: errores sin detalles internos, etc.)
process.env.NODE_ENV ||= appEnv === 'dev' ? 'development' : appEnv === 'test' ? 'test' : 'production';

const dir = process.env.ENV_DIR ? path.resolve(process.env.ENV_DIR) : process.cwd();
const archivoEntorno = path.join(dir, `.env.${appEnv}`);
const archivoBase = path.join(dir, '.env');
const cargados: string[] = [];
for (const f of [archivoEntorno, archivoBase]) {
  if (fs.existsSync(f)) {
    config({ path: f, quiet: true }); // dotenv no pisa lo ya definido: el archivo del entorno gana sobre .env, y el sistema sobre ambos
    cargados.push(path.basename(f));
  }
}

const boolStr = z
  .enum(['true', 'false'])
  .default('false')
  .transform((v) => v === 'true');

const vacioAUndefined = (v: unknown) => (typeof v === 'string' && v.trim() === '' ? undefined : v);
const opcional = <T extends z.ZodTypeAny>(schema: T) => z.preprocess(vacioAUndefined, schema.optional());

const schema = z
  .object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    PORT: z.coerce.number().int().min(1).max(65535).default(4000),
    API_PREFIX: z.string().regex(/^\/[a-z0-9/_-]*$/i, 'Debe empezar con / (ej. /api/v1)').default('/api/v1'),
    CORS_ORIGINS: z.string().default('http://localhost:4321'),
    TRUST_PROXY: boolStr,
    LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).default('info'),

    DATABASE_URL: opcional(z.string().url()),
    DB_HOST: z.string().default('localhost'),
    DB_PORT: z.coerce.number().int().default(5432),
    DB_USER: z.string().default('postgres'),
    DB_PASSWORD: z.string().default(''),
    DB_NAME: z.string().default('seima'),
    // Schema de PostgreSQL donde viven las tablas (y la tabla de migraciones). Debe existir o crearse con migration:run.
    DB_SCHEMA: z
      .string()
      .regex(/^[a-z_][a-z0-9_]{0,62}$/i, 'DB_SCHEMA inválido (letras, números y guion bajo; no puede empezar con número)')
      .default('public'),
    DB_SSL: boolStr,

    JWT_SECRET: z.string().min(32, 'JWT_SECRET debe tener al menos 32 caracteres'),
    JWT_EXPIRES_IN: z.string().default('8h'),
    /** Vida del refresh token de la app (ej. 60d, 12h). */
    JWT_REFRESH_EXPIRES_IN: z.string().regex(/^\d+[dhm]$/, 'JWT_REFRESH_EXPIRES_IN debe ser como 60d, 12h o 30m').default('60d'),
    JWT_ISSUER: z.string().default('seima-api'),
    JWT_AUDIENCE: z.string().default('seima-panel'),
    BCRYPT_ROUNDS: z.coerce.number().int().min(10).max(15).default(12),

    RATE_LIMIT_QUOTES_PER_HOUR: z.coerce.number().int().min(1).default(10),
    RATE_LIMIT_LOGIN_PER_15MIN: z.coerce.number().int().min(1).default(10),
    RATE_LIMIT_UPLOADS_PER_HOUR: z.coerce.number().int().min(1).default(20),

    CLOUDINARY_CLOUD_NAME: opcional(z.string()),
    CLOUDINARY_API_KEY: opcional(z.string()),
    CLOUDINARY_API_SECRET: opcional(z.string()),
    // Carpeta de Cloudinary donde caen las fotos que suben los clientes desde el cotizador
    CLOUDINARY_QUOTES_FOLDER: z
      .string()
      .regex(/^[A-Za-z0-9_-]+(\/[A-Za-z0-9_-]+)*$/, 'CLOUDINARY_QUOTES_FOLDER inválida (ej. seima/quotes)')
      .default('seima/quotes'),
    /** Carpeta de los proyectos. Cada proyecto queda en `<carpeta>/<id>`. */
    CLOUDINARY_PROJECTS_FOLDER: z
      .string()
      .regex(/^[A-Za-z0-9_-]+(\/[A-Za-z0-9_-]+)*$/, 'CLOUDINARY_PROJECTS_FOLDER inválida (ej. seima/projects)')
      .default('seima/projects'),

    // Cuenta de servicio de Firebase (push). Las tres juntas; si faltan, la cotización se guarda igual y no se avisa.
    FIREBASE_PROJECT_ID: opcional(z.string()),
    FIREBASE_CLIENT_EMAIL: opcional(z.string().email()),
    FIREBASE_PRIVATE_KEY: opcional(z.string().min(1)),

    ADMIN_EMAIL: opcional(z.string().email()),
    ADMIN_PASSWORD: opcional(z.string().min(10, 'ADMIN_PASSWORD debe tener al menos 10 caracteres')),
    ADMIN_NAME: z.string().default('Administrador'),
  })
  .transform((e) => ({
    ...e,
    APP_ENV: appEnv,
    isProd: e.NODE_ENV === 'production',
    isTest: e.NODE_ENV === 'test',
    corsOrigins: e.CORS_ORIGINS.split(',').map((o) => o.trim()).filter(Boolean),
  }));

const parsed = schema.safeParse(process.env);

if (!parsed.success) {
  const detalle = parsed.error.issues.map((i) => `  - ${i.path.join('.') || '(general)'}: ${i.message}`).join('\n');
  const donde = cargados.length ? cargados.join(' + ') : `ningún archivo (se esperaba ${path.basename(archivoEntorno)})`;
  console.error(
    `\n[config] Variables de entorno inválidas para el entorno "${appEnv}" (archivos leídos: ${donde}).\n${detalle}\n` +
      `Modelo: .env.${appEnv}.example (o .env.example con todas las variables).\n`,
  );
  process.exit(1);
}

export const env = parsed.data;
export type Env = typeof env;

/** Descripción corta de a qué base y schema apunta este entorno (sin contraseña). */
export function describirBase(e: Env = env): string {
  if (e.DATABASE_URL) {
    try {
      const u = new URL(e.DATABASE_URL);
      return `${u.hostname}:${u.port || 5432}${u.pathname} · schema ${e.DB_SCHEMA}`;
    } catch {
      return '(DATABASE_URL)';
    }
  }
  return `${e.DB_HOST}:${e.DB_PORT}/${e.DB_NAME} · schema ${e.DB_SCHEMA}`;
}

// Los comandos de scripts/run.js piden este banner: así siempre se ve en qué entorno y contra qué base se trabaja.
if (process.env.SEIMA_BANNER === '1') {
  console.error(
    `[entorno] ${appEnv.toUpperCase()} · NODE_ENV=${env.NODE_ENV} · archivos: ${cargados.join(' + ') || 'ninguno (variables del sistema)'} · base: ${describirBase()}`,
  );
}
