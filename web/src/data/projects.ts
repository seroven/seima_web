// DATOS DE PRUEBA (etapa 1, sin API). Nada de esto es un proyecto real de Luis:
// los campos que faltan se muestran como [DATO REAL]. Se reemplaza por GET /projects.

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
  fotos: { etapa: Etapa; src: string | null; alt: string }[];
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

const fotos = (tema: string): Project['fotos'] =>
  (['antes', 'durante', 'despues'] as Etapa[]).map((etapa) => ({
    etapa,
    src: null,
    alt: `${etapaLabel[etapa]}: ${tema}`,
  }));

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
    fotos: fotos('cocina en drywall y porcelanato'),
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
    fotos: fotos('baño con enchape completo'),
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
    fotos: fotos('mini departamento en drywall'),
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
    fotos: fotos('cochera y fachada en porcelanato'),
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
    fotos: fotos('falso techo en drywall'),
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
    fotos: fotos('closet en melamina'),
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
    fotos: fotos('local comercial'),
  },
];

export const categoryName = (slug: string) => categories.find((c) => c.slug === slug)?.nombre ?? slug;
export const show = (v: string | number | null, suffix = '') => (v === null ? PLACEHOLDER : `${v}${suffix}`);
