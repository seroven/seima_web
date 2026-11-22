import { randomUUID } from 'node:crypto';
import { conflict, notFound, validationError } from '../../common/errors/app-error';
import { env } from '../../config/env';
import type { CategoriesRepository } from '../categories/categories.repository';
import type { Category } from '../categories/category.entity';
import { borrarDeCloudinary } from '../uploads/cloudinary-destroy';
import type { UploadsService } from '../uploads/uploads.service';
import { sinAviso, type AvisoReconstruccion } from '../web-rebuild/web-rebuild.service';
import { faltantesParaPublicar, mensajeIncompatible, type MedioRegla } from './project-rules';
import type { ProjectMedia } from './project-media.entity';
import { toGestionDto, type ProjectGestionDto } from './projects.mapper';
import type { ProjectsRepository } from './projects.repository';
import type { ConfirmMediaInput, CreateMediaInput, CreateProjectInput, ReorderMediaInput, SetPairInput, UpdateProjectInput } from './projects.schemas';
import { slugify } from './slug';
import type { EstadoProyecto, Etapa } from './projects.types';

export interface Paged<T> {
  data: T[];
  meta: { page: number; limit: number; total: number; totalPages: number };
}

const aRegla = (m: ProjectMedia): MedioRegla => ({
  id: m.id,
  etapa: m.etapa,
  tipo: m.tipo,
  estado: m.estado,
  ancho: m.ancho,
  alto: m.alto,
  duracionMs: m.duracionMs,
  esPrincipal: m.esPrincipal,
  esPortada: m.esPortada,
});

/** Lo que Luis hace desde la app: crear, subir, comparar, publicar y ocultar. */
export class PanelProjectsService {
  constructor(
    private readonly repository: ProjectsRepository,
    private readonly categories: CategoriesRepository,
    private readonly uploads: UploadsService,
    private readonly rebuild: AvisoReconstruccion = sinAviso,
  ) {}

  async list(q: { estado?: EstadoProyecto; page: number; limit: number }): Promise<Paged<ProjectGestionDto>> {
    const [proyectos, total] = await this.repository.findGestionPage({
      estado: q.estado,
      skip: (q.page - 1) * q.limit,
      take: q.limit,
    });
    const portadas = await this.repository.findCoverPhotos(
      proyectos.map((p) => p.id),
      ['antes', 'despues'],
    );
    return {
      data: proyectos.map((p) => toGestionDto(p, portadas.filter((m) => m.projectId === p.id))),
      meta: { page: q.page, limit: q.limit, total, totalPages: Math.max(1, Math.ceil(total / q.limit)) },
    };
  }

  async get(id: string): Promise<ProjectGestionDto> {
    const proyecto = await this.proyecto(id);
    return toGestionDto(proyecto, await this.repository.findAllMedia(id));
  }

  async create(input: CreateProjectInput): Promise<ProjectGestionDto> {
    const categorias = await this.categoriasPedidas(input.categorias);
    const slug = await this.slugLibre(slugify(input.titulo));
    const guardado = await this.repository.save({
      slug,
      titulo: input.titulo,
      descripcion: input.descripcion ?? '',
      categorias,
      distrito: input.distrito ?? null,
      areaM2: input.areaM2 ?? null,
      dias: input.dias ?? null,
      servicios: input.servicios,
      destacado: input.destacado,
      cliente: input.cliente,
      estado: 'borrador',
    });
    const completo = await this.repository.findById(guardado.id);
    return toGestionDto(completo!, []);
  }

  async update(id: string, input: UpdateProjectInput): Promise<ProjectGestionDto> {
    const proyecto = await this.proyecto(id);
    const cambios: Parameters<ProjectsRepository['update']>[1] = {};
    if (input.titulo !== undefined) cambios.titulo = input.titulo;
    if (input.descripcion !== undefined) cambios.descripcion = input.descripcion;
    if (input.distrito !== undefined) cambios.distrito = input.distrito;
    if (input.areaM2 !== undefined) cambios.areaM2 = input.areaM2;
    if (input.dias !== undefined) cambios.dias = input.dias;
    if (input.servicios !== undefined) cambios.servicios = input.servicios;
    if (input.destacado !== undefined) cambios.destacado = input.destacado;
    if (input.cliente !== undefined) cambios.cliente = input.cliente;
    const categorias = input.categorias === undefined ? undefined : await this.categoriasPedidas(input.categorias);
    if (Object.keys(cambios).length) await this.repository.update(proyecto.id, cambios);
    if (categorias) await this.repository.setCategorias(proyecto.id, categorias);
    this.avisarSiPublicada(proyecto.estado, 'obra editada');
    return this.get(id);
  }

  /** Busca los tipos de trabajo pedidos; si alguno no existe, avisa cuál. */
  private async categoriasPedidas(slugs: string[]): Promise<Category[]> {
    const encontradas = await this.categories.findBySlugs(slugs);
    const faltan = slugs.filter((s) => !encontradas.some((c) => c.slug === s));
    if (faltan.length) {
      throw validationError(faltan.map((s) => ({ campo: 'categorias', mensaje: `El tipo de trabajo "${s}" no existe` })));
    }
    return encontradas;
  }

  async remove(id: string): Promise<void> {
    const proyecto = await this.proyecto(id);
    if (proyecto.estado !== 'borrador') throw conflict('Los proyectos publicados se ocultan, no se borran.');
    const medios = await this.repository.findAllMedia(id);
    for (const medio of medios) await borrarDeCloudinary(medio.cloudinaryId, medio.tipo);
    await this.repository.remove(id);
  }

  async setEstado(id: string, estado: EstadoProyecto): Promise<ProjectGestionDto> {
    const proyecto = await this.proyecto(id);
    if (proyecto.estado === estado) return this.get(id);
    if (estado === 'borrador') throw conflict('Un proyecto publicado se oculta. No vuelve a borrador.');
    if (estado === 'oculto' && proyecto.estado === 'borrador') throw conflict('Un borrador todavía no se puede ocultar. Publícalo o bórralo.');
    if (estado === 'publicado') {
      const faltan = faltantesParaPublicar((await this.repository.findAllMedia(id)).map(aRegla));
      if (faltan.length) throw validationError(faltan.map((mensaje) => ({ campo: 'estado', mensaje })));
    }
    await this.repository.update(id, { estado });
    // Se ve en la web si pasa a publicada o si deja de estarlo.
    if (estado === 'publicado') this.rebuild.solicitar('obra publicada');
    else if (proyecto.estado === 'publicado') this.rebuild.solicitar('obra oculta');
    return this.get(id);
  }

  async setComparador(id: string, input: SetPairInput): Promise<ProjectGestionDto> {
    const proyecto = await this.proyecto(id);
    const antes = await this.medioDelProyecto(id, input.antesId, 'antes');
    const despues = await this.medioDelProyecto(id, input.despuesId, 'despues');
    const porque = mensajeIncompatible(aRegla(antes), aRegla(despues));
    if (porque) throw validationError([{ campo: 'comparador', mensaje: porque }]);
    await this.repository.setComparador(id, antes.id, despues.id);
    this.avisarSiPublicada(proyecto.estado, 'comparación cambiada');
    return this.get(id);
  }

  async setPortada(id: string, input: SetPairInput): Promise<ProjectGestionDto> {
    const proyecto = await this.proyecto(id);
    const antes = await this.medioDelProyecto(id, input.antesId, 'antes');
    const despues = await this.medioDelProyecto(id, input.despuesId, 'despues');
    for (const medio of [antes, despues]) {
      if (medio.tipo !== 'foto') throw validationError([{ campo: 'portada', mensaje: 'La portada solo puede ser una foto.' }]);
      if (medio.estado !== 'listo') throw validationError([{ campo: 'portada', mensaje: 'Espera a que terminen de subirse.' }]);
    }
    await this.repository.setPortada(id, antes.id, despues.id);
    this.avisarSiPublicada(proyecto.estado, 'portada cambiada');
    return this.get(id);
  }

  async crearMedio(projectId: string, input: CreateMediaInput) {
    await this.proyecto(projectId);
    const id = randomUUID();
    const folder = `${env.CLOUDINARY_PROJECTS_FOLDER}/${projectId}`;
    const cloudinaryId = `${folder}/${id}`;
    const orden = await this.repository.nextOrden(projectId, input.etapa);
    const medio = await this.repository.insertMedia({
      id,
      projectId,
      etapa: input.etapa,
      tipo: input.tipo,
      cloudinaryId,
      orden,
      estado: 'subiendo',
      esPrincipal: false,
      esPortada: false,
      pie: input.pie ?? null,
      ancho: null,
      alto: null,
      duracionMs: null,
    });
    return { medio: toGestionDto((await this.proyecto(projectId))!, [medio]).medios[input.etapa][0], firma: this.uploads.signProjectMedia(cloudinaryId, input.tipo) };
  }

  async confirmarMedio(projectId: string, medioId: string, input: ConfirmMediaInput): Promise<ProjectGestionDto> {
    const proyecto = await this.proyecto(projectId);
    const medio = await this.medioDelProyecto(projectId, medioId);
    if (input.cloudinaryId !== medio.cloudinaryId) {
      throw validationError([{ campo: 'cloudinaryId', mensaje: 'El archivo no está en la carpeta de este proyecto.' }]);
    }
    if (medio.tipo === 'video') {
      if (input.duracionMs == null) throw validationError([{ campo: 'duracionMs', mensaje: 'Falta la duración del video.' }]);
      if (input.duracionMs > 60_000) throw validationError([{ campo: 'duracionMs', mensaje: 'El video de la galería dura como máximo 60 segundos.' }]);
    }
    if (medio.estado === 'subiendo') {
      await this.repository.updateMedia(medio.id, {
        estado: 'listo',
        ancho: input.ancho,
        alto: input.alto,
        duracionMs: medio.tipo === 'video' ? input.duracionMs! : null,
      });
      this.avisarSiPublicada(proyecto.estado, 'archivo agregado');
    }
    return this.get(projectId);
  }

  async borrarMedio(projectId: string, medioId: string): Promise<ProjectGestionDto> {
    const proyecto = await this.proyecto(projectId);
    const medio = await this.medioDelProyecto(projectId, medioId);
    if (medio.esPrincipal || medio.esPortada) {
      const cual = [medio.esPrincipal ? 'la comparación' : null, medio.esPortada ? 'la portada' : null].filter(Boolean).join(' y ');
      throw conflict(`Este archivo es ${cual}. Elige otro antes de quitarlo.`);
    }
    await borrarDeCloudinary(medio.cloudinaryId, medio.tipo);
    await this.repository.deleteMedia(medio.id);
    this.avisarSiPublicada(proyecto.estado, 'archivo quitado');
    return this.get(projectId);
  }

  async reordenar(projectId: string, input: ReorderMediaInput): Promise<ProjectGestionDto> {
    const proyecto = await this.proyecto(projectId);
    const actuales = (await this.repository.findAllMedia(projectId)).filter((m) => m.etapa === input.etapa);
    const esperados = new Set(actuales.map((m) => m.id));
    const recibidos = new Set(input.ids);
    const mismos = esperados.size === recibidos.size && [...esperados].every((id) => recibidos.has(id));
    if (!mismos) throw validationError([{ campo: 'ids', mensaje: 'El orden tiene que incluir todos los archivos de esa etapa.' }]);
    await this.repository.reordenar(projectId, input.etapa, input.ids);
    this.avisarSiPublicada(proyecto.estado, 'archivos reordenados');
    return this.get(projectId);
  }

  /** Solo importa si la obra ya se ve en la web: un borrador o una obra oculta no cambia lo que muestra. */
  private avisarSiPublicada(estado: EstadoProyecto, motivo: string): void {
    if (estado === 'publicado') this.rebuild.solicitar(motivo);
  }

  private async proyecto(id: string) {
    const proyecto = await this.repository.findById(id);
    if (!proyecto) throw notFound('El proyecto no existe');
    return proyecto;
  }

  private async medioDelProyecto(projectId: string, medioId: string, etapa?: Etapa) {
    const medio = await this.repository.findMediaById(medioId);
    if (!medio || medio.projectId !== projectId) throw notFound('El archivo no existe');
    if (etapa && medio.etapa !== etapa) {
      throw validationError([{ campo: 'etapa', mensaje: `Ese archivo no es de ${etapa === 'antes' ? 'Antes' : 'Después'}.` }]);
    }
    return medio;
  }

  private async slugLibre(base: string): Promise<string> {
    let slug = base;
    let n = 2;
    while (await this.repository.slugTaken(slug)) {
      const sufijo = `-${n++}`;
      slug = `${base.slice(0, 120 - sufijo.length)}${sufijo}`;
    }
    return slug;
  }
}
