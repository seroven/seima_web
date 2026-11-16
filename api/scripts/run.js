#!/usr/bin/env node
// Uso (lo invocan los scripts de package.json):
//   node scripts/run.js [--env=qa] [--yes] [--guard=safe|write|destructive] <comando> [args...]
// Para el usuario:  npm run migration:run -- --env=qa
const { parsearArgs, resolverEntorno, revisarGuarda, ejecutar, falla } = require('./lib/runner');

const { env, yes, guard, resto } = parsearArgs(process.argv.slice(2));
if (resto.length === 0) falla('Falta el comando a ejecutar.');

const entorno = resolverEntorno(env);
const bloqueo = revisarGuarda(entorno, guard, yes);
if (bloqueo) falla(`[${entorno.toUpperCase()}] ${bloqueo}`);

ejecutar(resto[0], resto.slice(1), entorno).then((codigo) => process.exit(codigo));
