import type { CatalogRepository } from './catalog.repository';
import type { PreguntaTipo, TipoEntrada } from './catalog.types';

export interface QuoteFormDto {
  servicios: { slug: string; nombre: string; icono: string }[];
  preguntas: {
    slug: string;
    texto: string;
    etiqueta: string;
    tipo: PreguntaTipo;
    opciones: {
      slug: string;
      etiqueta: string;
      descripcion: string | null;
      /** Si al elegir la opción se pide un dato más: ninguna | texto | numero. */
      tipoEntrada: TipoEntrada;
      /** Texto de ejemplo (texto) o unidad (numero) del campo. */
      entradaAyuda: string | null;
    }[];
    /** Slugs de los servicios en los que se hace la pregunta. */
    servicios: string[];
  }[];
}

/** Lo que necesita la web para armar el cotizador: qué servicios hay y qué se pregunta en cada uno. */
export class CatalogService {
  constructor(private readonly repository: CatalogRepository) {}

  async quoteForm(): Promise<QuoteFormDto> {
    const [servicios, preguntas] = await Promise.all([this.repository.findActiveServices(), this.repository.findActiveQuestions()]);
    const activos = new Set(servicios.map((s) => s.slug));
    return {
      servicios: servicios.map((s) => ({ slug: s.slug, nombre: s.nombre, icono: s.icono })),
      preguntas: preguntas.map((p) => ({
        slug: p.slug,
        texto: p.texto,
        etiqueta: p.etiqueta,
        tipo: p.tipo,
        opciones: p.opciones.map((o) => ({ slug: o.slug, etiqueta: o.etiqueta, descripcion: o.descripcion, tipoEntrada: o.tipoEntrada, entradaAyuda: o.entradaAyuda })),
        servicios: p.servicios.filter((s) => activos.has(s.slug)).map((s) => s.slug),
      })),
    };
  }
}
