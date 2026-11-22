import { describe, expect, it, vi } from 'vitest';
import type { AppError } from '../../src/common/errors/app-error';
import type { CategoriesRepository } from '../../src/modules/categories/categories.repository';
import type { Category } from '../../src/modules/categories/category.entity';
import type { Project } from '../../src/modules/projects/project.entity';
import { PanelProjectsService } from '../../src/modules/projects/projects-panel.service';
import { categoriasDe, toCardDto, toGestionDto } from '../../src/modules/projects/projects.mapper';
import type { ProjectsRepository } from '../../src/modules/projects/projects.repository';
import { createProjectSchema, updateProjectSchema } from '../../src/modules/projects/projects.schemas';
import type { UploadsService } from '../../src/modules/uploads/uploads.service';
import { rejected } from './fakes';

const cat = (slug: string, nombre: string, orden: number): Category => ({ id: `id-${slug}`, slug, nombre, orden, activo: true }) as Category;
const COCINAS = cat('cocinas', 'Cocinas', 1);
const BANOS = cat('banos', 'Baños', 2);
const MELAMINA = cat('melamina', 'Melamina', 4);

function proyecto(categorias: Category[]): Project {
  return {
    id: 'p1', slug: 'cocina-x', titulo: 'Cocina X', descripcion: 'Desc', distrito: null, areaM2: null, dias: null,
    servicios: [], destacado: false, cliente: 'persona', estado: 'borrador', categorias,
    createdAt: new Date('2026-01-02T03:04:05Z'), updatedAt: new Date('2026-01-02T03:04:05Z'),
  } as Project;
}

describe('varias categorías por obra (DTO)', () => {
  it('las ordena por el orden del catálogo y la principal es la primera', () => {
    const dto = toCardDto(proyecto([MELAMINA, COCINAS, BANOS]), []);
    expect(dto.categorias.map((c) => c.slug)).toEqual(['cocinas', 'banos', 'melamina']);
    expect(dto.categoria).toEqual({ slug: 'cocinas', nombre: 'Cocinas' });
  });
  it('con el mismo orden desempata por nombre', () => {
    const a = cat('a', 'Zeta', 1);
    const b = cat('b', 'Alfa', 1);
    expect(categoriasDe({ categorias: [a, b] }).map((c) => c.nombre)).toEqual(['Alfa', 'Zeta']);
  });
  it('la vista de gestión también trae todas', () => {
    expect(toGestionDto(proyecto([BANOS, COCINAS]), []).categorias).toHaveLength(2);
  });
  it('una obra sin categorías no rompe: cae en «Sin categoría»', () => {
    const dto = toCardDto(proyecto([]), []);
    expect(dto.categorias).toEqual([]);
    expect(dto.categoria.slug).toBe('sin-categoria');
  });
});

describe('esquema de categorías', () => {
  const base = { titulo: 'Cocina en Miraflores' };
  it('crear acepta de 1 a 4 y quita repetidas', () => {
    expect(createProjectSchema.parse({ ...base, categorias: ['cocinas'] }).categorias).toEqual(['cocinas']);
    expect(createProjectSchema.parse({ ...base, categorias: ['cocinas', 'banos', 'cocinas'] }).categorias).toEqual(['cocinas', 'banos']);
  });
  it.each([[[]], [['a', 'b', 'c', 'd', 'e']], [['Mala Categoria']], [[1]], ['cocinas']])('crear rechaza %j', (categorias) => {
    expect(createProjectSchema.safeParse({ ...base, categorias }).success).toBe(false);
  });
  it('crear exige al menos un tipo de trabajo', () => {
    expect(createProjectSchema.safeParse(base).success).toBe(false);
  });
  it('el campo viejo `categoria` ya no sirve', () => {
    expect(createProjectSchema.safeParse({ ...base, categoria: 'cocinas' }).success).toBe(false);
  });
  it('editar: categorias es opcional pero no puede quedar vacía', () => {
    expect(updateProjectSchema.safeParse({ titulo: 'Nuevo nombre' }).success).toBe(true);
    expect(updateProjectSchema.parse({ categorias: ['banos', 'melamina'] }).categorias).toEqual(['banos', 'melamina']);
    expect(updateProjectSchema.safeParse({ categorias: [] }).success).toBe(false);
  });
});

describe('PanelProjectsService con varias categorías', () => {
  function armar(existentes: Category[]) {
    const repo = {
      slugTaken: vi.fn().mockResolvedValue(false),
      save: vi.fn().mockImplementation(async (d: Partial<Project>) => ({ id: 'p1', ...d })),
      findById: vi.fn().mockImplementation(async () => proyecto(existentes)),
      findAllMedia: vi.fn().mockResolvedValue([]),
      update: vi.fn().mockResolvedValue(undefined),
      setCategorias: vi.fn().mockResolvedValue(undefined),
    };
    const categories = {
      findBySlugs: vi.fn().mockImplementation(async (slugs: string[]) => [COCINAS, BANOS, MELAMINA].filter((c) => slugs.includes(c.slug))),
    };
    const service = new PanelProjectsService(repo as unknown as ProjectsRepository, categories as unknown as CategoriesRepository, {} as UploadsService);
    return { repo, categories, service };
  }

  it('al crear guarda todas las categorías pedidas', async () => {
    const { repo, service } = armar([COCINAS, MELAMINA]);
    const dto = await service.create({ titulo: 'Cocina y muebles', categorias: ['cocinas', 'melamina'], servicios: [], cliente: 'persona', destacado: false });
    expect(repo.save).toHaveBeenCalledWith(expect.objectContaining({ categorias: [COCINAS, MELAMINA], estado: 'borrador' }));
    expect(dto.categorias.map((c) => c.slug)).toEqual(['cocinas', 'melamina']);
  });

  it('un tipo de trabajo que no existe se rechaza diciendo cuál', async () => {
    const { repo, service } = armar([]);
    const error = (await rejected(
      service.create({ titulo: 'Obra rara', categorias: ['cocinas', 'inventada'], servicios: [], cliente: 'persona', destacado: false }),
    )) as AppError;
    expect(error.status).toBe(422);
    expect(JSON.stringify(error.details)).toContain('inventada');
    expect(repo.save).not.toHaveBeenCalled();
  });

  it('al editar reemplaza las categorías sin tocar las otras columnas', async () => {
    const { repo, service } = armar([BANOS, MELAMINA]);
    await service.update('p1', { categorias: ['banos', 'melamina'] });
    expect(repo.setCategorias).toHaveBeenCalledWith('p1', [BANOS, MELAMINA]);
    expect(repo.update).not.toHaveBeenCalled();
  });

  it('al editar solo el título no toca las categorías', async () => {
    const { repo, service } = armar([COCINAS]);
    await service.update('p1', { titulo: 'Otro nombre' });
    expect(repo.update).toHaveBeenCalledWith('p1', { titulo: 'Otro nombre' });
    expect(repo.setCategorias).not.toHaveBeenCalled();
  });

  it('si una categoría de la edición no existe, no cambia nada', async () => {
    const { repo, service } = armar([COCINAS]);
    const error = (await rejected(service.update('p1', { titulo: 'X', categorias: ['inventada'] }))) as AppError;
    expect(error.status).toBe(422);
    expect(repo.update).not.toHaveBeenCalled();
    expect(repo.setCategorias).not.toHaveBeenCalled();
  });
});
