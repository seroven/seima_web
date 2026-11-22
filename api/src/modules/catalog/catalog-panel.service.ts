import { conflict, notFound, validationError } from '../../common/errors/app-error';
import { slugify, slugUnico } from '../../common/utils/slug';
import type { CatalogRepository } from './catalog.repository';
import type {
  CreateOptionInput,
  CreateQuestionInput,
  CreateServiceInput,
  UpdateOptionInput,
  UpdateQuestionInput,
  UpdateServiceInput,
} from './catalog.schemas';
import type { PreguntaTipo, TipoEntrada } from './catalog.types';
import type { OpcionPregunta } from './opcion-pregunta.entity';
import type { Pregunta } from './pregunta.entity';
import type { Servicio } from './servicio.entity';

export interface ServicioGestionDto {
  id: string;
  slug: string;
  nombre: string;
  icono: string;
  orden: number;
  activo: boolean;
  /** Cuántas preguntas activas se le hacen al cliente cuando elige este servicio. */
  preguntas: number;
}

export interface OpcionGestionDto {
  id: string;
  slug: string;
  etiqueta: string;
  descripcion: string | null;
  tipoEntrada: TipoEntrada;
  entradaAyuda: string | null;
  orden: number;
  activo: boolean;
}

export interface PreguntaGestionDto {
  id: string;
  slug: string;
  texto: string;
  etiqueta: string;
  tipo: PreguntaTipo;
  orden: number;
  activo: boolean;
  /** Servicios en los que se hace la pregunta. */
  servicios: { id: string; slug: string; nombre: string }[];
  opciones: OpcionGestionDto[];
  /** La web solo muestra una pregunta si tiene al menos una opción activa y un servicio activo. */
  visible: boolean;
}

const SERVICIO_SLUG_MAX = 40;
const PREGUNTA_SLUG_MAX = 60;
const OPCION_SLUG_MAX = 60;

const toOpcionDto = (o: OpcionPregunta): OpcionGestionDto => ({
  id: o.id,
  slug: o.slug,
  etiqueta: o.etiqueta,
  descripcion: o.descripcion,
  tipoEntrada: o.tipoEntrada,
  entradaAyuda: o.entradaAyuda,
  orden: o.orden,
  activo: o.activo,
});

const toPreguntaDto = (p: Pregunta): PreguntaGestionDto => {
  const opciones = [...(p.opciones ?? [])].sort((a, b) => a.orden - b.orden);
  const servicios = [...(p.servicios ?? [])].sort((a, b) => a.orden - b.orden);
  return {
    id: p.id,
    slug: p.slug,
    texto: p.texto,
    etiqueta: p.etiqueta,
    tipo: p.tipo,
    orden: p.orden,
    activo: p.activo,
    servicios: servicios.map((s) => ({ id: s.id, slug: s.slug, nombre: s.nombre })),
    opciones: opciones.map(toOpcionDto),
    visible: p.activo && opciones.some((o) => o.activo) && servicios.some((s) => s.activo),
  };
};

const sinRepetidos = (ids: string[]) => new Set(ids).size === ids.length;

/**
 * Lo que Luis hace desde la app con el cotizador: servicios, preguntas de cada servicio y sus opciones.
 * Nada se borra (hay cotizaciones guardadas que apuntan a estas filas): lo que ya no se quiere se desactiva.
 */
export class CatalogPanelService {
  constructor(private readonly repository: CatalogRepository) {}

  // ---- Servicios ----

  async listServices(): Promise<ServicioGestionDto[]> {
    const [servicios, preguntas] = await Promise.all([this.repository.findAllServices(), this.repository.findAllQuestions()]);
    const activas = preguntas.filter((p) => p.activo);
    return servicios.map((s) => this.toServicioDto(s, activas.filter((p) => p.servicios.some((x) => x.id === s.id)).length));
  }

  async createService(input: CreateServiceInput): Promise<ServicioGestionDto> {
    if (await this.repository.findServiceByNombre(input.nombre)) throw conflict('Ya existe un servicio con ese nombre.');
    const slug = await slugUnico(slugify(input.nombre, { max: SERVICIO_SLUG_MAX, vacio: 'servicio' }), (s) => this.repository.serviceSlugTaken(s), SERVICIO_SLUG_MAX);
    const guardado = await this.repository.saveService({ slug, nombre: input.nombre, icono: input.icono, orden: await this.repository.nextServiceOrden(), activo: true });
    return this.toServicioDto(guardado, 0);
  }

  /** El slug no cambia al renombrar: la web y las cotizaciones guardadas dependen de él. */
  async updateService(id: string, input: UpdateServiceInput): Promise<ServicioGestionDto> {
    const actual = await this.repository.findServiceById(id);
    if (!actual) throw notFound('Ese servicio no existe.');
    if (input.nombre !== undefined && input.nombre.toLowerCase() !== actual.nombre.toLowerCase()) {
      const otro = await this.repository.findServiceByNombre(input.nombre);
      if (otro && otro.id !== id) throw conflict('Ya existe un servicio con ese nombre.');
    }
    const cambios: Parameters<CatalogRepository['updateService']>[1] = {};
    if (input.nombre !== undefined) cambios.nombre = input.nombre;
    if (input.icono !== undefined) cambios.icono = input.icono;
    if (input.activo !== undefined) cambios.activo = input.activo;
    await this.repository.updateService(id, cambios);
    const servicio = (await this.repository.findServiceById(id))!;
    const preguntas = (await this.repository.findAllQuestions()).filter((p) => p.activo && p.servicios.some((s) => s.id === id)).length;
    return this.toServicioDto(servicio, preguntas);
  }

  async reorderServices(ids: string[]): Promise<ServicioGestionDto[]> {
    if (!sinRepetidos(ids)) throw validationError([{ campo: 'ids', mensaje: 'Hay servicios repetidos en la lista' }]);
    if ((await this.repository.countServicesByIds(ids)) !== ids.length) throw validationError([{ campo: 'ids', mensaje: 'Algún servicio no existe' }]);
    await this.repository.reorderServices(ids);
    return this.listServices();
  }

  // ---- Preguntas ----

  async listQuestions(): Promise<PreguntaGestionDto[]> {
    return (await this.repository.findAllQuestions()).map(toPreguntaDto);
  }

  async getQuestion(id: string): Promise<PreguntaGestionDto> {
    return toPreguntaDto(await this.pregunta(id));
  }

  async createQuestion(input: CreateQuestionInput): Promise<PreguntaGestionDto> {
    const servicios = await this.serviciosPedidos(input.servicios);
    const slug = await slugUnico(slugify(input.etiqueta, { max: PREGUNTA_SLUG_MAX, vacio: 'pregunta' }), (s) => this.repository.questionSlugTaken(s), PREGUNTA_SLUG_MAX);
    const guardada = await this.repository.saveQuestion({
      slug,
      texto: input.texto,
      etiqueta: input.etiqueta,
      tipo: input.tipo,
      orden: await this.repository.nextQuestionOrden(),
      activo: true,
      servicios,
    });
    return this.getQuestion(guardada.id);
  }

  async updateQuestion(id: string, input: UpdateQuestionInput): Promise<PreguntaGestionDto> {
    await this.pregunta(id);
    const servicios = input.servicios === undefined ? undefined : await this.serviciosPedidos(input.servicios);
    const cambios: Parameters<CatalogRepository['updateQuestion']>[1] = {};
    if (input.texto !== undefined) cambios.texto = input.texto;
    if (input.etiqueta !== undefined) cambios.etiqueta = input.etiqueta;
    if (input.tipo !== undefined) cambios.tipo = input.tipo;
    if (input.activo !== undefined) cambios.activo = input.activo;
    if (Object.keys(cambios).length) await this.repository.updateQuestion(id, cambios);
    if (servicios) await this.repository.setQuestionServices(id, servicios);
    return this.getQuestion(id);
  }

  /** Acomoda estas preguntas entre sí sin mover las demás del cotizador. */
  async reorderQuestions(ids: string[]): Promise<PreguntaGestionDto[]> {
    if (!sinRepetidos(ids)) throw validationError([{ campo: 'ids', mensaje: 'Hay preguntas repetidas en la lista' }]);
    if ((await this.repository.countQuestionsByIds(ids)) !== ids.length) throw validationError([{ campo: 'ids', mensaje: 'Alguna pregunta no existe' }]);
    await this.repository.reorderQuestions(ids);
    return this.listQuestions();
  }

  // ---- Opciones ----

  async createOption(questionId: string, input: CreateOptionInput): Promise<PreguntaGestionDto> {
    await this.pregunta(questionId);
    const etiqueta = input.etiqueta;
    if ((await this.repository.findOptionsOfQuestion(questionId)).some((o) => o.etiqueta.toLowerCase() === etiqueta.toLowerCase())) {
      throw conflict('Esa pregunta ya tiene una opción con ese nombre.');
    }
    const slug = await slugUnico(slugify(etiqueta, { max: OPCION_SLUG_MAX, vacio: 'opcion' }), (s) => this.repository.optionSlugTaken(questionId, s), OPCION_SLUG_MAX);
    await this.repository.saveOption({
      questionId,
      slug,
      etiqueta,
      descripcion: input.descripcion ?? null,
      tipoEntrada: input.tipoEntrada,
      // La ayuda solo tiene sentido si la opción pide un dato más.
      entradaAyuda: input.tipoEntrada === 'ninguna' ? null : (input.entradaAyuda ?? null),
      orden: await this.repository.nextOptionOrden(questionId),
      activo: true,
    });
    return this.getQuestion(questionId);
  }

  async updateOption(id: string, input: UpdateOptionInput): Promise<PreguntaGestionDto> {
    const actual = await this.repository.findOptionById(id);
    if (!actual) throw notFound('Esa opción no existe.');
    if (input.etiqueta !== undefined && input.etiqueta.toLowerCase() !== actual.etiqueta.toLowerCase()) {
      const otras = await this.repository.findOptionsOfQuestion(actual.questionId);
      if (otras.some((o) => o.id !== id && o.etiqueta.toLowerCase() === input.etiqueta!.toLowerCase())) {
        throw conflict('Esa pregunta ya tiene una opción con ese nombre.');
      }
    }
    const cambios: Parameters<CatalogRepository['updateOption']>[1] = {};
    if (input.etiqueta !== undefined) cambios.etiqueta = input.etiqueta;
    if (input.descripcion !== undefined) cambios.descripcion = input.descripcion;
    if (input.activo !== undefined) cambios.activo = input.activo;
    const tipoEntrada = input.tipoEntrada ?? actual.tipoEntrada;
    if (input.tipoEntrada !== undefined) cambios.tipoEntrada = input.tipoEntrada;
    if (tipoEntrada === 'ninguna') {
      if (actual.entradaAyuda !== null || input.tipoEntrada !== undefined) cambios.entradaAyuda = null;
    } else if (input.entradaAyuda !== undefined) {
      cambios.entradaAyuda = input.entradaAyuda;
    }
    await this.repository.updateOption(id, cambios);
    return this.getQuestion(actual.questionId);
  }

  async reorderOptions(questionId: string, ids: string[]): Promise<PreguntaGestionDto> {
    await this.pregunta(questionId);
    if (!sinRepetidos(ids)) throw validationError([{ campo: 'ids', mensaje: 'Hay opciones repetidas en la lista' }]);
    const propias = new Set((await this.repository.findOptionsOfQuestion(questionId)).map((o) => o.id));
    if (!ids.every((id) => propias.has(id))) throw validationError([{ campo: 'ids', mensaje: 'Alguna opción no es de esta pregunta' }]);
    await this.repository.reorderOptions(questionId, ids);
    return this.getQuestion(questionId);
  }

  // ---- Apoyo ----

  private toServicioDto(s: Servicio, preguntas: number): ServicioGestionDto {
    return { id: s.id, slug: s.slug, nombre: s.nombre, icono: s.icono, orden: s.orden, activo: s.activo, preguntas };
  }

  private async pregunta(id: string): Promise<Pregunta> {
    const p = await this.repository.findQuestionById(id);
    if (!p) throw notFound('Esa pregunta no existe.');
    return p;
  }

  private async serviciosPedidos(ids: string[]): Promise<Servicio[]> {
    const encontrados = await this.repository.findServicesByIds(ids);
    if (encontrados.length !== ids.length) throw validationError([{ campo: 'servicios', mensaje: 'Algún servicio no existe' }]);
    return encontrados;
  }
}
