import { In, type DataSource, type Repository } from 'typeorm';
import { ProjectMedia } from './project-media.entity';
import { Project } from './project.entity';
import type { EstadoProyecto, Etapa } from './projects.types';

export interface ProjectFilters {
  categoriaSlug?: string;
  destacado?: boolean;
  skip: number;
  take: number;
}

export interface GestionFilters {
  estado?: EstadoProyecto;
  skip: number;
  take: number;
}

/** Único lugar que habla con la base para proyectos y sus medios. */
export class ProjectsRepository {
  private readonly projects: Repository<Project>;
  private readonly media: Repository<ProjectMedia>;

  constructor(private readonly dataSource: DataSource) {
    this.projects = dataSource.getRepository(Project);
    this.media = dataSource.getRepository(ProjectMedia);
  }

  /** Proyectos publicados (con su categoría), los destacados primero y luego los más recientes. */
  findPublishedPage(f: ProjectFilters): Promise<[Project[], number]> {
    const qb = this.projects
      .createQueryBuilder('p')
      .innerJoinAndSelect('p.categoria', 'c')
      .where('p.estado = :estado', { estado: 'publicado' })
      .andWhere('c.activo = true');
    if (f.categoriaSlug) qb.andWhere('c.slug = :slug', { slug: f.categoriaSlug });
    if (f.destacado !== undefined) qb.andWhere('p.destacado = :destacado', { destacado: f.destacado });
    return qb.orderBy('p.destacado', 'DESC').addOrderBy('p.createdAt', 'DESC').skip(f.skip).take(f.take).getManyAndCount();
  }

  findPublishedBySlug(slug: string): Promise<Project | null> {
    return this.projects.findOne({ where: { slug, estado: 'publicado', categoria: { activo: true } }, relations: { categoria: true } });
  }

  findGestionPage(f: GestionFilters): Promise<[Project[], number]> {
    const qb = this.projects.createQueryBuilder('p').innerJoinAndSelect('p.categoria', 'c');
    if (f.estado) qb.where('p.estado = :estado', { estado: f.estado });
    return qb.orderBy('p.updatedAt', 'DESC').skip(f.skip).take(f.take).getManyAndCount();
  }

  findById(id: string): Promise<Project | null> {
    return this.projects.findOne({ where: { id }, relations: { categoria: true } });
  }

  slugTaken(slug: string): Promise<boolean> {
    return this.projects.existsBy({ slug });
  }

  save(data: Partial<Project> & Pick<Project, 'slug' | 'titulo' | 'descripcion' | 'categoriaId'>): Promise<Project> {
    return this.projects.save(this.projects.create(data));
  }

  async update(id: string, data: Partial<Project>): Promise<void> {
    await this.projects.update(id, data);
  }

  async remove(id: string): Promise<void> {
    await this.projects.delete(id);
  }

  /** Medios ya subidos, para la web. */
  findReadyMedia(projectId: string): Promise<ProjectMedia[]> {
    return this.media.find({ where: { projectId, estado: 'listo' }, order: { etapa: 'ASC', orden: 'ASC' } });
  }

  /** Todos, también los que se están subiendo. Para la app. */
  findAllMedia(projectId: string): Promise<ProjectMedia[]> {
    return this.media.find({ where: { projectId }, order: { etapa: 'ASC', orden: 'ASC' } });
  }

  findMediaById(id: string): Promise<ProjectMedia | null> {
    return this.media.findOne({ where: { id } });
  }

  /** Fotos de portada (`es_portada`) de los proyectos indicados. */
  findCoverPhotos(projectIds: string[], etapas: Etapa[]): Promise<ProjectMedia[]> {
    if (projectIds.length === 0) return Promise.resolve([]);
    return this.media.find({
      where: { projectId: In(projectIds), etapa: In(etapas), esPortada: true, tipo: 'foto', estado: 'listo' },
    });
  }

  async nextOrden(projectId: string, etapa: Etapa): Promise<number> {
    const row = await this.media
      .createQueryBuilder('m')
      .select('COALESCE(MAX(m.orden), -1)', 'max')
      .where('m.projectId = :projectId AND m.etapa = :etapa', { projectId, etapa })
      .getRawOne<{ max: string }>();
    return Number(row?.max ?? -1) + 1;
  }

  insertMedia(data: Partial<ProjectMedia> & Pick<ProjectMedia, 'id' | 'projectId' | 'etapa' | 'tipo' | 'cloudinaryId' | 'orden'>): Promise<ProjectMedia> {
    return this.media.save(this.media.create(data));
  }

  async updateMedia(id: string, data: Partial<ProjectMedia>): Promise<void> {
    await this.media.update(id, data);
  }

  async deleteMedia(id: string): Promise<void> {
    await this.media.delete(id);
  }

  /** Quita el comparador anterior y marca el par nuevo, en una sola transacción. */
  async setComparador(projectId: string, antesId: string, despuesId: string): Promise<void> {
    await this.dataSource.transaction(async (m) => {
      await m
        .createQueryBuilder()
        .update(ProjectMedia)
        .set({ esPrincipal: false })
        .where('project_id = :projectId AND etapa IN (:...etapas)', { projectId, etapas: ['antes', 'despues'] })
        .execute();
      await m.update(ProjectMedia, { id: antesId, projectId }, { esPrincipal: true });
      await m.update(ProjectMedia, { id: despuesId, projectId }, { esPrincipal: true });
    });
  }

  /** Quita la portada anterior y marca el par de fotos nuevo, en una sola transacción. */
  async setPortada(projectId: string, antesId: string, despuesId: string): Promise<void> {
    await this.dataSource.transaction(async (m) => {
      await m
        .createQueryBuilder()
        .update(ProjectMedia)
        .set({ esPortada: false })
        .where('project_id = :projectId AND etapa IN (:...etapas)', { projectId, etapas: ['antes', 'despues'] })
        .execute();
      await m.update(ProjectMedia, { id: antesId, projectId }, { esPortada: true });
      await m.update(ProjectMedia, { id: despuesId, projectId }, { esPortada: true });
    });
  }

  async reordenar(projectId: string, etapa: Etapa, ids: string[]): Promise<void> {
    await this.dataSource.transaction(async (m) => {
      for (let orden = 0; orden < ids.length; orden++) {
        await m.update(ProjectMedia, { id: ids[orden], projectId, etapa }, { orden });
      }
    });
  }
}
