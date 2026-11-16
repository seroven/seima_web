// Ejecutor de comandos por entorno (scripts/lib/runner.js): flags, prioridad y guardas.
import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';

const { parsearArgs, resolverEntorno, revisarGuarda } = createRequire(__filename)('../../scripts/lib/runner.js');

describe('parsearArgs', () => {
  it('separa --env, --yes y --guard del resto, que se reenvía intacto (incluido -e de otras herramientas)', () => {
    const r = parsearArgs(['--env=qa', '--yes', '--guard=write', 'tsx', '-e', 'console.log(1)', '--watch']);
    expect(r).toEqual({ env: 'qa', yes: true, guard: 'write', resto: ['tsx', '-e', 'console.log(1)', '--watch'] });
  });
  it('acepta --env qa (con espacio)', () => {
    expect(parsearArgs(['--env', 'pd', 'x']).env).toBe('pd');
  });
});

describe('resolverEntorno', () => {
  it('prioridad: flag > APP_ENV > dev', () => {
    expect(resolverEntorno('qa', { APP_ENV: 'pd' })).toBe('qa');
    expect(resolverEntorno(undefined, { APP_ENV: 'pd' })).toBe('pd');
    expect(resolverEntorno(undefined, {})).toBe('dev');
  });
  it('acepta alias', () => {
    expect(resolverEntorno('production', {})).toBe('pd');
    expect(resolverEntorno('staging', {})).toBe('qa');
  });
});

describe('revisarGuarda', () => {
  it('safe nunca bloquea', () => {
    for (const e of ['dev', 'qa', 'pd']) expect(revisarGuarda(e, 'safe', false)).toBeNull();
  });
  it('write: libre en dev/qa; en pd exige --yes', () => {
    expect(revisarGuarda('dev', 'write', false)).toBeNull();
    expect(revisarGuarda('qa', 'write', false)).toBeNull();
    expect(revisarGuarda('pd', 'write', false)).toMatch(/--yes/);
    expect(revisarGuarda('pd', 'write', true)).toBeNull();
  });
  it('destructive: libre en dev; en qa exige --yes; en pd bloqueado aunque pongan --yes', () => {
    expect(revisarGuarda('dev', 'destructive', false)).toBeNull();
    expect(revisarGuarda('qa', 'destructive', false)).toMatch(/--yes/);
    expect(revisarGuarda('qa', 'destructive', true)).toBeNull();
    expect(revisarGuarda('pd', 'destructive', true)).toMatch(/BLOQUEADO/);
  });
});
