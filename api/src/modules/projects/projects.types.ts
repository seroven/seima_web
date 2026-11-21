// Valores compartidos del módulo de proyectos (misma fuente para entidades, validación y DTOs).
export const ETAPAS = ['antes', 'durante', 'despues'] as const;
export type Etapa = (typeof ETAPAS)[number];

export const TIPOS_CLIENTE = ['persona', 'empresa'] as const;
export type TipoCliente = (typeof TIPOS_CLIENTE)[number];

export const ESTADOS_PROYECTO = ['borrador', 'publicado', 'oculto'] as const;
export type EstadoProyecto = (typeof ESTADOS_PROYECTO)[number];

export const TIPOS_MEDIO = ['foto', 'video'] as const;
export type TipoMedio = (typeof TIPOS_MEDIO)[number];

export const ESTADOS_MEDIO = ['subiendo', 'listo'] as const;
export type EstadoMedio = (typeof ESTADOS_MEDIO)[number];

export const ORIENTACIONES = ['horizontal', 'vertical'] as const;
export type Orientacion = (typeof ORIENTACIONES)[number];

/** El cuadrado cuenta como horizontal (ancho ≥ alto). Sin dimensiones no hay orientación. */
export function orientacionDe(ancho: number | null, alto: number | null): Orientacion | null {
  if (ancho == null || alto == null || ancho <= 0 || alto <= 0) return null;
  return ancho >= alto ? 'horizontal' : 'vertical';
}
