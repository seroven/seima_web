import type { DataSource, Repository } from 'typeorm';
import { Category } from './category.entity';

/** Único lugar que habla con la base para categorías. */
export class CategoriesRepository {
  private readonly repo: Repository<Category>;

  constructor(dataSource: DataSource) {
    this.repo = dataSource.getRepository(Category);
  }

  findActive(): Promise<Category[]> {
    return this.repo.find({ where: { activo: true }, order: { orden: 'ASC', nombre: 'ASC' } });
  }

  findBySlug(slug: string): Promise<Category | null> {
    return this.repo.findOne({ where: { slug, activo: true } });
  }
}
