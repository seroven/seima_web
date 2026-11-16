// Catálogos del cotizador (espejo de web/src/lib/quote.ts). Si cambian en la web, cambian aquí.
export const CLIENTES = ['persona', 'empresa'] as const;
export const MEDIDAS_MODO = ['lxa', 'm2', 'nose'] as const;
export const MUEBLE_ALTO = ['si', 'no', 'nose'] as const;
export const ESTRUCTURA = ['hay', 'cero'] as const;
export const ESTADOS_COTIZACION = ['nueva', 'contactada', 'cerrada', 'descartada'] as const;

export const SERVICIOS: Record<string, string> = {
  cocina: 'Cocina',
  bano: 'Baño',
  departamento: 'Departamento completo',
  divisiones: 'Divisiones y cuartos',
  techo: 'Techo en drywall',
  enchapado: 'Enchapado',
  electricidad: 'Electricidad',
  melamina: 'Muebles de melamina',
  pintura: 'Pintura',
  local: 'Local comercial',
};
export const SERVICIO_IDS = Object.keys(SERVICIOS) as [string, ...string[]];

export const ACABADOS: Record<string, string> = {
  estandar: 'Estándar',
  corte45: 'Corte 45° + resina',
  granito: 'Granito o formato grande',
  recomiendame: 'Recomiéndame',
};
export const ACABADO_IDS = Object.keys(ACABADOS) as [string, ...string[]];

export const PLAZOS: Record<string, string> = {
  asap: 'Lo antes posible',
  '1mes': 'En 1 mes',
  sinapuro: 'Sin apuro',
};
export const PLAZO_IDS = Object.keys(PLAZOS) as [string, ...string[]];

/** Servicios que llevan pregunta de acabado de enchape. */
export const SERVICIOS_CON_ACABADO = ['cocina', 'bano', 'enchapado', 'departamento'];

export type Cliente = (typeof CLIENTES)[number];
export type MedidasModo = (typeof MEDIDAS_MODO)[number];
export type EstadoCotizacion = (typeof ESTADOS_COTIZACION)[number];
