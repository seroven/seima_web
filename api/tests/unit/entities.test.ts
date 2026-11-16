// Guardia: si alguien crea un *.entity.ts y olvida añadirlo a database/entities.ts, esta prueba falla.
import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { entities } from '../../src/database/entities';

const buscar = (dir: string): string[] =>
  fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? buscar(path.join(dir, e.name)) : e.name.endsWith('.entity.ts') ? [e.name] : []));

describe('entidades registradas', () => {
  it('cada archivo *.entity.ts está en database/entities.ts', () => {
    const archivos = buscar(path.resolve(__dirname, '../../src/modules'));
    expect(entities).toHaveLength(archivos.length);
  });
});
