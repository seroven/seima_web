// Reglas de publicación, comparador y portada. Puras: la API las exige, no solo la app.
import { ETAPAS, orientacionDe, type Etapa, type Orientacion, type TipoMedio } from './projects.types';

/** Galería: el video no puede pasar de un minuto. Comparador: 15 segundos. */
export const MAX_VIDEO_GALERIA_MS = 60_000;
export const MAX_VIDEO_COMPARADOR_MS = 15_000;

export interface MedioRegla {
  id: string;
  etapa: Etapa;
  tipo: TipoMedio;
  estado: 'subiendo' | 'listo';
  ancho: number | null;
  alto: number | null;
  duracionMs: number | null;
  esPrincipal: boolean;
  esPortada: boolean;
}

export function mensajeIncompatible(a: MedioRegla, b: MedioRegla): string | null {
  if (a.estado !== 'listo' || b.estado !== 'listo') return 'Espera a que terminen de subirse.';
  if (a.tipo !== b.tipo) return 'Para compararlos, los dos deben ser fotos o los dos videos.';
  const oa = orientacionDe(a.ancho, a.alto);
  const ob = orientacionDe(b.ancho, b.alto);
  if (!oa || !ob) return 'Faltan las medidas del archivo.';
  if (oa !== ob) {
    const cual = a.tipo === 'video' ? 'videos' : 'fotos';
    const lado = oa === 'vertical' ? 'verticales' : 'horizontales';
    return `Para compararlos, los dos deben ser ${cual} ${lado}.`;
  }
  if (a.tipo === 'video') {
    const largo = (m: MedioRegla) => m.duracionMs == null || m.duracionMs > MAX_VIDEO_COMPARADOR_MS;
    if (largo(a) || largo(b)) return 'Los videos de la comparación duran como máximo 15 segundos.';
  }
  return null;
}

export function mismaOrientacion(a: MedioRegla, b: MedioRegla): Orientacion | null {
  const oa = orientacionDe(a.ancho, a.alto);
  const ob = orientacionDe(b.ancho, b.alto);
  return oa && oa === ob ? oa : null;
}

const ETIQUETA: Record<Etapa, string> = { antes: 'Antes', durante: 'Durante', despues: 'Después' };

/** Frases que ve Luis si intenta publicar y falta algo. Vacío = se puede publicar. */
export function faltantesParaPublicar(medios: MedioRegla[]): string[] {
  const faltan: string[] = [];
  if (medios.some((m) => m.estado === 'subiendo')) faltan.push('Todavía se está subiendo un archivo.');
  for (const etapa of ETAPAS) {
    const listos = medios.filter((m) => m.etapa === etapa && m.estado === 'listo');
    if (listos.length === 0) faltan.push(`Falta algo en ${ETIQUETA[etapa]}.`);
  }
  const principal = (etapa: Etapa) => medios.find((m) => m.esPrincipal && m.etapa === etapa && m.estado === 'listo');
  const antes = principal('antes');
  const despues = principal('despues');
  if (!antes || !despues) faltan.push('Falta la comparación.');
  else if (mensajeIncompatible(antes, despues)) faltan.push('La comparación no es válida.');
  const portada = (etapa: Etapa) => medios.find((m) => m.esPortada && m.etapa === etapa && m.tipo === 'foto' && m.estado === 'listo');
  if (!portada('antes') || !portada('despues')) faltan.push('Falta la portada.');
  return faltan;
}
