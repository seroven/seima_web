import type { DataSource, DeepPartial, Repository } from 'typeorm';
import { Quote } from './quote.entity';
import type { EstadoCotizacion } from './quote.constants';
import { RespuestaCotizacion } from './respuesta-cotizacion.entity';

/** Filtros para listar cotizaciones (los usará el panel). Todos son opcionales y se combinan con AND. */
export interface QuoteFilters {
  estado?: EstadoCotizacion;
  /** slug de un servicio: cotizaciones que lo incluyen */
  servicio?: string;
  /**
   * Cada filtro de respuesta exige que la cotización tenga esa respuesta: la pregunta (por slug) y, opcionalmente,
   * la opción elegida y/o el dato extra exacto que escribió.
   */
  respuestas?: { pregunta: string; opcion?: string; valor?: string }[];
  page?: number;
  limit?: number;
}

/** Único lugar que habla con la base para cotizaciones. */
export class QuotesRepository {
  private readonly repo: Repository<Quote>;
  private readonly respuestas: Repository<RespuestaCotizacion>;

  constructor(dataSource: DataSource) {
    this.repo = dataSource.getRepository(Quote);
    this.respuestas = dataSource.getRepository(RespuestaCotizacion);
  }

  create(data: DeepPartial<Quote>): Promise<Quote> {
    return this.repo.save(this.repo.create(data));
  }

  findById(id: string): Promise<Quote | null> {
    return this.repo.findOne({ where: { id } });
  }

  /** La cotización completa: servicios, respuestas (con su opción y su pregunta) y fotos ordenadas. La usará el panel. */
  findByIdFull(id: string): Promise<Quote | null> {
    return this.repo.findOne({
      where: { id },
      relations: { servicios: true, respuestas: { opcion: { pregunta: true } }, fotos: true },
      order: { fotos: { orden: 'ASC' } },
    });
  }

  /** Listado filtrable, más reciente primero (la base del buscador del panel). */
  async search(f: QuoteFilters = {}): Promise<[Quote[], number]> {
    const page = f.page ?? 1;
    const limit = f.limit ?? 50;
    const qb = this.repo.createQueryBuilder('q').leftJoinAndSelect('q.servicios', 's').orderBy('q.createdAt', 'DESC').skip((page - 1) * limit).take(limit);

    if (f.estado) qb.andWhere('q.estado = :estado', { estado: f.estado });

    if (f.servicio) {
      const sub = this.repo.createQueryBuilder('q2').select('q2.id').innerJoin('q2.servicios', 's2', 's2.slug = :servicio', { servicio: f.servicio });
      qb.andWhere(`q.id IN (${sub.getQuery()})`).setParameters(sub.getParameters());
    }

    (f.respuestas ?? []).forEach((r, i) => {
      const sub = this.respuestas
        .createQueryBuilder(`a${i}`)
        .select(`a${i}.quoteId`)
        .innerJoin(`a${i}.opcion`, `o${i}`)
        .innerJoin(`o${i}.pregunta`, `p${i}`, `p${i}.slug = :pregunta${i}`, { [`pregunta${i}`]: r.pregunta });
      if (r.opcion !== undefined) sub.andWhere(`o${i}.slug = :opcion${i}`, { [`opcion${i}`]: r.opcion });
      if (r.valor !== undefined) sub.andWhere(`a${i}.valor = :valor${i}`, { [`valor${i}`]: r.valor });
      qb.andWhere(`q.id IN (${sub.getQuery()})`).setParameters(sub.getParameters());
    });

    return qb.getManyAndCount();
  }
}
