// Convierte entidades en lo que sale por la API (DTOs). Nada de TypeORM sale de aquí hacia afuera.
import { mediaUrl, videoPoster } from '../../common/utils/cloudinary';
import type { ProjectMedia } from './project-media.entity';
import type { Project } from './project.entity';
import { ETAPAS, orientacionDe, type EstadoMedio, type EstadoProyecto, type Etapa, type Orientacion, type TipoCliente, type TipoMedio } from './projects.types';

export interface MedioDto {
  id: string;
  etapa: Etapa;
  tipo: TipoMedio;
  orden: number;
  esPrincipal: boolean;
  esPortada: boolean;
  pie: string | null;
  ancho: number | null;
  alto: number | null;
  /** null si todavía no hay medidas (datos de prueba). */
  orientacion: Orientacion | null;
  duracionMs: number | null;
  cloudinaryId: string;
  /** URL pública optimizada. null en datos de prueba (ids `demo/…`). */
  url: string | null;
  /** Vista previa muda del video. null en las fotos. */
  poster: string | null;
}

export interface ProjectCardDto {
  slug: string;
  titulo: string;
  categoria: { slug: string; nombre: string };
  distrito: string | null;
  areaM2: number | null;
  dias: number | null;
  servicios: string[];
  destacado: boolean;
  cliente: TipoCliente;
  /** Fotos de portada: "después" por defecto y "antes" al pasar el mouse. */
  portada: { antes: MedioDto | null; despues: MedioDto | null };
}

export interface ProjectDetailDto extends ProjectCardDto {
  descripcion: string;
  /** Galería por etapa. Solo medios ya subidos (`listo`). */
  medios: Record<Etapa, MedioDto[]>;
  /** Par del comparador (ambos fotos o ambos videos, misma orientación). */
  comparador: { antes: MedioDto | null; despues: MedioDto | null };
  creadoEn: string;
}

export interface MedioGestionDto extends MedioDto {
  estado: EstadoMedio;
}

export interface ProjectGestionDto {
  id: string;
  slug: string;
  titulo: string;
  descripcion: string;
  estado: EstadoProyecto;
  categoria: { slug: string; nombre: string };
  distrito: string | null;
  areaM2: number | null;
  dias: number | null;
  servicios: string[];
  destacado: boolean;
  cliente: TipoCliente;
  portada: { antes: MedioDto | null; despues: MedioDto | null };
  comparador: { antes: MedioDto | null; despues: MedioDto | null };
  /** Incluye los que todavía se están subiendo. */
  medios: Record<Etapa, MedioGestionDto[]>;
  creadoEn: string;
  actualizadoEn: string;
}

export const toMedioDto = (m: ProjectMedia): MedioDto => ({
  id: m.id,
  etapa: m.etapa,
  tipo: m.tipo,
  orden: m.orden,
  esPrincipal: m.esPrincipal,
  esPortada: m.esPortada,
  pie: m.pie,
  ancho: m.ancho,
  alto: m.alto,
  orientacion: orientacionDe(m.ancho, m.alto),
  duracionMs: m.duracionMs,
  cloudinaryId: m.cloudinaryId,
  url: mediaUrl(m.cloudinaryId, m.tipo),
  poster: m.tipo === 'video' ? videoPoster(m.cloudinaryId) : null,
});

const toGestionMedio = (m: ProjectMedia): MedioGestionDto => ({ ...toMedioDto(m), estado: m.estado });

const portadaDe = (medios: ProjectMedia[], etapa: Etapa): ProjectMedia | undefined =>
  medios.find((m) => m.etapa === etapa && m.esPortada && m.tipo === 'foto');

const comparadorDe = (medios: ProjectMedia[], etapa: Etapa): ProjectMedia | undefined =>
  medios.find((m) => m.etapa === etapa && m.esPrincipal);

const par = (medios: ProjectMedia[], elegir: (m: ProjectMedia[], e: Etapa) => ProjectMedia | undefined, map: (m: ProjectMedia) => MedioDto) => ({
  antes: (() => {
    const m = elegir(medios, 'antes');
    return m ? map(m) : null;
  })(),
  despues: (() => {
    const m = elegir(medios, 'despues');
    return m ? map(m) : null;
  })(),
});

const base = (p: Project, portada: ProjectCardDto['portada']): ProjectCardDto => ({
  slug: p.slug,
  titulo: p.titulo,
  categoria: { slug: p.categoria.slug, nombre: p.categoria.nombre },
  distrito: p.distrito,
  areaM2: p.areaM2,
  dias: p.dias,
  servicios: p.servicios,
  destacado: p.destacado,
  cliente: p.cliente,
  portada,
});

export const toCardDto = (p: Project, covers: ProjectMedia[]): ProjectCardDto => base(p, par(covers, portadaDe, toMedioDto));

export const toDetailDto = (p: Project, medios: ProjectMedia[]): ProjectDetailDto => {
  const listos = medios.filter((m) => m.estado === 'listo');
  const porEtapa = Object.fromEntries(ETAPAS.map((e) => [e, listos.filter((m) => m.etapa === e).map(toMedioDto)])) as Record<Etapa, MedioDto[]>;
  return {
    ...base(p, par(listos, portadaDe, toMedioDto)),
    descripcion: p.descripcion,
    medios: porEtapa,
    comparador: par(listos, comparadorDe, toMedioDto),
    creadoEn: p.createdAt.toISOString(),
  };
};

export const toGestionDto = (p: Project, medios: ProjectMedia[]): ProjectGestionDto => ({
  id: p.id,
  ...base(p, par(medios, portadaDe, toMedioDto)),
  descripcion: p.descripcion,
  estado: p.estado,
  comparador: par(medios, comparadorDe, toMedioDto),
  medios: Object.fromEntries(ETAPAS.map((e) => [e, medios.filter((m) => m.etapa === e).map(toGestionMedio)])) as Record<Etapa, MedioGestionDto[]>,
  creadoEn: p.createdAt.toISOString(),
  actualizadoEn: p.updatedAt.toISOString(),
});
