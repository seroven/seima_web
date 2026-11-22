import { z } from 'zod';
import { algoQueGuardar } from '../../common/schemas';

const nombre = z.string().trim().min(2, 'El nombre es muy corto').max(80, 'El nombre es muy largo');

export const createCategorySchema = z.object({ nombre });
export type CreateCategoryInput = z.infer<typeof createCategorySchema>;

export const updateCategorySchema = z
  .object({ nombre: nombre.optional(), activo: z.boolean().optional() })
  .refine(algoQueGuardar, { message: 'No hay nada que guardar' });
export type UpdateCategoryInput = z.infer<typeof updateCategorySchema>;
