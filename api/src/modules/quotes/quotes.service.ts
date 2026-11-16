import { randomUUID } from 'node:crypto';
import { validationError } from '../../common/errors/app-error';
import type { CatalogRepository } from '../catalog/catalog.repository';
import type { Pregunta } from '../catalog/pregunta.entity';
import type { ProjectsRepository } from '../projects/projects.repository';
import { resolverRespuestas, type PreguntaCatalogo } from './quote-answers';
import { buildQuoteMessage } from './quote-message';
import type { CreateQuoteInput } from './quotes.schemas';
import type { QuotesRepository } from './quotes.repository';

export interface CreatedQuoteDto {
  id: string;
  /** Resumen de la solicitud en texto. */
  mensaje: string;
  creadaEn: string;
}

const aCatalogo = (p: Pregunta): PreguntaCatalogo => ({
  id: p.id,
  slug: p.slug,
  etiqueta: p.etiqueta,
  tipo: p.tipo,
  opciones: p.opciones.map((o) => ({ id: o.id, slug: o.slug, etiqueta: o.etiqueta, tipoEntrada: o.tipoEntrada, entradaAyuda: o.entradaAyuda })),
  servicios: p.servicios.map((s) => s.slug),
});

/** Lógica de negocio de cotizaciones: valida contra el catálogo, limpia lo recibido, arma el resumen y lo guarda en tablas. */
export class QuotesService {
  constructor(
    private readonly repository: QuotesRepository,
    private readonly projects: ProjectsRepository,
    private readonly catalog: CatalogRepository,
  ) {}

  async create(input: CreateQuoteInput): Promise<CreatedQuoteDto> {
    // Campo trampa lleno = robot. Se responde como si todo hubiera ido bien, pero no se guarda nada.
    if (input.website) return { id: randomUUID(), mensaje: '', creadaEn: new Date().toISOString() };

    // Los servicios deben existir y estar activos en el catálogo
    const servicios = await this.catalog.findActiveServicesBySlugs(input.servicios);
    const porSlug = new Map(servicios.map((s) => [s.slug, s]));
    const faltantes = input.servicios.filter((s) => !porSlug.has(s));
    if (faltantes.length) {
      throw validationError(faltantes.map((s) => ({ campo: 'servicios', mensaje: `Servicio no disponible: ${s}` })));
    }

    // Las respuestas se validan contra las preguntas y opciones del catálogo; las que no aplican a estos servicios se descartan
    const preguntas = (await this.catalog.findActiveQuestions()).map(aCatalogo);
    const { filas, resumen } = resolverRespuestas(preguntas, input.servicios, input.respuestas);

    // Si el proyecto de referencia no existe o no está publicado, simplemente no se enlaza (no es un error del cliente)
    const proyecto = input.proyecto ? await this.projects.findPublishedBySlug(input.proyecto) : null;

    const notas = input.notas ?? null;
    const razonSocial = input.cliente === 'empresa' ? (input.razonSocial ?? null) : null;
    const ruc = input.cliente === 'empresa' ? (input.ruc ?? null) : null;

    const mensaje = buildQuoteMessage(
      {
        cliente: input.cliente,
        servicios: input.servicios.map((s) => porSlug.get(s)!.nombre),
        respuestas: resumen,
        distrito: input.distrito,
        plazo: input.plazo,
        notas,
        fotos: input.fotos.length,
        nombre: input.nombre,
        whatsapp: input.whatsapp,
        razonSocial,
        ruc,
      },
      proyecto?.titulo,
    );

    const guardada = await this.repository.create({
      cliente: input.cliente,
      // Cada servicio, respuesta y foto es una fila en su tabla (quote_services, quote_answers, quote_photos), en una sola transacción
      servicios: input.servicios.map((s) => ({ id: porSlug.get(s)!.id })),
      respuestas: filas,
      fotos: input.fotos.map((cloudinaryId, orden) => ({ cloudinaryId, orden })),
      distrito: input.distrito,
      plazo: input.plazo,
      notas,
      consentimientoEn: new Date(),
      nombre: input.nombre,
      whatsapp: input.whatsapp,
      razonSocial,
      ruc,
      proyectoId: proyecto?.id ?? null,
      mensaje,
    });
    return { id: guardada.id, mensaje, creadaEn: guardada.createdAt.toISOString() };
  }
}
