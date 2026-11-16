import type { CategoriesRepository } from './categories.repository';

export interface CategoryDto {
  slug: string;
  nombre: string;
  orden: number;
}

/** Lógica de negocio de categorías (hoy solo lectura pública). */
export class CategoriesService {
  constructor(private readonly repository: CategoriesRepository) {}

  async list(): Promise<CategoryDto[]> {
    const categorias = await this.repository.findActive();
    return categorias.map((c) => ({ slug: c.slug, nombre: c.nombre, orden: c.orden }));
  }
}
