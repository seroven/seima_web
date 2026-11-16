#!/usr/bin/env node
// Aplica las migraciones: primero se asegura de que exista el schema (DB_SCHEMA) y luego corre migration:run.
//   npm run migration:run -- --env=qa            (desarrollo: TypeScript con tsx)
//   npm run migration:run:prod -- --yes          (despliegue: código compilado en dist/)
// Es una escritura sobre la base: en pd exige --yes.
const { parsearArgs, resolverEntorno, revisarGuarda, ejecutar, falla } = require('./lib/runner');

const { env, yes, resto } = parsearArgs(process.argv.slice(2));
const prod = resto.includes('--prod');
const entorno = resolverEntorno(env);
const bloqueo = revisarGuarda(entorno, 'write', yes);
if (bloqueo) falla(`[${entorno.toUpperCase()}] ${bloqueo}`);

const pasos = prod
  ? [['node', ['dist/database/ensure-schema.js']], ['node', ['./node_modules/typeorm/cli.js', 'migration:run', '-d', 'dist/database/data-source.js']]]
  : [['tsx', ['src/database/ensure-schema.ts']], ['tsx', ['./node_modules/typeorm/cli.js', 'migration:run', '-d', 'src/database/data-source.ts']]];

(async () => {
  for (const [cmd, args] of pasos) {
    const codigo = await ejecutar(cmd, args, entorno);
    if (codigo !== 0) process.exit(codigo);
  }
})();
