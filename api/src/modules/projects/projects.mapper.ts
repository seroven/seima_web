// Convierte entidades en lo que sale por la API (DTOs). Nada de TypeORM sale de aquí hacia afuera.
import { imageUrl } from '../../common/utils/cloudinary';
import type { ProjectPhoto } from './project-photo.entity';
import type { Project } from './project.entity';
import { ETAPAS, type Etapa, type TipoCliente } from './projects.types';

export interface PhotoDto {
  id: string;
  etapa: Etapa;
  orden: number;
  esPrincipal: boolean;
  pie: string | null;
  ancho: number | null;
  alto: number | null;
  cloudinaryId: string;
  /** URL pública optimizada (f_auto,q_auto). null en datos de prueba sin foto real. */
  url: string | null;
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
  /** Fotos que alimentan la tarjeta: "después" por defecto y "antes" al pasar el mouse. */
  portada: { antes: PhotoDto | null; despues: PhotoDto | null };
}

export interface ProjectDetailDto extends ProjectCardDto {
  descripcion: string;
  /** Galería completa por etapa (cada etapa vacía es un arreglo vacío). */
  fotos: Record<Etapa, PhotoDto[]>;
  creadoEn: string;
}

export const toPhotoDto = (f: ProjectPhoto): PhotoDto => ({
  id: f.id,
  etapa: f.etapa,
  orden: f.orden,
  esPrincipal: f.esPrincipal,
  pie: f.pie,
  ancho: f.ancho,
  alto: f.alto,
  cloudinaryId: f.cloudinaryId,
  url: imageUrl(f.cloudinaryId),
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

export const toCardDto = (p: Project, covers: ProjectPhoto[]): ProjectCardDto =>
  base(p, {
    antes: pick(covers, 'antes'),
    despues: pick(covers, 'despues'),
  });

const pick = (photos: ProjectPhoto[], etapa: Etapa): PhotoDto | null => {
  const f = photos.find((x) => x.etapa === etapa);
  return f ? toPhotoDto(f) : null;
};

/** La principal de la etapa; si no está marcada, la primera por orden (las fotos llegan ordenadas). */
const portadaDe = (photos: ProjectPhoto[], etapa: Etapa): ProjectPhoto | undefined => {
  const deEtapa = photos.filter((f) => f.etapa === etapa);
  return deEtapa.find((f) => f.esPrincipal) ?? deEtapa[0];
};

export const toDetailDto = (p: Project, photos: ProjectPhoto[]): ProjectDetailDto => {
  const fotos = Object.fromEntries(ETAPAS.map((e) => [e, photos.filter((f) => f.etapa === e).map(toPhotoDto)])) as Record<Etapa, PhotoDto[]>;
  const antes = portadaDe(photos, 'antes');
  const despues = portadaDe(photos, 'despues');
  return {
    ...base(p, { antes: antes ? toPhotoDto(antes) : null, despues: despues ? toPhotoDto(despues) : null }),
    descripcion: p.descripcion,
    fotos,
    creadoEn: p.createdAt.toISOString(),
  };
};
