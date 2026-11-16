// Uso: tsx src/database/seeds/run.ts [categories|admin|demo|all]
import 'reflect-metadata';
import { AppDataSource } from '../data-source';
import { seedAdmin } from './admin.seed';
import { seedCategories } from './categories.seed';
import { seedDemo } from './demo.seed';

const target = process.argv[2] ?? 'all';

async function main() {
  await AppDataSource.initialize();
  try {
    if (target === 'categories' || target === 'all' || target === 'demo') console.log(`Categorías: ${await seedCategories(AppDataSource)} listas`);
    if (target === 'admin') console.log(`Administrador: ${await seedAdmin(AppDataSource)}`);
    if (target === 'demo') console.log(`Proyectos de prueba: ${await seedDemo(AppDataSource)} cargados`);
    if (target === 'all') {
      // "all" = lo necesario para arrancar de verdad: categorías + administrador (los proyectos de prueba se piden aparte)
      console.log(`Administrador: ${await seedAdmin(AppDataSource)}`);
    }
    if (!['categories', 'admin', 'demo', 'all'].includes(target)) throw new Error(`Seed desconocido: "${target}" (usa categories, admin, demo o all)`);
  } finally {
    await AppDataSource.destroy();
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
