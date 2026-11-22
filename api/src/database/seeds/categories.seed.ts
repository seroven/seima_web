import type { DataSource } from 'typeorm';
import { Category } from '../../modules/categories/category.entity';

// Tipos de trabajo base (los mismos del catálogo de la web). Se pueden volver a correr sin duplicar.
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

/**
 * Agrega SOLO los que faltan (por `slug`). Desde que los tipos de trabajo se gestionan en la app de Luis, la base es la
 * fuente de verdad: no se pisa el nombre, el orden ni si está activo. Devuelve cuántos agregó.
 */
export async function seedCategories(ds: DataSource): Promise<number> {
  const repo = ds.getRepository(Category);
  const existentes = new Set((await repo.find({ select: { slug: true } })).map((c) => c.slug));
  const faltan = CATEGORIAS.map((c, i) => ({ ...c, orden: i, activo: true })).filter((c) => !existentes.has(c.slug));
  if (faltan.length) await repo.insert(faltan);
  return faltan.length;
}
