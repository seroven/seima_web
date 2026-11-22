import { z } from 'zod';

/** `:id` de la ruta, siempre un uuid. */
export const idParamsSchema = z.object({ id: z.uuid() });

/** Nuevo orden de una lista: los ids en el orden en que deben quedar. */
export const reorderSchema = z.object({ ids: z.array(z.uuid()).min(1).max(200) });
export type ReorderInput = z.infer<typeof reorderSchema>;

/** Que haya al menos un campo para guardar (para los PATCH). */
export const algoQueGuardar = (v: Record<string, unknown>) => Object.values(v).some((x) => x !== undefined);
