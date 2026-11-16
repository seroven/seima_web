// Lógica del cotizador: tipos, opciones, validación y envío.
// El envío es directo a la API (POST /quotes): las fotos del cliente se suben antes a Cloudinary y la solicitud queda
// registrada en la base de datos. WhatsApp ya no es el canal de envío, solo el de respuesta.

export type Cliente = 'persona' | 'empresa';
export type MedidasModo = 'lxa' | 'm2' | 'nose';

export interface QuoteData {
  cliente: Cliente | null;
  servicios: string[];
  medidasModo: MedidasModo;
  largo: string;
  ancho: string;
  m2: string;
  acabado: string | null;
  muebleAlto: 'si' | 'no' | 'nose' | null;
  estructura: 'hay' | 'cero' | null;
  ambientes: number;
  distrito: string;
  plazo: string | null;
  fotos: number;
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
  medidasModo: 'lxa',
  largo: '',
  ancho: '',
  m2: '',
  acabado: null,
  muebleAlto: null,
  estructura: null,
  ambientes: 2,
  distrito: '',
  plazo: null,
  fotos: 0,
  nombre: '',
  whatsapp: '',
  razonSocial: '',
  ruc: '',
  proyecto: null,
};

export const SERVICIOS = [
  { id: 'cocina', label: 'Cocina', icon: 'cocinas' },
  { id: 'bano', label: 'Baño', icon: 'banos' },
  { id: 'departamento', label: 'Departamento completo', icon: 'departamentos' },
  { id: 'divisiones', label: 'Divisiones y cuartos', icon: 'divisiones' },
  { id: 'techo', label: 'Techo en drywall', icon: 'techos' },
  { id: 'enchapado', label: 'Enchapado', icon: 'enchapado' },
  { id: 'electricidad', label: 'Electricidad', icon: 'electricidad' },
  { id: 'melamina', label: 'Muebles de melamina', icon: 'melamina' },
  { id: 'pintura', label: 'Pintura', icon: 'remodelaciones' },
  { id: 'local', label: 'Local comercial', icon: 'locales' },
] as const;

export const servicioLabel = (id: string) => SERVICIOS.find((s) => s.id === id)?.label ?? id;

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

export const ACABADOS = [
  { id: 'estandar', label: 'Estándar', desc: 'Buen acabado, el más usado' },
  { id: 'corte45', label: 'Corte 45° + resina', desc: 'Bordes a inglete y resina' },
  { id: 'granito', label: 'Granito o formato grande', desc: 'Piezas grandes, más premium' },
  { id: 'recomiendame', label: 'Recomiéndame', desc: 'Que ustedes me aconsejen' },
] as const;

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

/** ¿Este pedido incluye algo que lleva acabado de enchape? */
export const pideAcabado = (d: QuoteData) => d.servicios.some((s) => ['cocina', 'bano', 'enchapado', 'departamento'].includes(s));

const num = (s: string) => {
  const n = parseFloat(s.replace(',', '.'));
  return Number.isFinite(n) && n > 0 ? n : null;
};

export const areaDe = (d: QuoteData): number | null => {
  if (d.medidasModo === 'm2') return num(d.m2);
  if (d.medidasModo === 'lxa') {
    const l = num(d.largo);
    const a = num(d.ancho);
    return l && a ? Math.round(l * a * 10) / 10 : null;
  }
  return null;
};

export const medidasTexto = (d: QuoteData): string => {
  if (d.medidasModo === 'nose') return 'por definir';
  if (d.medidasModo === 'm2') return num(d.m2) ? `${num(d.m2)} m²` : 'por definir';
  const l = num(d.largo);
  const a = num(d.ancho);
  return l && a ? `${l} × ${a} m (≈ ${areaDe(d)} m²)` : 'por definir';
};

/* ---------- Validación ---------- */
export const soloDigitos = (s: string) => s.replace(/\D/g, '');
export const celularValido = (s: string) => /^9\d{8}$/.test(soloDigitos(s));
export const formatCelular = (s: string) => {
  const d = soloDigitos(s).slice(0, 9);
  return [d.slice(0, 3), d.slice(3, 6), d.slice(6, 9)].filter(Boolean).join(' ');
};

export function validarPaso(step: number, d: QuoteData): string | null {
  switch (step) {
    case 0:
      return d.cliente ? null : 'Elige si es para ti o para una empresa.';
    case 1:
      return d.servicios.length ? null : 'Elige al menos una opción.';
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

export interface SubmitOptions {
  files: File[];
  /** Campo trampa (debe ir vacío; los robots lo llenan). */
  website: string;
  onProgress: (hechas: number, total: number) => void;
}

/** Sube las fotos a Cloudinary y registra la solicitud en la base (POST /quotes). Lanza SendError con un mensaje listo para mostrar. */
export async function submitQuote(d: QuoteData, { files, website, onProgress }: SubmitOptions): Promise<{ id: string }> {
  const base = apiBase();
  if (!base) throw new SendError('config', 'El envío todavía no está configurado [API PENDIENTE].');
  const fotos = await subirFotos(base, files, onProgress);
  const { fotos: _cuantas, ...resto } = d;
  return api<{ id: string }>(
    base,
    '/quotes',
    { ...resto, fotos, whatsapp: soloDigitos(d.whatsapp), ruc: soloDigitos(d.ruc), consentimiento: true, website },
    30_000,
  );
}
