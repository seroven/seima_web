import type { ProjectsRepository } from '../projects/projects.repository';
import { buildQuoteMessage } from './quote-message';
import { SERVICIOS_CON_ACABADO } from './quote.constants';
import type { CreateQuoteInput } from './quotes.schemas';
import type { QuotesRepository } from './quotes.repository';

export interface CreatedQuoteDto {
  id: string;
  /** Texto listo para abrir WhatsApp (la web lo manda por wa.me). */
  mensaje: string;
  creadaEn: string;
}

/** Lógica de negocio de cotizaciones: limpia lo recibido, arma el mensaje y lo guarda. */
export class QuotesService {
  constructor(
    private readonly repository: QuotesRepository,
    private readonly projects: ProjectsRepository,
  ) {}

  async create(input: CreateQuoteInput): Promise<CreatedQuoteDto> {
    // Si el proyecto de referencia no existe o no está publicado, simplemente no se enlaza (no es un error del cliente)
    const proyecto = input.proyecto ? await this.projects.findPublishedBySlug(input.proyecto) : null;

    // Solo se guarda lo que aplica al pedido (la web puede mandar valores de preguntas que ya no se muestran)
    const conAcabado = input.servicios.some((s) => SERVICIOS_CON_ACABADO.includes(s));
    const largo = input.medidasModo === 'lxa' ? (input.largo ?? null) : null;
    const ancho = input.medidasModo === 'lxa' ? (input.ancho ?? null) : null;
    const areaM2 =
      input.medidasModo === 'm2' ? (input.m2 ?? null) : input.medidasModo === 'lxa' && largo && ancho ? Math.round(largo * ancho * 10) / 10 : null;

    const datos = {
      cliente: input.cliente,
      servicios: input.servicios,
      medidasModo: input.medidasModo,
      largo,
      ancho,
      areaM2,
      acabado: conAcabado ? (input.acabado ?? null) : null,
      muebleAlto: input.servicios.includes('cocina') ? (input.muebleAlto ?? null) : null,
      estructura: input.servicios.includes('cocina') ? (input.estructura ?? null) : null,
      ambientes: input.servicios.includes('departamento') ? (input.ambientes ?? null) : null,
      distrito: input.distrito,
      plazo: input.plazo,
      fotosCount: input.fotos,
      nombre: input.nombre,
      whatsapp: input.whatsapp,
      razonSocial: input.cliente === 'empresa' ? (input.razonSocial ?? null) : null,
      ruc: input.cliente === 'empresa' ? (input.ruc ?? null) : null,
      proyectoId: proyecto?.id ?? null,
    };

    const mensaje = buildQuoteMessage({ ...datos, fotos: input.fotos }, proyecto?.titulo);
    const guardada = await this.repository.create({ ...datos, mensaje });
    return { id: guardada.id, mensaje, creadaEn: guardada.createdAt.toISOString() };
  }
}
