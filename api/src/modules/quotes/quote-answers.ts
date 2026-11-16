// Valida las respuestas del cliente contra el catálogo y las convierte en filas para quote_answers.
// Función pura (sin base de datos): recibe el catálogo ya cargado, así se prueba sin infraestructura.
import { validationError } from '../../common/errors/app-error';
import type { PreguntaTipo } from '../catalog/catalog.types';

export interface PreguntaCatalogo {
  id: string;
  slug: string;
  etiqueta: string;
  tipo: PreguntaTipo;
  min: number | null;
  max: number | null;
  opciones: { id: string; slug: string; etiqueta: string }[];
  /** Slugs de los servicios en los que se hace la pregunta. */
  servicios: string[];
}

/** Lo que manda la web por pregunta: un slug de opción, varios, o un número. */
export type ValorRespuesta = string | number | string[];

export interface FilaRespuesta {
  questionId: string;
  optionId: string | null;
  valorNumero: number | null;
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
 * - Pregunta que no existe en el catálogo → error (alguien manipuló el envío).
 * - Pregunta que no aplica a los servicios elegidos → se ignora (la web pudo mandar respuestas de un servicio que ya quitó).
 * - Opción que no existe, número fuera de rango o tipo equivocado → error.
 * El resumen sale en el orden del catálogo (no en el orden en que llegaron).
 */
export function resolverRespuestas(
  preguntas: PreguntaCatalogo[],
  serviciosElegidos: string[],
  respuestas: Record<string, ValorRespuesta>,
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
    const valor = respuestas[p.slug];
    const campo = `respuestas.${p.slug}`;

    if (p.tipo === 'numero') {
      const n = typeof valor === 'string' && /^\d+$/.test(valor) ? Number(valor) : valor;
      if (typeof n !== 'number' || !Number.isInteger(n)) {
        errores.push({ campo, mensaje: 'Debe ser un número entero' });
        continue;
      }
      if ((p.min !== null && n < p.min) || (p.max !== null && n > p.max)) {
        errores.push({ campo, mensaje: `Debe estar entre ${p.min ?? '…'} y ${p.max ?? '…'}` });
        continue;
      }
      filas.push({ questionId: p.id, optionId: null, valorNumero: n });
      resumen.push({ etiqueta: p.etiqueta, valor: String(n) });
      continue;
    }

    const slugs = Array.isArray(valor) ? valor : typeof valor === 'string' ? [valor] : null;
    if (!slugs || slugs.length === 0) {
      errores.push({ campo, mensaje: 'Elige una opción' });
      continue;
    }
    if (p.tipo === 'unica' && slugs.length !== 1) {
      errores.push({ campo, mensaje: 'Elige una sola opción' });
      continue;
    }
    const elegidas = [];
    for (const s of new Set(slugs)) {
      const opcion = p.opciones.find((o) => o.slug === s);
      if (!opcion) errores.push({ campo, mensaje: `Opción inválida: ${s}` });
      else elegidas.push(opcion);
    }
    for (const o of elegidas) filas.push({ questionId: p.id, optionId: o.id, valorNumero: null });
    if (elegidas.length) resumen.push({ etiqueta: p.etiqueta, valor: elegidas.map((o) => o.etiqueta).join(', ') });
  }

  if (errores.length) throw validationError(errores);
  return { filas, resumen };
}
