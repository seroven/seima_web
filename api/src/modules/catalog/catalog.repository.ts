import type { DataSource, Repository } from 'typeorm';
import { Pregunta } from './pregunta.entity';
import { Servicio } from './servicio.entity';

/** Único lugar que habla con la base para el catálogo del cotizador (servicios, preguntas y opciones). */
export class CatalogRepository {
  private readonly servicios: Repository<Servicio>;
  private readonly preguntas: Repository<Pregunta>;

  constructor(dataSource: DataSource) {
    this.servicios = dataSource.getRepository(Servicio);
    this.preguntas = dataSource.getRepository(Pregunta);
  }

  findActiveServices(): Promise<Servicio[]> {
    return this.servicios.find({ where: { activo: true }, order: { orden: 'ASC' } });
  }

  findActiveServicesBySlugs(slugs: string[]): Promise<Servicio[]> {
    return this.servicios.find({ where: slugs.map((slug) => ({ slug, activo: true })) });
  }

  /** Preguntas activas con sus opciones activas (ordenadas) y los servicios en los que aplican. */
  async findActiveQuestions(): Promise<Pregunta[]> {
    const preguntas = await this.preguntas.find({
      where: { activo: true },
      relations: { opciones: true, servicios: true },
      order: { orden: 'ASC', opciones: { orden: 'ASC' } },
    });
    return preguntas.map((p) => Object.assign(p, { opciones: p.opciones.filter((o) => o.activo) }));
  }
}
