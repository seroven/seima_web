// DATOS DE PRUEBA. Si PUBLIC_API_URL responde, la web usa lo publicado (web/src/lib/proyectos-publicos.ts).
// Si no, se muestran estos. Nada de esto es un proyecto real de Luis.

export type Etapa = 'antes' | 'durante' | 'despues';

export interface Category {
  slug: string;
  nombre: string;
}

export interface Project {
  slug: string;
  titulo: string;
  categoria: string;
  distrito: string | null;
  areaM2: number | null;
  dias: number | null;
  servicios: string[];
  descripcion: string;
  destacado: boolean;
  cliente: 'persona' | 'empresa';
  /** Tono del placeholder (0–5) para que no sean todos idénticos. */
  tono: number;
  fotos: Foto[];
}

/** Una foto del proyecto. Una sola principal por etapa (la elige Luis en el panel); el resto es detalle. Ver docs/modelo-datos.md */
export interface Foto {
  etapa: Etapa;
  src: string | null;
  alt: string;
  principal: boolean;
  orden: number;
  pie?: string;
  tipo?: 'foto' | 'video';
  /** Archivo del video. `src` queda como la imagen o el póster. */
  video?: string | null;
  ancho?: number | null;
  alto?: number | null;
}

export const PLACEHOLDER = '[DATO REAL]';

export const etapaLabel: Record<Etapa, string> = {
  antes: 'Antes',
  durante: 'Durante',
  despues: 'Después',
};

export const categories: Category[] = [
  { slug: 'cocinas', nombre: 'Cocinas' },
  { slug: 'banos', nombre: 'Baños' },
  { slug: 'departamentos', nombre: 'Departamentos' },
  { slug: 'melamina', nombre: 'Melamina' },
  { slug: 'techos', nombre: 'Techos' },
  { slug: 'cocheras-fachadas', nombre: 'Cocheras y fachadas' },
  { slug: 'remodelaciones', nombre: 'Remodelaciones' },
  { slug: 'locales', nombre: 'Locales comerciales' },
];

export const etapas: Etapa[] = ['antes', 'durante', 'despues'];

/** Datos de prueba: n fotos por etapa; la primera de cada etapa es la principal. */
const fotos = (tema: string, n: Record<Etapa, number>): Foto[] =>
  etapas.flatMap((etapa) =>
    Array.from({ length: n[etapa] }, (_, i) => ({
      etapa,
      src: null,
      alt: `${etapaLabel[etapa]} ${i + 1}: ${tema}`,
      principal: i === 0,
      orden: i,
    })),
  );

/** Fotos de una etapa, en orden. */
export const fotosDe = (p: Project, etapa: Etapa): Foto[] =>
  p.fotos.filter((f) => f.etapa === etapa).sort((a, b) => a.orden - b.orden);

/** Foto principal de una etapa (si no está marcada, la primera por orden). */
export const principal = (p: Project, etapa: Etapa): Foto | undefined =>
  p.fotos.find((f) => f.etapa === etapa && f.principal) ?? fotosDe(p, etapa)[0];

/** Cuadrada cuenta como horizontal, igual que en la app. */
export const ladoDe = (ancho?: number | null, alto?: number | null) => {
  if (ancho == null || alto == null || ancho <= 0 || alto <= 0) return null;
  return ancho >= alto ? 'horizontal' : 'vertical';
};

/** En escritorio el par vertical va lado a lado. En celular, el CSS lo vuelve deslizador. */
export const parVertical = (antes?: Foto, despues?: Foto) =>
  !!antes && !!despues && ladoDe(antes.ancho, antes.alto) === 'vertical' && ladoDe(despues.ancho, despues.alto) === 'vertical';

/** Todas las fotos ordenadas por etapa y orden (modo presentación / visor). */
export const fotosOrdenadas = (p: Project): Foto[] => etapas.flatMap((e) => fotosDe(p, e));

const base = { distrito: null, areaM2: null, dias: null } as const;
const textoPendiente = ' [DESCRIPCIÓN REAL: qué se hizo, materiales y reto de la obra.]';

export const projects: Project[] = [
  {
    ...base,
    slug: 'cocina-drywall-porcelanato',
    titulo: 'Cocina en drywall y porcelanato',
    categoria: 'cocinas',
    servicios: ['Drywall', 'Enchapado'],
    descripcion: 'Estructura en drywall, enchape en porcelanato con cortes a 45° y acabado fino.' + textoPendiente,
    destacado: true,
    cliente: 'persona',
    tono: 0,
    fotos: fotos('cocina en drywall y porcelanato', { antes: 4, durante: 6, despues: 9 }),
  },
  {
    ...base,
    slug: 'bano-enchape-completo',
    titulo: 'Baño con enchape completo',
    categoria: 'banos',
    servicios: ['Enchapado', 'Electricidad'],
    descripcion: 'Enchapado de piso a techo, nichos y luces LED.' + textoPendiente,
    destacado: true,
    cliente: 'persona',
    tono: 2,
    fotos: fotos('baño con enchape completo', { antes: 3, durante: 5, despues: 7 }),
  },
  {
    ...base,
    slug: 'mini-departamento-drywall',
    titulo: 'Mini departamento en drywall',
    categoria: 'departamentos',
    servicios: ['Drywall', 'Electricidad', 'Pintura'],
    descripcion: 'Del tabique a la entrega: estructura, cuartos, instalaciones y pintura.' + textoPendiente,
    destacado: true,
    cliente: 'persona',
    tono: 4,
    fotos: fotos('mini departamento en drywall', { antes: 5, durante: 8, despues: 10 }),
  },
  {
    ...base,
    slug: 'cochera-fachada-porcelanato',
    titulo: 'Cochera y fachada en porcelanato',
    categoria: 'cocheras-fachadas',
    servicios: ['Enchapado'],
    descripcion: 'Enchape de cochera y entrada de casa.' + textoPendiente,
    destacado: false,
    cliente: 'persona',
    tono: 1,
    fotos: fotos('cochera y fachada en porcelanato', { antes: 3, durante: 4, despues: 6 }),
  },
  {
    ...base,
    slug: 'falso-techo-drywall',
    titulo: 'Falso techo en drywall',
    categoria: 'techos',
    servicios: ['Drywall', 'Electricidad'],
    descripcion: 'Falso techo con iluminación integrada.' + textoPendiente,
    destacado: false,
    cliente: 'persona',
    tono: 3,
    fotos: fotos('falso techo en drywall', { antes: 3, durante: 0, despues: 5 }),
  },
  {
    ...base,
    slug: 'closet-melamina',
    titulo: 'Closet y muebles en melamina',
    categoria: 'melamina',
    servicios: ['Melamina'],
    descripcion: 'Muebles a medida en melamina.' + textoPendiente,
    destacado: false,
    cliente: 'persona',
    tono: 5,
    fotos: fotos('closet en melamina', { antes: 2, durante: 3, despues: 6 }),
  },
  {
    ...base,
    slug: 'local-comercial-acabados',
    titulo: 'Local comercial, acabados completos',
    categoria: 'locales',
    servicios: ['Drywall', 'Pintura', 'Electricidad'],
    descripcion: 'Divisiones, techos y pintura para un local comercial.' + textoPendiente,
    destacado: false,
    cliente: 'empresa',
    tono: 2,
    fotos: fotos('local comercial', { antes: 4, durante: 7, despues: 10 }),
  },
];

export const categoryName = (slug: string) => categories.find((c) => c.slug === slug)?.nombre ?? slug;
export const show = (v: string | number | null, suffix = '') => (v === null ? PLACEHOLDER : `${v}${suffix}`);
