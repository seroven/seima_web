// Valores fijos del cotizador. Los SERVICIOS y las PREGUNTAS ya no están aquí: viven en la base (módulo catalog)
// y se pueden cambiar sin tocar el código. Lo que sigue son datos generales que no dependen del servicio.
export const CLIENTES = ['persona', 'empresa'] as const;
export const MEDIDAS_MODO = ['lxa', 'm2', 'nose'] as const;
/** Máximo de fotos por cotización. */
export const MAX_FOTOS = 6;
/** Máximo de caracteres del campo de notas. */
export const MAX_NOTAS = 500;
export const ESTADOS_COTIZACION = ['nueva', 'contactada', 'cerrada', 'descartada'] as const;

export const PLAZOS: Record<string, string> = {
  asap: 'Lo antes posible',
  '1mes': 'En 1 mes',
  sinapuro: 'Sin apuro',
};
export const PLAZO_IDS = Object.keys(PLAZOS) as [string, ...string[]];

export type Cliente = (typeof CLIENTES)[number];
export type MedidasModo = (typeof MEDIDAS_MODO)[number];
export type EstadoCotizacion = (typeof ESTADOS_COTIZACION)[number];
