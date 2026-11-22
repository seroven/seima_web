import { z } from 'zod';
import { PERIODOS, TIPOS_VISITA } from './analytics.constants';

/** Lo que manda la web en cada visita. Todo opcional salvo la ruta; lo que no se reconoce se ignora en el servicio. */
export const hitSchema = z.object({
  tipo: z.enum(TIPOS_VISITA).default('pagina'),
  ruta: z.string().trim().min(1).max(200).startsWith('/'),
  /** Sitio desde el que llegó (solo si es otro sitio; la web ya lo filtra). */
  referrer: z.string().trim().max(300).optional(),
  /** `utm_source` de la dirección, si traía. */
  utm: z.string().trim().max(60).optional(),
});
export type HitInput = z.infer<typeof hitSchema>;

export const resumenQuerySchema = z.object({
  periodo: z.enum(PERIODOS).default('7d'),
});
export type ResumenQuery = z.infer<typeof resumenQuerySchema>;
