#!/usr/bin/env node
// Borra TODA la base del entorno y la reconstruye con las migraciones.  npm run db:reset -- --env=qa --yes
// Destructivo: bloqueado en pd; en qa pide --yes. (Dos pasos en un mismo proceso para que el flag --env aplique a ambos.)
const { parsearArgs, resolverEntorno, revisarGuarda, ejecutar, falla } = require('./lib/runner');

const { env, yes } = parsearArgs(process.argv.slice(2));
const entorno = resolverEntorno(env);
const bloqueo = revisarGuarda(entorno, 'destructive', yes);
if (bloqueo) falla(`[${entorno.toUpperCase()}] ${bloqueo}`);

const typeorm = (accion) => ['tsx', ['./node_modules/typeorm/cli.js', accion, '-d', 'src/database/data-source.ts']];

(async () => {
  for (const accion of ['schema:drop', 'migration:run']) {
    const [cmd, args] = typeorm(accion);
    const codigo = await ejecutar(cmd, args, entorno);
    if (codigo !== 0) process.exit(codigo);
  }
})();
