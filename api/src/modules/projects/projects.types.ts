// Valores compartidos del módulo de proyectos (misma fuente para entidades, validación y DTOs).
export const ETAPAS = ['antes', 'durante', 'despues'] as const;
export type Etapa = (typeof ETAPAS)[number];

export const TIPOS_CLIENTE = ['persona', 'empresa'] as const;
export type TipoCliente = (typeof TIPOS_CLIENTE)[number];
