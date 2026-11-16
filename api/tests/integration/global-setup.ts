// Antes de correr las pruebas: base de pruebas VACÍA → migraciones desde cero → datos mínimos.
// La estructura se crea con el MISMO comando de migraciones que usa el equipo (npm run migration:run),
// así cada ejecución comprueba también que las migraciones construyen la base completa.
import 'reflect-metadata';
import { execSync } from 'node:child_process';
import { AppDataSource } from '../../src/database/data-source';
import { seedAdmin } from '../../src/database/seeds/admin.seed';
import { seedCategories } from '../../src/database/seeds/categories.seed';
import { seedDemo } from '../../src/database/seeds/demo.seed';

const cli = (args: string) => {
  const env = { ...process.env, NODE_ENV: 'test' } as NodeJS.ProcessEnv;
  delete env.VITEST; // el CLI sí debe cargar las migraciones
  return execSync(`npx tsx ./node_modules/typeorm/cli.js ${args} -d src/database/data-source.ts`, { stdio: 'pipe', env });
};

export default async function setup() {
  const nombre = AppDataSource.options.database as string | undefined;
  // Seguro: borra TODO, así que solo corre contra una base cuyo nombre indique que es de pruebas
  if (!nombre || !/test/i.test(nombre)) {
    throw new Error(`Las pruebas solo corren contra una base de pruebas (el nombre debe contener "test"). Base actual: "${nombre}". Revisa .env.test`);
  }

  cli('schema:drop');
  cli('migration:run');

  await AppDataSource.initialize();
  await seedCategories(AppDataSource);
  await seedDemo(AppDataSource);
  await seedAdmin(AppDataSource);
  await AppDataSource.destroy();
}
