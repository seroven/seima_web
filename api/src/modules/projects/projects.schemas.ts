import { z } from 'zod';

const slug = z.string().min(1).max(120).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Slug inválido (minúsculas, números y guiones)');

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
