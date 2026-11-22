import { z } from 'zod';
import { algoQueGuardar } from '../../common/schemas';
import { PREGUNTA_TIPOS, TIPOS_ENTRADA } from './catalog.types';

/**
 * Íconos que la web sabe dibujar para un servicio (components/ui/Icon.tsx). `generico` es el de reserva:
 * un servicio nuevo sin ícono propio se ve con ese.
 */
export const ICONOS_SERVICIO = ['cocinas', 'banos', 'departamentos', 'divisiones', 'techos', 'enchapado', 'electricidad', 'melamina', 'remodelaciones', 'locales', 'generico'] as const;

/** Cadena vacía = quitar el dato. */
const vacioANull = (v: unknown) => (typeof v === 'string' && v.trim() === '' ? null : v);
const sinRepetidos = (lista: string[]) => [...new Set(lista)];

// ---- Servicios ----
const nombreServicio = z.string().trim().min(2, 'El nombre es muy corto').max(80, 'El nombre es muy largo');

export const createServiceSchema = z.object({ nombre: nombreServicio, icono: z.enum(ICONOS_SERVICIO).default('generico') });
export type CreateServiceInput = z.infer<typeof createServiceSchema>;

export const updateServiceSchema = z
  .object({ nombre: nombreServicio.optional(), icono: z.enum(ICONOS_SERVICIO).optional(), activo: z.boolean().optional() })
  .refine(algoQueGuardar, { message: 'No hay nada que guardar' });
export type UpdateServiceInput = z.infer<typeof updateServiceSchema>;

// ---- Preguntas ----
const texto = z.string().trim().min(5, 'La pregunta es muy corta').max(160, 'La pregunta es muy larga');
const etiqueta = z.string().trim().min(2, 'El nombre corto es muy corto').max(60, 'El nombre corto es muy largo');
const serviciosDeLaPregunta = z.array(z.uuid()).min(1, 'Elige al menos un servicio').max(30).transform(sinRepetidos);

export const createQuestionSchema = z.object({
  texto,
  etiqueta,
  tipo: z.enum(PREGUNTA_TIPOS),
  servicios: serviciosDeLaPregunta,
});
export type CreateQuestionInput = z.infer<typeof createQuestionSchema>;

export const updateQuestionSchema = z
  .object({
    texto: texto.optional(),
    etiqueta: etiqueta.optional(),
    tipo: z.enum(PREGUNTA_TIPOS).optional(),
    activo: z.boolean().optional(),
    servicios: serviciosDeLaPregunta.optional(),
  })
  .refine(algoQueGuardar, { message: 'No hay nada que guardar' });
export type UpdateQuestionInput = z.infer<typeof updateQuestionSchema>;

// ---- Opciones ----
const etiquetaOpcion = z.string().trim().min(1, 'Escribe la opción').max(80, 'La opción es muy larga');
const descripcion = z.preprocess(vacioANull, z.string().trim().max(160, 'La descripción es muy larga').nullable().optional());
const ayuda = z.preprocess(vacioANull, z.string().trim().max(60, 'El texto de ayuda es muy largo').nullable().optional());

export const createOptionSchema = z.object({
  etiqueta: etiquetaOpcion,
  descripcion,
  tipoEntrada: z.enum(TIPOS_ENTRADA).default('ninguna'),
  entradaAyuda: ayuda,
});
export type CreateOptionInput = z.infer<typeof createOptionSchema>;

export const updateOptionSchema = z
  .object({
    etiqueta: etiquetaOpcion.optional(),
    descripcion,
    tipoEntrada: z.enum(TIPOS_ENTRADA).optional(),
    entradaAyuda: ayuda,
    activo: z.boolean().optional(),
  })
  .refine(algoQueGuardar, { message: 'No hay nada que guardar' });
export type UpdateOptionInput = z.infer<typeof updateOptionSchema>;
