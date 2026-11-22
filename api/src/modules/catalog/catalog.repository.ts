import { In, type DataSource, type Repository } from 'typeorm';
import { OpcionPregunta } from './opcion-pregunta.entity';
import { Pregunta } from './pregunta.entity';
import { Servicio } from './servicio.entity';

/** Único lugar que habla con la base para el catálogo del cotizador (servicios, preguntas y opciones). */
export class CatalogRepository {
  private readonly servicios: Repository<Servicio>;
  private readonly preguntas: Repository<Pregunta>;
  private readonly opciones: Repository<OpcionPregunta>;

  constructor(private readonly dataSource: DataSource) {
    this.servicios = dataSource.getRepository(Servicio);
    this.preguntas = dataSource.getRepository(Pregunta);
    this.opciones = dataSource.getRepository(OpcionPregunta);
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

  // ---------------------------------------------------------------------------------------------
  // Gestión (la app de Luis): incluye lo desactivado. Nada se borra: hay respuestas guardadas.
  // ---------------------------------------------------------------------------------------------

  findAllServices(): Promise<Servicio[]> {
    return this.servicios.find({ order: { orden: 'ASC', nombre: 'ASC' } });
  }

  findServiceById(id: string): Promise<Servicio | null> {
    return this.servicios.findOneBy({ id });
  }

  findServicesByIds(ids: string[]): Promise<Servicio[]> {
    return ids.length ? this.servicios.find({ where: { id: In(ids) } }) : Promise.resolve([]);
  }

  findServiceByNombre(nombre: string): Promise<Servicio | null> {
    return this.servicios.createQueryBuilder('s').where('LOWER(s.nombre) = LOWER(:nombre)', { nombre }).getOne();
  }

  serviceSlugTaken(slug: string): Promise<boolean> {
    return this.servicios.existsBy({ slug });
  }

  async nextServiceOrden(): Promise<number> {
    const row = await this.servicios.createQueryBuilder('s').select('COALESCE(MAX(s.orden), -1)', 'max').getRawOne<{ max: string }>();
    return Number(row?.max ?? -1) + 1;
  }

  saveService(data: Pick<Servicio, 'slug' | 'nombre' | 'icono' | 'orden'> & Partial<Servicio>): Promise<Servicio> {
    return this.servicios.save(this.servicios.create(data));
  }

  async updateService(id: string, data: Partial<Pick<Servicio, 'nombre' | 'icono' | 'activo'>>): Promise<void> {
    await this.servicios.update(id, data);
  }

  async reorderServices(ids: string[]): Promise<void> {
    await this.dataSource.transaction(async (m) => {
      for (let orden = 0; orden < ids.length; orden++) await m.update(Servicio, { id: ids[orden] }, { orden });
    });
  }

  countServicesByIds(ids: string[]): Promise<number> {
    return this.servicios.countBy({ id: In(ids) });
  }

  /** Todas las preguntas (también las desactivadas) con todas sus opciones y los servicios donde aplican. */
  findAllQuestions(): Promise<Pregunta[]> {
    return this.preguntas.find({ relations: { opciones: true, servicios: true }, order: { orden: 'ASC', opciones: { orden: 'ASC' } } });
  }

  findQuestionById(id: string): Promise<Pregunta | null> {
    return this.preguntas.findOne({ where: { id }, relations: { opciones: true, servicios: true }, order: { opciones: { orden: 'ASC' } } });
  }

  questionSlugTaken(slug: string): Promise<boolean> {
    return this.preguntas.existsBy({ slug });
  }

  async nextQuestionOrden(): Promise<number> {
    const row = await this.preguntas.createQueryBuilder('p').select('COALESCE(MAX(p.orden), -1)', 'max').getRawOne<{ max: string }>();
    return Number(row?.max ?? -1) + 1;
  }

  saveQuestion(data: Pick<Pregunta, 'slug' | 'texto' | 'etiqueta' | 'tipo' | 'orden' | 'servicios'> & Partial<Pregunta>): Promise<Pregunta> {
    return this.preguntas.save(this.preguntas.create(data));
  }

  async updateQuestion(id: string, data: Partial<Pick<Pregunta, 'texto' | 'etiqueta' | 'tipo' | 'activo'>>): Promise<void> {
    await this.preguntas.update(id, data);
  }

  /** Reemplaza los servicios en los que aplica la pregunta por exactamente estos. */
  async setQuestionServices(id: string, servicios: Servicio[]): Promise<void> {
    await this.preguntas.save({ id, servicios });
  }

  /**
   * Reacomoda las preguntas dadas entre sí. Reparte los mismos números de orden que ya tenían, así el resto de las
   * preguntas del cotizador (las de otros servicios) no se mueven de lugar.
   */
  async reorderQuestions(ids: string[]): Promise<void> {
    await this.dataSource.transaction(async (m) => {
      const filas = await m.find(Pregunta, { where: { id: In(ids) }, select: { id: true, orden: true } });
      const ordenes = filas.map((f) => f.orden).sort((a, b) => a - b);
      for (let i = 0; i < ids.length; i++) await m.update(Pregunta, { id: ids[i] }, { orden: ordenes[i] });
    });
  }

  countQuestionsByIds(ids: string[]): Promise<number> {
    return this.preguntas.countBy({ id: In(ids) });
  }

  findOptionById(id: string): Promise<OpcionPregunta | null> {
    return this.opciones.findOneBy({ id });
  }

  findOptionsOfQuestion(questionId: string): Promise<OpcionPregunta[]> {
    return this.opciones.find({ where: { questionId }, order: { orden: 'ASC' } });
  }

  optionSlugTaken(questionId: string, slug: string): Promise<boolean> {
    return this.opciones.existsBy({ questionId, slug });
  }

  async nextOptionOrden(questionId: string): Promise<number> {
    const row = await this.opciones
      .createQueryBuilder('o')
      .select('COALESCE(MAX(o.orden), -1)', 'max')
      .where('o.questionId = :questionId', { questionId })
      .getRawOne<{ max: string }>();
    return Number(row?.max ?? -1) + 1;
  }

  saveOption(data: Pick<OpcionPregunta, 'questionId' | 'slug' | 'etiqueta' | 'orden'> & Partial<OpcionPregunta>): Promise<OpcionPregunta> {
    return this.opciones.save(this.opciones.create(data));
  }

  async updateOption(id: string, data: Partial<Pick<OpcionPregunta, 'etiqueta' | 'descripcion' | 'tipoEntrada' | 'entradaAyuda' | 'activo'>>): Promise<void> {
    await this.opciones.update(id, data);
  }

  async reorderOptions(questionId: string, ids: string[]): Promise<void> {
    await this.dataSource.transaction(async (m) => {
      for (let orden = 0; orden < ids.length; orden++) await m.update(OpcionPregunta, { id: ids[orden], questionId }, { orden });
    });
  }
}
