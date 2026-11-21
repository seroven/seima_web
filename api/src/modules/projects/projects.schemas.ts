import { z } from 'zod';
import { ESTADOS_PROYECTO, ETAPAS, TIPOS_CLIENTE, TIPOS_MEDIO } from './projects.types';

const slug = z.string().min(1).max(120).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Slug inválido (minúsculas, números y guiones)');
const uuid = z.uuid();

export const projectSlugParamsSchema = z.object({ slug });

export const listProjectsQuerySchema = z
  .object({
    /** Filtrar por categoría. Se aceptan `categoria` y `category` (alias). */
    categoria: slug.optional(),
    category: slug.optional(),
    destacado: z.enum(['true', 'false']).transform((v) => v === 'true').optional(),
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(50),
  })
  .transform(({ category, categoria, ...resto }) => ({ ...resto, categoria: categoria ?? category }));

export type ListProjectsQuery = z.infer<typeof listProjectsQuerySchema>;

/** Cadena vacía = borrar el dato. Si el campo no viene, se queda como está. */
const vacioANull = (v: unknown) => (v === '' ? null : v);

const datosProyecto = {
  titulo: z.string().trim().min(2).max(160),
  categoria: slug,
  distrito: z.preprocess(vacioANull, z.string().trim().min(2).max(100).nullable().optional()),
  areaM2: z.preprocess(vacioANull, z.number().positive().max(100000).nullable().optional()),
  dias: z.preprocess(vacioANull, z.number().int().positive().max(3650).nullable().optional()),
  servicios: z.array(z.string().trim().min(1).max(40)).max(20).default([]),
  descripcion: z.string().trim().max(5000).optional(),
  cliente: z.enum(TIPOS_CLIENTE).default('persona'),
  destacado: z.boolean().default(false),
};

export const createProjectSchema = z.object(datosProyecto);
export type CreateProjectInput = z.infer<typeof createProjectSchema>;

export const updateProjectSchema = z
  .object({
    titulo: datosProyecto.titulo.optional(),
    categoria: slug.optional(),
    distrito: datosProyecto.distrito,
    areaM2: datosProyecto.areaM2,
    dias: datosProyecto.dias,
    servicios: z.array(z.string().trim().min(1).max(40)).max(20).optional(),
    descripcion: z.string().trim().max(5000).optional(),
    cliente: z.enum(TIPOS_CLIENTE).optional(),
    destacado: z.boolean().optional(),
  })
  .refine((v) => Object.values(v).some((x) => x !== undefined), { message: 'No hay nada que guardar' });
export type UpdateProjectInput = z.infer<typeof updateProjectSchema>;

export const idParamsSchema = z.object({ id: uuid });
export const medioParamsSchema = z.object({ id: uuid, medioId: uuid });

export const gestionQuerySchema = z.object({
  estado: z.enum(ESTADOS_PROYECTO).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});
export type GestionQuery = z.infer<typeof gestionQuerySchema>;

export const estadoProyectoSchema = z.object({ estado: z.enum(ESTADOS_PROYECTO) });

export const parSchema = z.object({ antesId: uuid, despuesId: uuid });
export type SetPairInput = z.infer<typeof parSchema>;

export const createMediaSchema = z.object({
  etapa: z.enum(ETAPAS),
  tipo: z.enum(TIPOS_MEDIO),
  pie: z.string().trim().max(255).nullable().optional(),
});
export type CreateMediaInput = z.infer<typeof createMediaSchema>;

export const confirmMediaSchema = z.object({
  cloudinaryId: z.string().trim().min(1).max(255),
  ancho: z.number().int().positive().max(20000),
  alto: z.number().int().positive().max(20000),
  duracionMs: z.number().int().positive().max(60_000).optional(),
});
export type ConfirmMediaInput = z.infer<typeof confirmMediaSchema>;

export const reorderMediaSchema = z.object({
  etapa: z.enum(ETAPAS),
  ids: z.array(uuid).min(1).max(30),
});
export type ReorderMediaInput = z.infer<typeof reorderMediaSchema>;
