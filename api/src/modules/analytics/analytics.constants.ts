export const TIPOS_VISITA = ['pagina', 'whatsapp', 'compartir'] as const;
export type TipoVisita = (typeof TIPOS_VISITA)[number];

export const DISPOSITIVOS = ['movil', 'escritorio', 'tablet'] as const;
export type Dispositivo = (typeof DISPOSITIVOS)[number];

export const PERIODOS = ['hoy', '7d', '30d'] as const;
export type Periodo = (typeof PERIODOS)[number];

/** Perú no tiene horario de verano: siempre UTC−5. */
export const ZONA = 'America/Lima';
export const DESFASE_LIMA_HORAS = -5;

/** Cuánto se conserva el historial. */
export const CONSERVAR_MESES = 18;
