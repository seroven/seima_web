// Catálogo público: lo publicado en la app, leído de GET /projects.
// Si la API no está configurada o no responde, se usan los proyectos de prueba locales
// para que la web siga viéndose.
import {
  categoriasDe,
  categories as categoriasDemo,
  etapaLabel,
  projects as proyectosDemo,
  type Category,
  type Etapa,
  type Foto,
  type Project,
} from '../data/projects';

export interface Sitio {
  projects: Project[];
  categories: Category[];
  /** true cuando se muestran los datos de prueba, no la base. */
  demo: boolean;
  /** api: hay obras publicadas. vacio: la API respondió sin obras. respaldo: no se pudo leer la API. */
  origen: 'api' | 'vacio' | 'respaldo';
}

const etapas: Etapa[] = ['antes', 'durante', 'despues'];

const apiBase = () => {
  const base = import.meta.env?.PUBLIC_API_URL;
  return base ? String(base).replace(/\/$/, '') : null;
};

let memoria: { at: number; sitio: Sitio } | null = null;

export async function cargarSitio(): Promise<Sitio> {
  if (memoria && Date.now() - memoria.at < 5000) return memoria.sitio;
  const sitio = await leerSitio();
  memoria = { at: Date.now(), sitio };
  return sitio;
}

export async function proyectoPublico(slug: string): Promise<Project | null> {
  const base = apiBase();
  if (!base) return proyectosDemo.find((p) => p.slug === slug) ?? null;
  try {
    const res = await fetch(`${base}/projects/${encodeURIComponent(slug)}`, { signal: AbortSignal.timeout(8000) });
    if (res.status === 404) return proyectosDemo.find((p) => p.slug === slug) ?? null;
    if (!res.ok) return proyectosDemo.find((p) => p.slug === slug) ?? null;
    const json = (await res.json()) as { data?: unknown };
    return detalleAProyecto(json.data) ?? proyectosDemo.find((p) => p.slug === slug) ?? null;
  } catch {
    return proyectosDemo.find((p) => p.slug === slug) ?? null;
  }
}

async function leerSitio(): Promise<Sitio> {
  const base = apiBase();
  if (!base) return demo();
  try {
    const [lista, cats] = await Promise.all([
      fetch(`${base}/projects?limit=100`, { signal: AbortSignal.timeout(8000) }),
      fetch(`${base}/categories`, { signal: AbortSignal.timeout(8000) }),
    ]);
    if (!lista.ok) return demo();
    const json = (await lista.json()) as { data?: unknown };
    if (!Array.isArray(json.data)) return demo();
    const projects = json.data.map(tarjetaAProyecto).filter((p): p is Project => p !== null);
    if (projects.length === 0) return { ...demo(), origen: 'vacio' };
    const categories = cats.ok ? categoriasDesde(await cats.json(), projects) : categoriasDemo;
    return { projects, categories: categories.length ? categories : categoriasDemo, demo: false, origen: 'api' };
  } catch {
    return demo();
  }
}

function demo(): Sitio {
  return { projects: proyectosDemo, categories: categoriasDemo, demo: true, origen: 'respaldo' };
}

export function tarjetaAProyecto(card: unknown): Project | null {
  if (!card || typeof card !== 'object') return null;
  const c = card as Record<string, unknown>;
  const slug = texto(c.slug);
  if (!slug) return null;
  const titulo = texto(c.titulo) || slug;
  const portada = (c.portada ?? {}) as Record<string, unknown>;
  const fotos = [
    portada.despues ? fotoDe(portada.despues, 'despues', titulo, true) : null,
    portada.antes ? fotoDe(portada.antes, 'antes', titulo, true) : null,
  ].filter((f): f is Foto => f !== null);
  // La API manda `categorias` (todas) y `categoria` (la principal). Si es una API vieja, solo la segunda.
  const todas = Array.isArray(c.categorias)
    ? c.categorias.map((x) => texto((x as { slug?: unknown } | null)?.slug)).filter((s) => s !== '')
    : [];
  const principal = texto((c.categoria as { slug?: unknown } | undefined)?.slug) || todas[0] || '';
  return {
    slug,
    titulo,
    categoria: principal,
    categorias: todas.length ? todas : principal ? [principal] : [],
    distrito: textoOpcional(c.distrito),
    areaM2: numero(c.areaM2),
    dias: numero(c.dias) === null ? null : Math.round(numero(c.dias)!),
    servicios: textos(c.servicios),
    descripcion: '',
    destacado: c.destacado === true,
    cliente: c.cliente === 'empresa' ? 'empresa' : 'persona',
    tono: tonoDe(slug),
    fotos,
  };
}

export function detalleAProyecto(data: unknown): Project | null {
  const base = tarjetaAProyecto(data);
  if (!base || !data || typeof data !== 'object') return null;
  const d = data as Record<string, unknown>;
  const medios = (d.medios ?? {}) as Record<string, unknown>;
  const fotos = etapas.flatMap((etapa) => {
    const lista = medios[etapa];
    return Array.isArray(lista) ? lista.map((m) => fotoDe(m, etapa, base.titulo)).filter((f): f is Foto => f !== null) : [];
  });
  return {
    ...base,
    descripcion: texto(d.descripcion),
    fotos: fotos.length ? fotos : base.fotos,
  };
}

function fotoDe(medio: unknown, etapa: Etapa, titulo: string, forzarPrincipal = false): Foto | null {
  if (!medio || typeof medio !== 'object') return null;
  const m = medio as Record<string, unknown>;
  const video = m.tipo === 'video';
  const src = video ? textoOpcional(m.poster) ?? textoOpcional(m.url) : textoOpcional(m.url);
  return {
    etapa,
    src,
    alt: `${etapaLabel[etapa]}: ${titulo}`,
    principal: forzarPrincipal || m.esPrincipal === true,
    orden: typeof m.orden === 'number' ? m.orden : 0,
    pie: texto(m.pie) || undefined,
    tipo: video ? 'video' : 'foto',
    video: video ? textoOpcional(m.url) : null,
    ancho: numero(m.ancho),
    alto: numero(m.alto),
  };
}

function categoriasDesde(body: unknown, projects: Project[]): Category[] {
  const data = body && typeof body === 'object' ? (body as { data?: unknown }).data : null;
  const lista = Array.isArray(data)
    ? data
        .map((item) => {
          if (!item || typeof item !== 'object') return null;
          const c = item as { slug?: unknown; nombre?: unknown };
          const slug = texto(c.slug);
          if (!slug) return null;
          return { slug, nombre: texto(c.nombre) || slug };
        })
        .filter((c): c is Category => c !== null)
    : [];
  const conocidas = new Set(lista.map((c) => c.slug));
  for (const proyecto of projects) {
    for (const slug of categoriasDe(proyecto)) {
      if (!conocidas.has(slug)) {
        conocidas.add(slug);
        lista.push({ slug, nombre: slug });
      }
    }
  }
  return lista;
}

function tonoDe(slug: string) {
  return [...slug].reduce((n, c) => n + c.charCodeAt(0), 0) % 6;
}

function texto(valor: unknown) {
  return typeof valor === 'string' ? valor.trim() : '';
}

function textoOpcional(valor: unknown) {
  const t = texto(valor);
  return t ? t : null;
}

function numero(valor: unknown) {
  return typeof valor === 'number' && Number.isFinite(valor) ? valor : null;
}

function textos(valor: unknown) {
  return Array.isArray(valor) ? valor.filter((v): v is string => typeof v === 'string' && v.trim() !== '') : [];
}
