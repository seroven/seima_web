import { conflict, notFound, validationError } from '../../common/errors/app-error';
import { slugify, slugUnico } from '../../common/utils/slug';
import { sinAviso, type AvisoReconstruccion } from '../web-rebuild/web-rebuild.service';
import type { CategoriesRepository } from './categories.repository';
import type { CreateCategoryInput, UpdateCategoryInput } from './categories.schemas';
import type { Category } from './category.entity';

export interface CategoriaGestionDto {
  id: string;
  slug: string;
  nombre: string;
  orden: number;
  activo: boolean;
  /** Cuántas obras (también borradores y ocultas) tienen este tipo de trabajo. */
  obras: number;
}

const SLUG_MAX = 60;

const toDto = (c: Category): CategoriaGestionDto => ({ id: c.id, slug: c.slug, nombre: c.nombre, orden: c.orden, activo: c.activo, obras: c.obras ?? 0 });

/** Lo que Luis hace desde la app con los tipos de trabajo: crear, renombrar, ordenar y desactivar. */
export class CategoriesPanelService {
  constructor(
    private readonly repository: CategoriesRepository,
    // Los tipos de trabajo (nombre, orden, si están activos) salen en los filtros de la web.
    private readonly rebuild: AvisoReconstruccion = sinAviso,
  ) {}

  async list(): Promise<CategoriaGestionDto[]> {
    return (await this.repository.findAllWithCounts()).map(toDto);
  }

  async create(input: CreateCategoryInput): Promise<CategoriaGestionDto> {
    if (await this.repository.findByNombre(input.nombre)) throw conflict('Ya existe un tipo de trabajo con ese nombre.');
    const slug = await slugUnico(slugify(input.nombre, { max: SLUG_MAX, vacio: 'tipo' }), (s) => this.repository.slugTaken(s), SLUG_MAX);
    const guardada = await this.repository.save({ slug, nombre: input.nombre, orden: await this.repository.nextOrden(), activo: true });
    this.rebuild.solicitar('tipo de trabajo creado');
    return toDto((await this.repository.findByIdWithCount(guardada.id))!);
  }

  /** El slug no cambia al renombrar: la web y los enlaces (`?categoria=`) dependen de él. */
  async update(id: string, input: UpdateCategoryInput): Promise<CategoriaGestionDto> {
    const actual = await this.repository.findByIdWithCount(id);
    if (!actual) throw notFound('Ese tipo de trabajo no existe.');
    if (input.nombre !== undefined && input.nombre.toLowerCase() !== actual.nombre.toLowerCase()) {
      const otra = await this.repository.findByNombre(input.nombre);
      if (otra && otra.id !== id) throw conflict('Ya existe un tipo de trabajo con ese nombre.');
    }
    const cambios: Partial<Pick<Category, 'nombre' | 'activo'>> = {};
    if (input.nombre !== undefined) cambios.nombre = input.nombre;
    if (input.activo !== undefined) cambios.activo = input.activo;
    await this.repository.update(id, cambios);
    this.rebuild.solicitar('tipo de trabajo editado');
    return toDto((await this.repository.findByIdWithCount(id))!);
  }

  async reorder(ids: string[]): Promise<CategoriaGestionDto[]> {
    if (new Set(ids).size !== ids.length) throw validationError([{ campo: 'ids', mensaje: 'Hay tipos repetidos en la lista' }]);
    if ((await this.repository.countByIds(ids)) !== ids.length) throw validationError([{ campo: 'ids', mensaje: 'Algún tipo de trabajo no existe' }]);
    await this.repository.reorder(ids);
    this.rebuild.solicitar('tipos de trabajo reordenados');
    return this.list();
  }
}
