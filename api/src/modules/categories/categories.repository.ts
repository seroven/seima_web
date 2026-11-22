import { In, type DataSource, type Repository } from 'typeorm';
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

  /** Las categorías activas que existen entre los slugs pedidos (las que no existan no vienen). */
  findBySlugs(slugs: string[]): Promise<Category[]> {
    if (slugs.length === 0) return Promise.resolve([]);
    return this.repo.find({ where: { slug: In(slugs), activo: true } });
  }
}
