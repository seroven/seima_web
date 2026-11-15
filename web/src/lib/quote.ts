// Lógica del cotizador: tipos, opciones, validación, mensaje de WhatsApp y envío.
// El mensaje se arma aquí por ahora; cuando exista la API, POST /quotes devolverá el mismo texto.

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

/* ---------- Mensaje para WhatsApp ---------- */
export function buildMessage(d: QuoteData, tituloProyecto?: string | null): string {
  const plazo = PLAZOS.find((p) => p.id === d.plazo)?.label ?? '—';
  const lines: string[] = ['*Nueva solicitud · SEIMA web*'];
  lines.push(
    d.cliente === 'empresa'
      ? `Cliente: Empresa — ${d.razonSocial.trim()}${d.ruc ? ` (RUC ${soloDigitos(d.ruc)})` : ''}`
      : 'Cliente: Persona',
  );
  lines.push(`Servicios: ${d.servicios.map(servicioLabel).join(', ') || '—'}`);
  lines.push(`Medidas: ${medidasTexto(d)}`);
  if (pideAcabado(d)) lines.push(`Acabado: ${ACABADOS.find((a) => a.id === d.acabado)?.label ?? 'por definir'}`);
  if (d.servicios.includes('cocina')) {
    const alto = d.muebleAlto === 'si' ? 'con mueble alto' : d.muebleAlto === 'no' ? 'sin mueble alto' : 'mueble alto por definir';
    const est = d.estructura === 'hay' ? 'ya hay estructura' : d.estructura === 'cero' ? 'desde cero' : 'estructura por definir';
    lines.push(`Cocina: ${alto}, ${est}`);
  }
  if (d.servicios.includes('departamento')) lines.push(`Departamento: ${d.ambientes} ambiente${d.ambientes === 1 ? '' : 's'}`);
  lines.push(`Distrito: ${d.distrito.trim()} · Plazo: ${plazo}`);
  lines.push(d.fotos > 0 ? `Fotos: ${d.fotos} (las adjunto por este chat)` : 'Fotos: sin fotos por ahora');
  if (tituloProyecto) lines.push(`Referencia: proyecto «${tituloProyecto}»`);
  lines.push(`Contacto: ${d.nombre.trim()} · ${formatCelular(d.whatsapp)}`);
  return lines.join('\n');
}

/** Enlace de WhatsApp (el número va en la variable de entorno). null si aún no está configurado. */
export function waHref(text: string): string | null {
  const n = import.meta.env.PUBLIC_WHATSAPP_NUMBER;
  return n ? `https://wa.me/${n}?text=${encodeURIComponent(text)}` : null;
}

/** Guarda la solicitud en la API (POST /quotes). Si no hay API configurada o falla, no bloquea el envío por WhatsApp. */
export async function submitQuote(d: QuoteData): Promise<{ ok: boolean; skipped?: boolean }> {
  const base = import.meta.env.PUBLIC_API_URL;
  if (!base) return { ok: false, skipped: true };
  try {
    const res = await fetch(`${String(base).replace(/\/$/, '')}/quotes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...d, whatsapp: soloDigitos(d.whatsapp), ruc: soloDigitos(d.ruc) }),
      keepalive: true,
      signal: AbortSignal.timeout(5000),
    });
    return { ok: res.ok };
  } catch {
    return { ok: false };
  }
}
