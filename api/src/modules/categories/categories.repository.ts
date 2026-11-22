import { In, type DataSource, type Repository } from 'typeorm';
import { Category } from './category.entity';

/** Único lugar que habla con la base para categorías (tipos de trabajo). */
export class CategoriesRepository {
  private readonly repo: Repository<Category>;

  constructor(private readonly dataSource: DataSource) {
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

  // ---- Gestión (la app de Luis): incluye las desactivadas y cuántas obras usa cada una ----

  findAllWithCounts(): Promise<Category[]> {
    return this.repo
      .createQueryBuilder('c')
      .loadRelationCountAndMap('c.obras', 'c.proyectos')
      .orderBy('c.orden', 'ASC')
      .addOrderBy('c.nombre', 'ASC')
      .getMany();
  }

  async findByIdWithCount(id: string): Promise<Category | null> {
    return this.repo.createQueryBuilder('c').loadRelationCountAndMap('c.obras', 'c.proyectos').where('c.id = :id', { id }).getOne();
  }

  /** Para no repetir nombres, sin importar mayúsculas ni tildes de más: se compara en minúsculas. */
  findByNombre(nombre: string): Promise<Category | null> {
    return this.repo.createQueryBuilder('c').where('LOWER(c.nombre) = LOWER(:nombre)', { nombre }).getOne();
  }

  slugTaken(slug: string): Promise<boolean> {
    return this.repo.existsBy({ slug });
  }

  async nextOrden(): Promise<number> {
    const row = await this.repo.createQueryBuilder('c').select('COALESCE(MAX(c.orden), -1)', 'max').getRawOne<{ max: string }>();
    return Number(row?.max ?? -1) + 1;
  }

  save(data: Pick<Category, 'slug' | 'nombre' | 'orden'> & Partial<Category>): Promise<Category> {
    return this.repo.save(this.repo.create(data));
  }

  async update(id: string, data: Partial<Pick<Category, 'nombre' | 'activo'>>): Promise<void> {
    await this.repo.update(id, data);
  }

  countByIds(ids: string[]): Promise<number> {
    return this.repo.countBy({ id: In(ids) });
  }

  /** Deja el orden 0, 1, 2… según la lista, en una sola transacción. */
  async reorder(ids: string[]): Promise<void> {
    await this.dataSource.transaction(async (m) => {
      for (let orden = 0; orden < ids.length; orden++) await m.update(Category, { id: ids[orden] }, { orden });
    });
  }
}
