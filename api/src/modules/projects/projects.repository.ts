import type { DataSource, Repository } from 'typeorm';
import { ProjectPhoto } from './project-photo.entity';
import { Project } from './project.entity';
import type { Etapa } from './projects.types';

export interface ProjectFilters {
  categoriaSlug?: string;
  destacado?: boolean;
  skip: number;
  take: number;
}

/** Único lugar que habla con la base para proyectos y sus fotos. */
export class ProjectsRepository {
  private readonly projects: Repository<Project>;
  private readonly photos: Repository<ProjectPhoto>;

  constructor(dataSource: DataSource) {
    this.projects = dataSource.getRepository(Project);
    this.photos = dataSource.getRepository(ProjectPhoto);
  }

  /** Proyectos publicados (con su categoría), los destacados primero y luego los más recientes. */
  findPublishedPage(f: ProjectFilters): Promise<[Project[], number]> {
    const qb = this.projects
      .createQueryBuilder('p')
      .innerJoinAndSelect('p.categoria', 'c')
      .where('p.publicado = true')
      .andWhere('c.activo = true');
    if (f.categoriaSlug) qb.andWhere('c.slug = :slug', { slug: f.categoriaSlug });
    if (f.destacado !== undefined) qb.andWhere('p.destacado = :destacado', { destacado: f.destacado });
    return qb.orderBy('p.destacado', 'DESC').addOrderBy('p.createdAt', 'DESC').skip(f.skip).take(f.take).getManyAndCount();
  }

  findPublishedBySlug(slug: string): Promise<Project | null> {
    return this.projects.findOne({ where: { slug, publicado: true, categoria: { activo: true } }, relations: { categoria: true } });
  }

  /** Todas las fotos de un proyecto, ordenadas por etapa y orden. */
  findPhotos(projectId: string): Promise<ProjectPhoto[]> {
    return this.photos.find({ where: { projectId }, order: { etapa: 'ASC', orden: 'ASC' } });
  }

  /**
   * Foto de portada por proyecto y etapa: la principal si existe; si no, la primera por orden.
   * (DISTINCT ON deja una fila por (proyecto, etapa) respetando ese orden.)
   */
  findCoverPhotos(projectIds: string[], etapas: Etapa[]): Promise<ProjectPhoto[]> {
    if (projectIds.length === 0) return Promise.resolve([]);
    return this.photos
      .createQueryBuilder('f')
      .distinctOn(['f.projectId', 'f.etapa'])
      .where('f.projectId IN (:...ids)', { ids: projectIds })
      .andWhere('f.etapa IN (:...etapas)', { etapas })
      .orderBy('f.projectId')
      .addOrderBy('f.etapa')
      .addOrderBy('f.esPrincipal', 'DESC')
      .addOrderBy('f.orden', 'ASC')
      .getMany();
  }
}
