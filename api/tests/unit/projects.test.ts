import { describe, expect, it, vi } from 'vitest';
import type { AppError } from '../../src/common/errors/app-error';
import type { CategoriesRepository } from '../../src/modules/categories/categories.repository';
import { CategoriesService } from '../../src/modules/categories/categories.service';
import type { ProjectPhoto } from '../../src/modules/projects/project-photo.entity';
import type { Project } from '../../src/modules/projects/project.entity';
import { toCardDto, toDetailDto, toPhotoDto } from '../../src/modules/projects/projects.mapper';
import type { ProjectsRepository } from '../../src/modules/projects/projects.repository';
import { listProjectsQuerySchema, projectSlugParamsSchema } from '../../src/modules/projects/projects.schemas';
import { ProjectsService } from '../../src/modules/projects/projects.service';
import { rejected } from './fakes';

function proyecto(p: Partial<Project> = {}): Project {
  return {
    id: 'p1', slug: 'cocina-x', titulo: 'Cocina X', descripcion: 'Desc', distrito: 'Comas', areaM2: 12, dias: 5,
    servicios: ['cocina'], destacado: false, cliente: 'persona', publicado: true,
    categoria: { slug: 'cocinas', nombre: 'Cocinas' }, createdAt: new Date('2026-01-02T03:04:05Z'), ...p,
  } as Project;
}

let n = 0;
function foto(f: Partial<ProjectPhoto> = {}): ProjectPhoto {
  n += 1;
  return { id: `f${n}`, projectId: 'p1', etapa: 'despues', orden: n, esPrincipal: false, pie: null, ancho: null, alto: null, cloudinaryId: `obras/f${n}`, ...f } as ProjectPhoto;
}

describe('toPhotoDto', () => {
  it('expone los campos públicos y arma la URL de Cloudinary', () => {
    const dto = toPhotoDto(foto({ id: 'a', cloudinaryId: 'obras/a', pie: 'Mesada', ancho: 800, alto: 600, esPrincipal: true }));
    expect(dto).toEqual({
      id: 'a', etapa: 'despues', orden: expect.any(Number), esPrincipal: true, pie: 'Mesada', ancho: 800, alto: 600,
      cloudinaryId: 'obras/a', url: 'https://res.cloudinary.com/demo-cloud/image/upload/f_auto,q_auto/obras/a',
    });
  });
  it('fotos de prueba (demo/…): url null', () => {
    expect(toPhotoDto(foto({ cloudinaryId: 'demo/x' })).url).toBeNull();
  });
});

describe('toCardDto', () => {
  it('trae la portada antes/después y no incluye la galería', () => {
    const dto = toCardDto(proyecto(), [foto({ etapa: 'antes', id: 'A' }), foto({ etapa: 'despues', id: 'D' })]);
    expect(dto.portada.antes?.id).toBe('A');
    expect(dto.portada.despues?.id).toBe('D');
    expect(dto).not.toHaveProperty('fotos');
    expect(dto).not.toHaveProperty('descripcion');
    expect(dto.categoria).toEqual({ slug: 'cocinas', nombre: 'Cocinas' });
  });
  it('portada null donde no hay foto', () => {
    expect(toCardDto(proyecto(), []).portada).toEqual({ antes: null, despues: null });
  });
});

describe('toDetailDto', () => {
  it('agrupa por etapa conservando el orden y deja vacías las etapas sin fotos', () => {
    const dto = toDetailDto(proyecto(), [foto({ etapa: 'antes', id: 'a1' }), foto({ etapa: 'despues', id: 'd1' }), foto({ etapa: 'despues', id: 'd2' })]);
    expect(dto.fotos.antes.map((f) => f.id)).toEqual(['a1']);
    expect(dto.fotos.durante).toEqual([]);
    expect(dto.fotos.despues.map((f) => f.id)).toEqual(['d1', 'd2']);
    expect(dto.creadoEn).toBe('2026-01-02T03:04:05.000Z');
    expect(dto.descripcion).toBe('Desc');
  });

  it('la portada es la principal marcada, aunque no sea la primera', () => {
    const dto = toDetailDto(proyecto(), [foto({ etapa: 'despues', id: 'd1' }), foto({ etapa: 'despues', id: 'd2', esPrincipal: true })]);
    expect(dto.portada.despues?.id).toBe('d2');
  });

  it('sin principal marcada, la portada es la primera de la etapa', () => {
    const dto = toDetailDto(proyecto(), [foto({ etapa: 'antes', id: 'a1' }), foto({ etapa: 'antes', id: 'a2' })]);
    expect(dto.portada.antes?.id).toBe('a1');
    expect(dto.portada.despues).toBeNull();
  });
});

describe('listProjectsQuerySchema', () => {
  it('valores por defecto', () => {
    expect(listProjectsQuerySchema.parse({})).toEqual({ page: 1, limit: 50, categoria: undefined });
  });
  it('acepta categoria y el alias category (categoria tiene prioridad)', () => {
    expect(listProjectsQuerySchema.parse({ category: 'banos' }).categoria).toBe('banos');
    expect(listProjectsQuerySchema.parse({ categoria: 'cocinas', category: 'banos' }).categoria).toBe('cocinas');
  });
  it('convierte textos a números y booleanos', () => {
    expect(listProjectsQuerySchema.parse({ page: '2', limit: '10', destacado: 'true' })).toMatchObject({ page: 2, limit: 10, destacado: true });
    expect(listProjectsQuerySchema.parse({ destacado: 'false' }).destacado).toBe(false);
  });
  it.each([[{ page: '0' }], [{ limit: '101' }], [{ limit: 'x' }], [{ destacado: 'quizas' }], [{ categoria: 'Mala Categoria' }], [{ page: '1.5' }]])('rechaza %j', (q) => {
    expect(listProjectsQuerySchema.safeParse(q).success).toBe(false);
  });
});

describe('projectSlugParamsSchema', () => {
  it.each(['cocina', 'cocina-drywall-2', 'a'])('acepta %s', (slug) => expect(projectSlugParamsSchema.safeParse({ slug }).success).toBe(true));
  it.each(['', 'Cocina', 'cocina_x', '-x', 'x-', 'a--b', 'a b', '../etc', 'x'.repeat(121)])('rechaza %j', (slug) =>
    expect(projectSlugParamsSchema.safeParse({ slug }).success).toBe(false),
  );
});

describe('ProjectsService', () => {
  function repo(proyectos: Project[], total = proyectos.length, portadas: ProjectPhoto[] = []) {
    return {
      findPublishedPage: vi.fn().mockResolvedValue([proyectos, total]),
      findCoverPhotos: vi.fn().mockResolvedValue(portadas),
      findPublishedBySlug: vi.fn().mockResolvedValue(proyectos[0] ?? null),
      findPhotos: vi.fn().mockResolvedValue(portadas),
    };
  }
  const svc = (r: ReturnType<typeof repo>) => new ProjectsService(r as unknown as ProjectsRepository);

  it('list: calcula skip/take, pide las portadas en UNA sola consulta y las reparte por proyecto', async () => {
    const r = repo([proyecto({ id: 'p1', slug: 'a' }), proyecto({ id: 'p2', slug: 'b' })], 23, [
      foto({ projectId: 'p1', etapa: 'despues', id: 'x1' }),
      foto({ projectId: 'p2', etapa: 'antes', id: 'x2' }),
    ]);
    const res = await svc(r).list({ page: 3, limit: 10, categoria: 'cocinas', destacado: true });
    expect(r.findPublishedPage).toHaveBeenCalledWith({ categoriaSlug: 'cocinas', destacado: true, skip: 20, take: 10 });
    expect(r.findCoverPhotos).toHaveBeenCalledOnce();
    expect(r.findCoverPhotos).toHaveBeenCalledWith(['p1', 'p2'], ['antes', 'despues']);
    expect(res.meta).toEqual({ page: 3, limit: 10, total: 23, totalPages: 3 });
    expect(res.data[0].portada.despues?.id).toBe('x1');
    expect(res.data[0].portada.antes).toBeNull();
    expect(res.data[1].portada.antes?.id).toBe('x2');
  });

  it('list: sin resultados, totalPages mínimo 1', async () => {
    const res = await svc(repo([], 0)).list({ page: 1, limit: 50, categoria: undefined });
    expect(res.data).toEqual([]);
    expect(res.meta.totalPages).toBe(1);
  });

  it('getBySlug: devuelve la ficha con su galería', async () => {
    const r = repo([proyecto()], 1, [foto({ etapa: 'antes', id: 'a1' })]);
    const dto = await svc(r).getBySlug('cocina-x');
    expect(r.findPublishedBySlug).toHaveBeenCalledWith('cocina-x');
    expect(r.findPhotos).toHaveBeenCalledWith('p1');
    expect(dto.fotos.antes).toHaveLength(1);
  });

  it('getBySlug: 404 si no existe y ni consulta fotos', async () => {
    const r = repo([]);
    const e = (await rejected(svc(r).getBySlug('nada'))) as AppError;
    expect(e.status).toBe(404);
    expect(r.findPhotos).not.toHaveBeenCalled();
  });
});

describe('CategoriesService', () => {
  it('expone solo slug, nombre y orden', async () => {
    const repoCat = { findActive: vi.fn().mockResolvedValue([{ id: 'x', slug: 'banos', nombre: 'Baños', orden: 2, activa: true }]) };
    const res = await new CategoriesService(repoCat as unknown as CategoriesRepository).list();
    expect(res).toEqual([{ slug: 'banos', nombre: 'Baños', orden: 2 }]);
  });
});
