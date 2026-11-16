// Ejecutor común de comandos con selección de entorno. Sin dependencias: se ejecuta con `node`.
//
//   node scripts/run.js [--env=qa] [--yes] [--guard=<tipo>] <comando> [argumentos...]
//
// Orden de prioridad del entorno: flag --env  >  variable APP_ENV  >  "dev".
// Guardas (--guard), pensadas para no romper datos por accidente:
//   safe         sin restricciones (arrancar, compilar, consultar)
//   write        modifica la base (migraciones, seeds): en PD exige --yes
//   destructive  borra o fabrica datos: en PD está BLOQUEADO; en QA exige --yes
const { spawn } = require('node:child_process');
const path = require('node:path');

const ENTORNOS = { dev: 'dev', development: 'dev', local: 'dev', qa: 'qa', staging: 'qa', pd: 'pd', prod: 'pd', production: 'pd', produccion: 'pd', test: 'test' };
const GUARDAS = ['safe', 'write', 'destructive'];

function falla(mensaje) {
  console.error(`\n[run] ${mensaje}\n`);
  process.exit(1);
}

/** Separa nuestros flags (--env, --yes, --guard) del resto, que se reenvía tal cual al comando. */
function parsearArgs(argv) {
  const salida = { env: undefined, yes: false, guard: 'safe', resto: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--env') salida.env = argv[++i];
    else if (a.startsWith('--env=')) salida.env = a.slice(6);
    else if (a === '--yes') salida.yes = true;
    else if (a.startsWith('--guard=')) salida.guard = a.slice(8);
    else salida.resto.push(a);
  }
  if (!GUARDAS.includes(salida.guard)) falla(`Guarda desconocida "${salida.guard}" (usa ${GUARDAS.join(', ')}).`);
  return salida;
}

function resolverEntorno(flag, procesoEnv = process.env) {
  const crudo = (flag ?? procesoEnv.APP_ENV ?? 'dev').trim().toLowerCase();
  const entorno = ENTORNOS[crudo];
  if (!entorno) falla(`Entorno desconocido "${crudo}". Usa --env=dev | qa | pd | test.`);
  return entorno;
}

/** Aplica las guardas. Devuelve un mensaje de error o null si se puede continuar. */
function revisarGuarda(entorno, guard, yes) {
  if (guard === 'destructive' && entorno === 'pd') {
    return 'Este comando es destructivo y está BLOQUEADO en producción (pd).';
  }
  if (guard === 'destructive' && entorno === 'qa' && !yes) {
    return 'Este comando es destructivo. En QA agrega --yes para confirmar que de verdad quieres ejecutarlo.';
  }
  if (guard === 'write' && entorno === 'pd' && !yes) {
    return 'Este comando modifica la base de PRODUCCIÓN (pd). Agrega --yes para confirmar.';
  }
  return null;
}

function ejecutar(comando, args, entorno) {
  // Con o sin `npm run`, los binarios locales (tsx, vitest, tsc…) deben resolverse
  const bin = path.join(__dirname, '..', '..', 'node_modules', '.bin');
  const PATH = bin + path.delimiter + (process.env.PATH || process.env.Path || '');
  const hijo = spawn(comando, args, {
    stdio: 'inherit',
    shell: true, // en Windows hace falta para resolver tsx, npx, etc.
    env: { ...process.env, PATH, Path: PATH, APP_ENV: entorno, SEIMA_BANNER: '1' },
  });
  return new Promise((resolve) => {
    hijo.on('exit', (codigo, senal) => resolve(codigo ?? (senal ? 1 : 0)));
    hijo.on('error', (e) => {
      console.error(`[run] No se pudo ejecutar "${comando}": ${e.message}`);
      resolve(1);
    });
  });
}

module.exports = { parsearArgs, resolverEntorno, revisarGuarda, ejecutar, falla };
