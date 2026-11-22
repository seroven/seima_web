// Reglas PURAS de las mediciones (sin base de datos ni Express): fáciles de probar y de razonar.
import { createHash } from 'node:crypto';
import { DESFASE_LIMA_HORAS, type Dispositivo, type Periodo } from './analytics.constants';

/* ---------------------------------------------------------------- rutas */

/** Rutas de la web pública que se miden. Cualquier otra (404, pruebas de robots) se ignora. */
const RUTA_CONOCIDA = /^\/(proyectos(\/[a-z0-9]+(-[a-z0-9]+)*)?|empresas|cotizador|privacidad)?$/;

/** Quita parámetros, ancla y barra final: `/proyectos/?x=1#a` → `/proyectos`. Devuelve null si no es una ruta medible. */
export function normalizarRuta(ruta: string): string | null {
  const limpia = ruta.split(/[?#]/)[0]!.toLowerCase();
  const sinBarra = limpia.length > 1 ? limpia.replace(/\/+$/, '') : limpia;
  return RUTA_CONOCIDA.test(sinBarra) ? sinBarra : null;
}

/** `/proyectos/cocina-moderna` → `cocina-moderna`. */
export function proyectoDeRuta(ruta: string): string | null {
  const m = /^\/proyectos\/([a-z0-9]+(?:-[a-z0-9]+)*)$/.exec(ruta);
  return m ? m[1]! : null;
}

/* ---------------------------------------------------------------- origen */

const ORIGENES: [RegExp, string][] = [
  [/(^|\.)(google|googleusercontent)\.[a-z.]+$/, 'Google'],
  [/(^|\.)(bing\.com|duckduckgo\.com|yahoo\.com|ecosia\.org)$/, 'Otro buscador'],
  [/(^|\.)(facebook\.com|fb\.com|fb\.me|fbcdn\.net|messenger\.com)$/, 'Facebook'],
  [/(^|\.)(instagram\.com|l\.instagram\.com)$/, 'Instagram'],
  [/(^|\.)(tiktok\.com|vm\.tiktok\.com)$/, 'TikTok'],
  [/(^|\.)(whatsapp\.com|wa\.me)$/, 'WhatsApp'],
  [/(^|\.)(youtube\.com|youtu\.be)$/, 'YouTube'],
  [/(^|\.)(t\.co|twitter\.com|x\.com)$/, 'X'],
  [/(^|\.)(linkedin\.com|lnkd\.in)$/, 'LinkedIn'],
];

const POR_NOMBRE: Record<string, string> = {
  google: 'Google',
  facebook: 'Facebook',
  fb: 'Facebook',
  instagram: 'Instagram',
  ig: 'Instagram',
  tiktok: 'TikTok',
  whatsapp: 'WhatsApp',
  wa: 'WhatsApp',
  youtube: 'YouTube',
  x: 'X',
  twitter: 'X',
  linkedin: 'LinkedIn',
};

const hostDe = (url: string): string | null => {
  try {
    return new URL(url).hostname.toLowerCase().replace(/^www\./, '');
  } catch {
    return null;
  }
};

/**
 * De dónde llegó la visita. Manda `utm_source` si viene (enlaces que nosotros armamos, como el de la bio de TikTok);
 * si no, el sitio anterior. Sin ninguno: «Directo» (incluye los enlaces pegados en WhatsApp, que casi nunca traen origen).
 */
export function origenDe(referrer: string | undefined, utmSource: string | undefined, hostPropio: string[] = []): string {
  const utm = utmSource?.trim().toLowerCase();
  if (utm) return POR_NOMBRE[utm] ?? utm.slice(0, 40).replace(/^./, (c) => c.toUpperCase());
  if (!referrer) return 'Directo';
  const host = hostDe(referrer);
  if (!host) return 'Directo';
  if (hostPropio.map((h) => h.replace(/^www\./, '')).includes(host)) return 'Directo';
  for (const [patron, nombre] of ORIGENES) if (patron.test(host)) return nombre;
  return host.slice(0, 55);
}

/* ---------------------------------------------------------------- navegador */

const ROBOT = /bot|crawl|spider|slurp|headless|lighthouse|preview|facebookexternalhit|whatsapp\/|curl|wget|python-requests|httpclient|monitor|uptime/i;

/** Robots y herramientas por el navegador que declaran. Sin navegador declarado también se descarta. */
export const esRobot = (ua: string | undefined): boolean => !ua || ROBOT.test(ua);

export function dispositivoDe(ua: string | undefined): Dispositivo {
  const s = ua ?? '';
  if (/ipad|tablet|(android(?!.*mobile))/i.test(s)) return 'tablet';
  if (/mobi|iphone|ipod|android/i.test(s)) return 'movil';
  return 'escritorio';
}

/* ---------------------------------------------------------------- visitante anónimo */

/** Fecha de Lima (AAAA-MM-DD) de un instante. */
export const fechaLima = (instante: Date): string => new Date(instante.getTime() + DESFASE_LIMA_HORAS * 3_600_000).toISOString().slice(0, 10);

/**
 * Código anónimo del visitante. Cambia cada día (lleva la fecha de Lima) y no se puede deshacer, así no se
 * puede seguir a una persona de un día a otro ni recuperar su IP. La IP nunca se guarda.
 */
export function visitanteId(secreto: string, instante: Date, ip: string, ua: string): string {
  return createHash('sha256').update(`${secreto}|${fechaLima(instante)}|${ip}|${ua}`).digest('hex').slice(0, 32);
}

/* ---------------------------------------------------------------- periodos (hora de Lima) */

export interface Rango {
  /** Inicio (inclusive) del periodo. */
  desde: Date;
  /** Fin (exclusivo): el instante actual. */
  hasta: Date;
  /** Inicio del periodo anterior de la misma duración; el anterior termina donde empieza este. */
  desdeAnterior: Date;
  /** Cantidad de días que cubre el periodo (hoy cuenta como 1). */
  dias: number;
}

const DIAS: Record<Periodo, number> = { hoy: 1, '7d': 7, '30d': 30 };

/** `hoy` = desde las 00:00 de Lima; `7d`/`30d` = los últimos N días de Lima contando hoy. */
export function rangoDe(periodo: Periodo, ahora: Date): Rango {
  const dias = DIAS[periodo];
  const medianocheHoy = Date.parse(`${fechaLima(ahora)}T00:00:00Z`) - DESFASE_LIMA_HORAS * 3_600_000;
  const desde = new Date(medianocheHoy - (dias - 1) * 86_400_000);
  const desdeAnterior = new Date(desde.getTime() - dias * 86_400_000);
  return { desde, hasta: ahora, desdeAnterior, dias };
}

/** Todas las fechas (AAAA-MM-DD, Lima) del rango, para que los días sin visitas salgan con 0 y no falten en el gráfico. */
export function fechasDelRango(rango: Rango): string[] {
  return Array.from({ length: rango.dias }, (_, i) => fechaLima(new Date(rango.desde.getTime() + i * 86_400_000)));
}
