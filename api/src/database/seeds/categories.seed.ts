import type { DataSource } from 'typeorm';
import { Category } from '../../modules/categories/category.entity';

// Mismas categorías que el catálogo de la web (web/src/data/projects.ts). Se pueden volver a correr sin duplicar.
export const CATEGORIAS = [
  { slug: 'cocinas', nombre: 'Cocinas' },
  { slug: 'banos', nombre: 'Baños' },
  { slug: 'departamentos', nombre: 'Departamentos' },
  { slug: 'melamina', nombre: 'Melamina' },
  { slug: 'techos', nombre: 'Techos' },
  { slug: 'cocheras-fachadas', nombre: 'Cocheras y fachadas' },
  { slug: 'remodelaciones', nombre: 'Remodelaciones' },
  { slug: 'locales', nombre: 'Locales comerciales' },
];

export async function seedCategories(ds: DataSource): Promise<number> {
  await ds.getRepository(Category).upsert(
    CATEGORIAS.map((c, i) => ({ ...c, orden: i, activo: true })),
    ['slug'],
  );
  return CATEGORIAS.length;
}
