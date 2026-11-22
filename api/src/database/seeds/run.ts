// Uso: tsx src/database/seeds/run.ts [categories|catalog|admin|demo|all]
import 'reflect-metadata';
import { AppDataSource } from '../data-source';
import { seedAdmin } from './admin.seed';
import { seedCatalog } from './catalog.seed';
import { seedCategories } from './categories.seed';
import { seedDemo } from './demo.seed';

const target = process.argv[2] ?? 'all';
const VALIDOS = ['categories', 'catalog', 'admin', 'demo', 'all'];

async function main() {
  if (!VALIDOS.includes(target)) throw new Error(`Seed desconocido: "${target}" (usa ${VALIDOS.join(', ')})`);
  await AppDataSource.initialize();
  try {
    if (target === 'categories' || target === 'all' || target === 'demo') console.log(`Categorías: ${await seedCategories(AppDataSource)} nuevas (las que ya existen no se tocan)`);
    if (target === 'catalog' || target === 'all') {
      const c = await seedCatalog(AppDataSource);
      console.log(`Catálogo del cotizador: ${c.servicios} servicios, ${c.preguntas} preguntas y ${c.opciones} opciones nuevas (lo que ya existe no se toca)`);
    }
    if (target === 'admin') console.log(`Administrador: ${await seedAdmin(AppDataSource)}`);
    if (target === 'demo') console.log(`Proyectos de prueba: ${await seedDemo(AppDataSource)} cargados`);
    if (target === 'all') {
      // "all" = lo necesario para arrancar de verdad: categorías + catálogo del cotizador + administrador (los proyectos de prueba se piden aparte)
      console.log(`Administrador: ${await seedAdmin(AppDataSource)}`);
    }
  } finally {
    await AppDataSource.destroy();
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
