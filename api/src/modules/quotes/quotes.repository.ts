import type { DataSource, DeepPartial, Repository } from 'typeorm';
import { Quote } from './quote.entity';

/** Único lugar que habla con la base para cotizaciones. */
export class QuotesRepository {
  private readonly repo: Repository<Quote>;

  constructor(dataSource: DataSource) {
    this.repo = dataSource.getRepository(Quote);
  }

  create(data: DeepPartial<Quote>): Promise<Quote> {
    return this.repo.save(this.repo.create(data));
  }

  findById(id: string): Promise<Quote | null> {
    return this.repo.findOne({ where: { id } });
  }

  /** La cotización con sus fotos ordenadas (la usará el panel). */
  findByIdWithPhotos(id: string): Promise<Quote | null> {
    return this.repo.findOne({ where: { id }, relations: { fotos: true }, order: { fotos: { orden: 'ASC' } } });
  }
}
