import { LessThan, type DataSource, type DeepPartial, type Repository } from 'typeorm';
import { Project } from '../projects/project.entity';
import { ZONA, type TipoVisita } from './analytics.constants';
import { Visit } from './visit.entity';

export interface Conteo {
  visitas: number;
  visitantes: number;
}
export interface ConteoDia extends Conteo {
  fecha: string;
}
export interface ConteoProyecto extends Conteo {
  slug: string;
  titulo: string;
}

const n = (v: unknown): number => Number(v ?? 0);

/** Único lugar que habla con la base para las mediciones (solo QueryBuilder, sin SQL suelto de datos de usuarios). */
export class AnalyticsRepository {
  private readonly repo: Repository<Visit>;

  constructor(dataSource: DataSource) {
    this.repo = dataSource.getRepository(Visit);
  }

  guardar(data: DeepPartial<Visit>): Promise<Visit> {
    return this.repo.save(this.repo.create(data));
  }

  /** Base común: un tipo de visita dentro de [desde, hasta). */
  private base(tipo: TipoVisita, desde: Date, hasta: Date) {
    return this.repo
      .createQueryBuilder('v')
      .where('v.tipo = :tipo', { tipo })
      .andWhere('v.created_at >= :desde AND v.created_at < :hasta', { desde, hasta });
  }

  async contar(tipo: TipoVisita, desde: Date, hasta: Date): Promise<Conteo> {
    const fila = await this.base(tipo, desde, hasta)
      .select('COUNT(*)', 'visitas')
      .addSelect('COUNT(DISTINCT v.visitante)', 'visitantes')
      .getRawOne<{ visitas: string; visitantes: string }>();
    return { visitas: n(fila?.visitas), visitantes: n(fila?.visitantes) };
  }

  /** Por día de Lima. Los días sin visitas no vienen (el servicio los completa con 0). */
  async porDia(desde: Date, hasta: Date): Promise<ConteoDia[]> {
    const dia = `to_char(v.created_at AT TIME ZONE '${ZONA}', 'YYYY-MM-DD')`;
    const filas = await this.base('pagina', desde, hasta)
      .select(dia, 'fecha')
      .addSelect('COUNT(*)', 'visitas')
      .addSelect('COUNT(DISTINCT v.visitante)', 'visitantes')
      .groupBy(dia)
      .orderBy('fecha', 'ASC')
      .getRawMany<{ fecha: string; visitas: string; visitantes: string }>();
    return filas.map((f) => ({ fecha: f.fecha, visitas: n(f.visitas), visitantes: n(f.visitantes) }));
  }

  /** Obras más vistas. Solo cuenta obras que existen (un enlace inventado no aparece). */
  async proyectos(desde: Date, hasta: Date, limite: number): Promise<ConteoProyecto[]> {
    const filas = await this.base('pagina', desde, hasta)
      .innerJoin(Project, 'p', 'p.slug = v.proyecto_slug')
      .select('p.slug', 'slug')
      .addSelect('p.titulo', 'titulo')
      .addSelect('COUNT(*)', 'visitas')
      .addSelect('COUNT(DISTINCT v.visitante)', 'visitantes')
      .groupBy('p.slug')
      .addGroupBy('p.titulo')
      .orderBy('visitas', 'DESC')
      .addOrderBy('p.titulo', 'ASC')
      .limit(limite)
      .getRawMany<{ slug: string; titulo: string; visitas: string; visitantes: string }>();
    return filas.map((f) => ({ slug: f.slug, titulo: f.titulo, visitas: n(f.visitas), visitantes: n(f.visitantes) }));
  }

  /** Páginas de la web que no son una obra (inicio, proyectos, empresas, cotizador…). */
  async paginas(desde: Date, hasta: Date): Promise<{ ruta: string; visitas: number }[]> {
    const filas = await this.base('pagina', desde, hasta)
      .andWhere('v.proyecto_slug IS NULL')
      .select('v.ruta', 'ruta')
      .addSelect('COUNT(*)', 'visitas')
      .groupBy('v.ruta')
      .orderBy('visitas', 'DESC')
      .getRawMany<{ ruta: string; visitas: string }>();
    return filas.map((f) => ({ ruta: f.ruta, visitas: n(f.visitas) }));
  }

  async origenes(desde: Date, hasta: Date, limite: number): Promise<{ origen: string; visitas: number }[]> {
    const filas = await this.base('pagina', desde, hasta)
      .select('v.origen', 'origen')
      .addSelect('COUNT(*)', 'visitas')
      .groupBy('v.origen')
      .orderBy('visitas', 'DESC')
      .addOrderBy('v.origen', 'ASC')
      .limit(limite)
      .getRawMany<{ origen: string; visitas: string }>();
    return filas.map((f) => ({ origen: f.origen, visitas: n(f.visitas) }));
  }

  async lugares(desde: Date, hasta: Date, limite: number): Promise<{ pais: string | null; ciudad: string | null; visitas: number }[]> {
    const filas = await this.base('pagina', desde, hasta)
      .select('v.pais', 'pais')
      .addSelect('v.ciudad', 'ciudad')
      .addSelect('COUNT(*)', 'visitas')
      .groupBy('v.pais')
      .addGroupBy('v.ciudad')
      .orderBy('visitas', 'DESC')
      .limit(limite)
      .getRawMany<{ pais: string | null; ciudad: string | null; visitas: string }>();
    return filas.map((f) => ({ pais: f.pais, ciudad: f.ciudad, visitas: n(f.visitas) }));
  }

  async dispositivos(desde: Date, hasta: Date): Promise<{ dispositivo: string; visitas: number }[]> {
    const filas = await this.base('pagina', desde, hasta)
      .select('v.dispositivo', 'dispositivo')
      .addSelect('COUNT(*)', 'visitas')
      .groupBy('v.dispositivo')
      .getRawMany<{ dispositivo: string; visitas: string }>();
    return filas.map((f) => ({ dispositivo: f.dispositivo, visitas: n(f.visitas) }));
  }

  /** Borra lo anterior a `antesDe`. Devuelve cuántas filas se fueron. */
  async purgarAntes(antesDe: Date): Promise<number> {
    const res = await this.repo.delete({ createdAt: LessThan(antesDe) });
    return res.affected ?? 0;
  }
}
