// Tipos de pregunta del cotizador:
//  - unica:    se elige UNA opción (chips o tarjetas)
//  - multiple: se eligen VARIAS opciones
//  - numero:   un número entero entre `min` y `max` (contador)
export const PREGUNTA_TIPOS = ['unica', 'multiple', 'numero'] as const;
export type PreguntaTipo = (typeof PREGUNTA_TIPOS)[number];
