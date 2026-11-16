// Lógica del cotizador: tipos, catálogo (servicios y preguntas que vienen de la API), validación y envío.
// El envío es directo a la API (POST /quotes): las fotos del cliente se suben antes a Cloudinary y la solicitud queda
// registrada en la base de datos. WhatsApp ya no es el canal de envío, solo el de respuesta.

export type Cliente = 'persona' | 'empresa';

/** Una opción elegida y, si la opción pedía un dato extra ("Otro" → ¿cuál?, "Sé el área" → m²), ese dato. */
export interface Seleccion {
  opcion: string;
  valor?: string;
}
/** { pregunta: [opciones elegidas] }: siempre una lista (una pregunta de opción única lleva una sola). */
export type Respuestas = Record<string, Seleccion[]>;

/* ---------- Catálogo (GET /quote-form): qué servicios hay y qué se pregunta en cada uno ---------- */
export interface ServicioCatalogo {
  slug: string;
  nombre: string;
  /** Nombre del ícono (components/ui/Icon). */
  icono: string;
}
/** ¿Al elegir la opción se pide un dato más? ninguna | texto | numero. */
export type TipoEntrada = 'ninguna' | 'texto' | 'numero';
export interface OpcionCatalogo {
  slug: string;
  etiqueta: string;
  descripcion: string | null;
  tipoEntrada: TipoEntrada;
  /** Texto de ejemplo (texto) o unidad (numero) del campo. */
  entradaAyuda: string | null;
}
export interface PreguntaCatalogo {
  slug: string;
  texto: string;
  /** Nombre corto para resúmenes. */
  etiqueta: string;
  /** unica = una opción · multiple = varias */
  tipo: 'unica' | 'multiple';
  opciones: OpcionCatalogo[];
  /** slugs de los servicios en los que se hace. */
  servicios: string[];
}
export interface Catalogo {
  servicios: ServicioCatalogo[];
  preguntas: PreguntaCatalogo[];
}

export interface QuoteData {
  cliente: Cliente | null;
  servicios: string[];
  /** Respuestas a las preguntas de los servicios elegidos (incluye las medidas), por slug de pregunta. */
  respuestas: Respuestas;
  distrito: string;
  plazo: string | null;
  fotos: number;
  /** Datos extra en texto libre (opcional). */
  notas: string;
  nombre: string;
  whatsapp: string;
  razonSocial: string;
  ruc: string;
  /** slug del proyecto desde el que se llegó ("Cotizar algo así") */
  proyecto: string | null;
}

export const emptyQuote: QuoteData = {
  cliente: null,
  servicios: [],
  respuestas: {},
  distrito: '',
  plazo: null,
  fotos: 0,
  notas: '',
  nombre: '',
  whatsapp: '',
  razonSocial: '',
  ruc: '',
  proyecto: null,
};

export const MAX_NOTAS = 500;
/** Mismos límites que la API (api/src/modules/catalog/catalog.types.ts). */
export const MAX_VALOR_TEXTO = 200;
export const MAX_VALOR_NUMERO = 100000;

/** Nombre legible de un servicio (si aún no cargó el catálogo, el slug). */
export const servicioNombre = (c: Catalogo | null, slug: string) => c?.servicios.find((x) => x.slug === slug)?.nombre ?? slug;

/** Las opciones elegidas de una pregunta. Ignora formatos viejos o dañados (p. ej. un borrador guardado por una versión anterior). */
export const seleccionesDe = (r: Respuestas, slug: string): Seleccion[] => {
  const v = r[slug] as unknown;
  return Array.isArray(v) ? (v as Seleccion[]).filter((x) => x && typeof x.opcion === 'string') : [];
};

/** Preguntas que aplican a los servicios elegidos, en el orden del catálogo (cada una una sola vez). */
export const preguntasAplicables = (c: Catalogo, elegidos: string[]): PreguntaCatalogo[] =>
  c.preguntas.filter((p) => p.servicios.some((s) => elegidos.includes(s)));

export interface GrupoPreguntas {
  /** Identificador estable del grupo. */
  clave: string;
  titulo: string;
  preguntas: PreguntaCatalogo[];
}

/**
 * Agrupa las preguntas para mostrarlas. Las que sirven a VARIOS servicios del pedido (p. ej. el acabado en cocina + baño)
 * van juntas en "Para todo tu pedido"; el resto, bajo el servicio al que pertenecen. Cada pregunta sale una sola vez.
 */
export function gruposDePreguntas(c: Catalogo, elegidos: string[]): GrupoPreguntas[] {
  const aplicables = preguntasAplicables(c, elegidos);
  const enPedido = (p: PreguntaCatalogo) => p.servicios.filter((s) => elegidos.includes(s));
  const grupos: GrupoPreguntas[] = [];

  const compartidas = aplicables.filter((p) => enPedido(p).length > 1);
  if (compartidas.length) grupos.push({ clave: 'compartidas', titulo: 'Para todo tu pedido', preguntas: compartidas });

  for (const servicio of c.servicios) {
    if (!elegidos.includes(servicio.slug)) continue;
    const propias = aplicables.filter((p) => enPedido(p).length === 1 && enPedido(p)[0] === servicio.slug);
    if (propias.length) grupos.push({ clave: servicio.slug, titulo: servicio.nombre, preguntas: propias });
  }
  return grupos;
}

/**
 * Deja solo las respuestas que valen: de preguntas que aplican a los servicios elegidos y con opciones que existen
 * (una sola en las de opción única, sin repetidos en las múltiples). El dato extra solo se conserva en las opciones que lo piden.
 */
export function normalizarRespuestas(c: Catalogo, elegidos: string[], r: Respuestas): Respuestas {
  const salida: Respuestas = {};
  for (const p of preguntasAplicables(c, elegidos)) {
    const vistas = new Set<string>();
    const lista: Seleccion[] = [];
    for (const sel of seleccionesDe(r, p.slug)) {
      const o = p.opciones.find((x) => x.slug === sel.opcion);
      if (!o || vistas.has(o.slug)) continue;
      vistas.add(o.slug);
      lista.push(o.tipoEntrada === 'ninguna' ? { opcion: o.slug } : { opcion: o.slug, valor: sel.valor ?? '' });
    }
    if (lista.length) salida[p.slug] = p.tipo === 'unica' ? lista.slice(0, 1) : lista;
  }
  return salida;
}

/** Cómo se muestra una opción elegida: su etiqueta y, si pidió un dato extra, "etiqueta: dato" (con la unidad si es un número). */
export function textoDeOpcion(o: Pick<OpcionCatalogo, 'etiqueta' | 'tipoEntrada' | 'entradaAyuda'>, valor?: string): string {
  const v = valor?.trim();
  if (!v) return o.etiqueta;
  return `${o.etiqueta}: ${o.tipoEntrada === 'numero' && o.entradaAyuda ? `${v} ${o.entradaAyuda}` : v}`;
}

/** Valida el dato extra de una opción (misma regla que la API). Devuelve el mensaje de error o null si está bien. */
export function errorDeValor(o: Pick<OpcionCatalogo, 'etiqueta' | 'tipoEntrada'>, valor: string | undefined): string | null {
  if (o.tipoEntrada === 'ninguna') return null;
  const t = (valor ?? '').trim();
  if (!t) return `Completa lo que pide «${o.etiqueta}».`;
  if (o.tipoEntrada === 'texto') return t.length > MAX_VALOR_TEXTO ? `«${o.etiqueta}»: máximo ${MAX_VALOR_TEXTO} caracteres.` : null;
  const normal = t.replace(',', '.');
  const n = Number(normal);
  return /^\d+(\.\d{1,2})?$/.test(normal) && n > 0 && n <= MAX_VALOR_NUMERO ? null : `Escribe un número válido en «${o.etiqueta}».`;
}

/** El primer problema en las respuestas dadas (opciones que piden un dato y no lo tienen o no es válido), o null. */
export function errorDeRespuestas(c: Catalogo, elegidos: string[], r: Respuestas): string | null {
  for (const p of preguntasAplicables(c, elegidos)) {
    for (const sel of seleccionesDe(r, p.slug)) {
      const o = p.opciones.find((x) => x.slug === sel.opcion);
      const e = o ? errorDeValor(o, sel.valor) : null;
      if (e) return e;
    }
  }
  return null;
}

/** Las respuestas ya contestadas, como etiqueta + texto, en el orden del catálogo (para el resumen). */
export function filasRespuestas(c: Catalogo, elegidos: string[], r: Respuestas): { slug: string; etiqueta: string; valor: string }[] {
  const filas: { slug: string; etiqueta: string; valor: string }[] = [];
  for (const p of preguntasAplicables(c, elegidos)) {
    const textos = seleccionesDe(r, p.slug).flatMap((sel) => {
      const o = p.opciones.find((x) => x.slug === sel.opcion);
      return o ? [textoDeOpcion(o, sel.valor)] : [];
    });
    if (textos.length) filas.push({ slug: p.slug, etiqueta: p.etiqueta, valor: textos.join(', ') });
  }
  return filas;
}

/** De la categoría del catálogo al servicio del cotizador (para preseleccionar). */
export const CATEGORIA_A_SERVICIO: Record<string, string> = {
  cocinas: 'cocina',
  banos: 'bano',
  departamentos: 'departamento',
  melamina: 'melamina',
  techos: 'techo',
  'cocheras-fachadas': 'enchapado',
  remodelaciones: 'pintura',
  locales: 'local',
};

export const PLAZOS = [
  { id: 'asap', label: 'Lo antes posible' },
  { id: '1mes', label: 'En 1 mes' },
  { id: 'sinapuro', label: 'Sin apuro' },
] as const;

export const DISTRITOS = [
  'Los Olivos', 'San Martín de Porres', 'Comas', 'Independencia', 'Puente Piedra', 'Carabayllo', 'Callao', 'Rímac',
  'Lima Cercado', 'San Juan de Lurigancho', 'Ate', 'Santa Anita', 'La Molina', 'Surco', 'San Borja', 'San Isidro',
  'Miraflores', 'Jesús María', 'Magdalena', 'Villa El Salvador', 'Chorrillos', 'Otra ciudad o provincia',
];

/* ---------- Validación ---------- */
export const soloDigitos = (s: string) => s.replace(/\D/g, '');
export const celularValido = (s: string) => /^9\d{8}$/.test(soloDigitos(s));
export const formatCelular = (s: string) => {
  const d = soloDigitos(s).slice(0, 9);
  return [d.slice(0, 3), d.slice(3, 6), d.slice(6, 9)].filter(Boolean).join(' ');
};

export function validarPaso(step: number, d: QuoteData, catalogo: Catalogo | null = null): string | null {
  switch (step) {
    case 0:
      return d.cliente ? null : 'Elige si es para ti o para una empresa.';
    case 1:
      return d.servicios.length ? null : 'Elige al menos una opción.';
    case 2:
      return catalogo ? errorDeRespuestas(catalogo, d.servicios, d.respuestas) : null;
    case 3:
      if (d.distrito.trim().length < 2) return 'Cuéntanos en qué distrito o ciudad es la obra.';
      return d.plazo ? null : 'Elige un plazo aproximado.';
    case 4:
      if (d.nombre.trim().length < 2) return 'Escribe tu nombre.';
      if (!celularValido(d.whatsapp)) return 'Escribe un celular válido de 9 dígitos (empieza con 9).';
      if (d.cliente === 'empresa' && d.razonSocial.trim().length < 2) return 'Escribe la razón social de la empresa.';
      if (d.ruc && soloDigitos(d.ruc).length !== 11) return 'El RUC tiene 11 dígitos (o déjalo vacío).';
      return null;
    default:
      return null;
  }
}

/* ---------- Envío ---------- */
export const MAX_FOTOS = 6;
const MAX_LADO = 1600; // las fotos se reducen en el navegador antes de subirlas (más rápido con datos móviles)
const MAX_BYTES = 10 * 1024 * 1024;

export type SendErrorKind = 'config' | 'network' | 'server' | 'rate' | 'validation' | 'photos';
export class SendError extends Error {
  constructor(public readonly kind: SendErrorKind, message: string) {
    super(message);
    this.name = 'SendError';
  }
}

const GENERICO = 'No pudimos enviar tu solicitud. Revisa tu conexión e inténtalo otra vez.';

const apiBase = () => {
  const b = import.meta.env.PUBLIC_API_URL;
  return b ? String(b).replace(/\/$/, '') : null;
};
/** ¿Hay una API configurada? Sin ella el cotizador no puede enviar (se muestra un aviso). */
export const apiConfigurada = () => apiBase() !== null;

interface Firma {
  uploadUrl: string;
  apiKey: string;
  timestamp: number;
  folder: string;
  allowedFormats: string;
  signature: string;
}

interface ApiError {
  error?: { code?: string; message?: string; details?: { mensaje?: string }[] };
}

/** Llama a la API y devuelve `data`; traduce cualquier fallo a un SendError con un mensaje claro para la persona. */
async function api<T>(base: string, path: string, body: unknown, timeoutMs: number): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${base}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: AbortSignal.timeout(timeoutMs),
    });
  } catch {
    throw new SendError('network', GENERICO);
  }
  const json = (await res.json().catch(() => ({}))) as { data?: T } & ApiError;
  if (res.ok) return json.data as T;
  const msg = json.error?.message;
  if (res.status === 422) throw new SendError('validation', json.error?.details?.[0]?.mensaje ?? msg ?? 'Revisa los datos de la solicitud.');
  if (res.status === 429) throw new SendError('rate', msg ?? 'Demasiados envíos seguidos. Intenta de nuevo en un rato.');
  if (res.status === 503) throw new SendError('photos', 'La subida de fotos no está disponible por ahora. Puedes quitar las fotos y enviar igual.');
  throw new SendError('server', GENERICO);
}

/** Reduce la foto (máx. 1600 px, JPEG) para subirla más rápido. Si el navegador no puede leerla, sube la original si no pesa demasiado. */
async function prepararFoto(file: File): Promise<Blob | File> {
  try {
    const bmp = await createImageBitmap(file); // respeta la orientación EXIF
    const escala = Math.min(1, MAX_LADO / Math.max(bmp.width, bmp.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(bmp.width * escala);
    canvas.height = Math.round(bmp.height * escala);
    canvas.getContext('2d')?.drawImage(bmp, 0, 0, canvas.width, canvas.height);
    bmp.close?.();
    const blob = await new Promise<Blob | null>((ok) => canvas.toBlob(ok, 'image/jpeg', 0.82));
    if (blob) return blob;
  } catch {
    /* formato que el navegador no decodifica (p. ej. HEIC en Chrome): se intenta con el original */
  }
  if (file.size <= MAX_BYTES) return file;
  throw new SendError('photos', `La foto «${file.name}» pesa demasiado (máximo 10 MB). Quítala o elige otra.`);
}

/** Fotos ya subidas, para no repetir la subida si la persona reintenta el envío. */
const yaSubidas = new WeakMap<File, string>();

async function subirFotos(base: string, files: File[], onProgress: (hechas: number, total: number) => void): Promise<string[]> {
  if (files.length === 0) return [];
  const firma = await api<Firma>(base, '/uploads/quote-photos/signature', undefined, 20_000);
  const ids: string[] = [];
  for (const [i, file] of files.entries()) {
    const previa = yaSubidas.get(file);
    if (previa) {
      ids.push(previa);
      continue;
    }
    onProgress(i, files.length);
    const blob = await prepararFoto(file);
    const form = new FormData();
    form.append('file', blob, blob instanceof File ? blob.name : `foto-${i + 1}.jpg`);
    form.append('api_key', firma.apiKey);
    form.append('timestamp', String(firma.timestamp));
    form.append('folder', firma.folder);
    form.append('allowed_formats', firma.allowedFormats);
    form.append('signature', firma.signature);
    let id: string | undefined;
    try {
      const res = await fetch(firma.uploadUrl, { method: 'POST', body: form, signal: AbortSignal.timeout(90_000) });
      if (res.ok) id = ((await res.json()) as { public_id?: string }).public_id;
    } catch {
      /* se informa abajo */
    }
    if (!id) throw new SendError('photos', `No pudimos subir la foto ${i + 1}. Inténtalo otra vez o quítala.`);
    yaSubidas.set(file, id);
    ids.push(id);
  }
  onProgress(files.length, files.length);
  return ids;
}

/** Carga los servicios y preguntas del cotizador desde la API (GET /quote-form). */
export async function fetchCatalogo(): Promise<Catalogo> {
  const base = apiBase();
  if (!base) throw new SendError('config', 'El cotizador todavía no está configurado [API PENDIENTE].');
  let res: Response;
  try {
    res = await fetch(`${base}/quote-form`, { signal: AbortSignal.timeout(20_000) });
  } catch {
    throw new SendError('network', 'No pudimos cargar las opciones. Revisa tu conexión e inténtalo otra vez.');
  }
  if (!res.ok) throw new SendError('server', 'No pudimos cargar las opciones. Inténtalo otra vez.');
  return ((await res.json()) as { data: Catalogo }).data;
}

export interface SubmitOptions {
  files: File[];
  /** Campo trampa (debe ir vacío; los robots lo llenan). */
  website: string;
  onProgress: (hechas: number, total: number) => void;
}

/** Sube las fotos a Cloudinary y registra la solicitud en la base (POST /quotes). Lanza SendError con un mensaje listo para mostrar. */
export async function submitQuote(d: QuoteData, catalogo: Catalogo, { files, website, onProgress }: SubmitOptions): Promise<{ id: string }> {
  const base = apiBase();
  if (!base) throw new SendError('config', 'El envío todavía no está configurado [API PENDIENTE].');
  const fotos = await subirFotos(base, files, onProgress);
  const { fotos: _cuantas, ...resto } = d;
  return api<{ id: string }>(
    base,
    '/quotes',
    {
      ...resto,
      respuestas: normalizarRespuestas(catalogo, d.servicios, d.respuestas),
      notas: d.notas.trim(),
      fotos,
      whatsapp: soloDigitos(d.whatsapp),
      ruc: soloDigitos(d.ruc),
      consentimiento: true,
      website,
    },
    30_000,
  );
}
