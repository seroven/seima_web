// La conexión debe respetar DB_SCHEMA: TypeORM usa el schema y el search_path lo aplica al SQL de las migraciones.
import { describe, expect, it } from 'vitest';
import type { PostgresConnectionOptions } from 'typeorm/driver/postgres/PostgresConnectionOptions';
import { env } from '../../src/config/env';
import { dataSourceOptions } from '../../src/database/data-source';

const opts = dataSourceOptions as PostgresConnectionOptions;

describe('data-source', () => {
  it('usa el schema configurado y lo pone en el search_path', () => {
    expect(env.DB_SCHEMA).toBe('public'); // valor por defecto cuando no se define
    expect(opts.schema).toBe(env.DB_SCHEMA);
    expect(opts.extra).toEqual({ options: `-c search_path=${env.DB_SCHEMA}` });
  });
  it('nunca sincroniza la estructura automáticamente', () => {
    expect(opts.synchronize).toBe(false);
  });
  it('la migración inicial no escribe el schema a mano (debe servir con cualquier DB_SCHEMA)', async () => {
    const fs = await import('node:fs');
    const path = await import('node:path');
    const dir = path.resolve(__dirname, '../../src/database/migrations');
    for (const f of fs.readdirSync(dir)) {
      expect(fs.readFileSync(path.join(dir, f), 'utf8'), f).not.toMatch(/"public"\./);
    }
  });
});
