// Valida las respuestas del cliente contra el catálogo y las convierte en filas para quote_answers.
// Función pura (sin base de datos): recibe el catálogo ya cargado, así se prueba sin infraestructura.
import { validationError } from '../../common/errors/app-error';
import { MAX_VALOR_NUMERO, MAX_VALOR_TEXTO, type PreguntaTipo, type TipoEntrada } from '../catalog/catalog.types';

export interface OpcionCatalogo {
  id: string;
  slug: string;
  etiqueta: string;
  tipoEntrada: TipoEntrada;
  entradaAyuda: string | null;
}

export interface PreguntaCatalogo {
  id: string;
  slug: string;
  etiqueta: string;
  tipo: PreguntaTipo;
  opciones: OpcionCatalogo[];
  /** Slugs de los servicios en los que se hace la pregunta. */
  servicios: string[];
}

/** Lo que manda la web por cada opción elegida: su slug y, si la opción pedía un dato extra, ese dato. */
export interface Seleccion {
  opcion: string;
  valor?: string;
}
/** { pregunta: [opciones elegidas] }: siempre una lista (una pregunta de opción única lleva una sola). */
export type Respuestas = Record<string, Seleccion[]>;

export interface FilaRespuesta {
  optionId: string;
  valor: string | null;
}

export interface ResumenRespuesta {
  etiqueta: string;
  valor: string;
}

interface Detalle {
  campo: string;
  mensaje: string;
}

/**
 * Cómo se muestra una opción elegida: su etiqueta y, si pidió un dato extra, "etiqueta: dato" (con la unidad si es un número).
 * La web usa la misma regla para su resumen.
 */
export function textoDeOpcion(o: Pick<OpcionCatalogo, 'etiqueta' | 'tipoEntrada' | 'entradaAyuda'>, valor: string | null): string {
  if (!valor) return o.etiqueta;
  return `${o.etiqueta}: ${o.tipoEntrada === 'numero' && o.entradaAyuda ? `${valor} ${o.entradaAyuda}` : valor}`;
}

/** Valida y normaliza el dato extra de una opción. Devuelve el valor a guardar o un mensaje de error. */
function validarValor(o: OpcionCatalogo, crudo: string | undefined): { valor: string | null } | { error: string } {
  if (o.tipoEntrada === 'ninguna') return { valor: null }; // la opción no pide nada: se ignora lo que mande
  const texto = (crudo ?? '').trim();
  if (!texto) return { error: 'Escribe el dato que pide esta opción' };
  if (o.tipoEntrada === 'texto') {
    return texto.length > MAX_VALOR_TEXTO ? { error: `Máximo ${MAX_VALOR_TEXTO} caracteres` } : { valor: texto };
  }
  const normal = texto.replace(',', '.');
  const n = Number(normal);
  if (!/^\d+(\.\d{1,2})?$/.test(normal) || !(n > 0) || n > MAX_VALOR_NUMERO) return { error: 'Escribe un número válido (mayor que 0)' };
  return { valor: String(n) };
}

/**
 * - Pregunta que no existe en el catálogo → error (alguien manipuló el envío).
 * - Pregunta que no aplica a los servicios elegidos → se ignora (la web pudo mandar respuestas de un servicio que ya quitó).
 * - Opción que no existe, una sola opción esperada y vienen varias, o dato extra faltante/inválido → error.
 * El resumen sale en el orden del catálogo (no en el orden en que llegaron).
 */
export function resolverRespuestas(
  preguntas: PreguntaCatalogo[],
  serviciosElegidos: string[],
  respuestas: Respuestas,
): { filas: FilaRespuesta[]; resumen: ResumenRespuesta[] } {
  const errores: Detalle[] = [];
  const porSlug = new Map(preguntas.map((p) => [p.slug, p]));

  for (const slug of Object.keys(respuestas)) {
    if (!porSlug.has(slug)) errores.push({ campo: `respuestas.${slug}`, mensaje: 'Pregunta desconocida' });
  }

  const filas: FilaRespuesta[] = [];
  const resumen: ResumenRespuesta[] = [];

  for (const p of preguntas) {
    if (!(p.slug in respuestas)) continue;
    if (!p.servicios.some((s) => serviciosElegidos.includes(s))) continue; // no aplica a lo que pidió
    const campo = `respuestas.${p.slug}`;

    // Una opción solo cuenta una vez (la última que mande para esa opción)
    const elegidas = new Map<string, Seleccion>();
    for (const sel of respuestas[p.slug]) elegidas.set(sel.opcion, sel);

    if (elegidas.size === 0) {
      errores.push({ campo, mensaje: 'Elige una opción' });
      continue;
    }
    if (p.tipo === 'unica' && elegidas.size !== 1) {
      errores.push({ campo, mensaje: 'Elige una sola opción' });
      continue;
    }

    const textos: string[] = [];
    for (const [slugOpcion, sel] of elegidas) {
      const opcion = p.opciones.find((o) => o.slug === slugOpcion);
      if (!opcion) {
        errores.push({ campo, mensaje: `Opción inválida: ${slugOpcion}` });
        continue;
      }
      const r = validarValor(opcion, sel.valor);
      if ('error' in r) {
        errores.push({ campo: `${campo}.${slugOpcion}`, mensaje: r.error });
        continue;
      }
      filas.push({ optionId: opcion.id, valor: r.valor });
      textos.push(textoDeOpcion(opcion, r.valor));
    }
    if (textos.length) resumen.push({ etiqueta: p.etiqueta, valor: textos.join(', ') });
  }

  if (errores.length) throw validationError(errores);
  return { filas, resumen };
}
