import { notFound } from '../../common/errors/app-error';
import { toCardDto, toDetailDto, type ProjectCardDto, type ProjectDetailDto } from './projects.mapper';
import type { ProjectsRepository } from './projects.repository';
import type { ListProjectsQuery } from './projects.schemas';

export interface Paged<T> {
  data: T[];
  meta: { page: number; limit: number; total: number; totalPages: number };
}

/** Lógica de negocio de proyectos: qué se muestra y cómo se compone (la base la consulta el repositorio). */
export class ProjectsService {
  constructor(private readonly repository: ProjectsRepository) {}

  async list(q: ListProjectsQuery): Promise<Paged<ProjectCardDto>> {
    const [proyectos, total] = await this.repository.findPublishedPage({
      categoriaSlug: q.categoria,
      destacado: q.destacado,
      skip: (q.page - 1) * q.limit,
      take: q.limit,
    });
    // Una sola consulta extra para todas las portadas (evita N+1)
    const portadas = await this.repository.findCoverPhotos(
      proyectos.map((p) => p.id),
      ['antes', 'despues'],
    );
    return {
      data: proyectos.map((p) =>
        toCardDto(
          p,
          portadas.filter((f) => f.projectId === p.id),
        ),
      ),
      meta: { page: q.page, limit: q.limit, total, totalPages: Math.max(1, Math.ceil(total / q.limit)) },
    };
  }

  async getBySlug(slug: string): Promise<ProjectDetailDto> {
    const proyecto = await this.repository.findPublishedBySlug(slug);
    if (!proyecto) throw notFound('El proyecto no existe');
    const medios = await this.repository.findReadyMedia(proyecto.id);
    return toDetailDto(proyecto, medios);
  }
}
