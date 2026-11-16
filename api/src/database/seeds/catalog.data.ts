// Catálogo del cotizador: servicios y las preguntas que se hacen según el servicio elegido.
// Para cambiar una pregunta u opción: edita este archivo y corre `npm run migration:run` (o `seed:catalog`). Es idempotente:
// actualiza lo que existe y agrega lo nuevo por `slug`; NUNCA borra, para no romper respuestas ya guardadas (para retirar algo,
// ponle `activo = false`). OJO: cuando exista el panel administrativo, la base pasa a ser la fuente de verdad y este seed
// deberá limitarse a insertar lo que falta (si no, pisaría lo que se edite desde el panel).
//
// Modelo: TODO es "pregunta → opciones". Una opción puede pedir un dato extra al elegirla (`entrada`):
//   - 'texto'  (p. ej. "Otro" → ¿cuál?)             `ayuda` = texto de ejemplo del campo
//   - 'numero' (p. ej. "Sé el área" → 85 m²)        `ayuda` = unidad
// Reglas: 1 a 4 preguntas por servicio, de un toque, y casi siempre con "No sé" para no bloquear a nadie.
import type { PreguntaTipo, TipoEntrada } from '../../modules/catalog/catalog.types';

export interface ServicioData {
  slug: string;
  nombre: string;
  /** Ícono de la web (components/ui/Icon). */
  icono: string;
}

export interface OpcionData {
  slug: string;
  etiqueta: string;
  descripcion?: string;
  /** Dato extra que pide la opción (por defecto, ninguno). */
  entrada?: Exclude<TipoEntrada, 'ninguna'>;
  ayuda?: string;
}

export interface PreguntaData {
  slug: string;
  texto: string;
  /** Nombre corto para resúmenes y el panel. */
  etiqueta: string;
  tipo: PreguntaTipo;
  /** slugs de los servicios en los que se hace. */
  servicios: string[];
  opciones: OpcionData[];
}

export const SERVICIOS: ServicioData[] = [
  { slug: 'cocina', nombre: 'Cocina', icono: 'cocinas' },
  { slug: 'bano', nombre: 'Baño', icono: 'banos' },
  { slug: 'departamento', nombre: 'Departamento completo', icono: 'departamentos' },
  { slug: 'divisiones', nombre: 'Divisiones y cuartos', icono: 'divisiones' },
  { slug: 'techo', nombre: 'Techo en drywall', icono: 'techos' },
  { slug: 'enchapado', nombre: 'Enchapado', icono: 'enchapado' },
  { slug: 'electricidad', nombre: 'Electricidad', icono: 'electricidad' },
  { slug: 'melamina', nombre: 'Muebles de melamina', icono: 'melamina' },
  { slug: 'pintura', nombre: 'Pintura', icono: 'remodelaciones' },
  { slug: 'local', nombre: 'Local comercial', icono: 'locales' },
];

const SI_NO_NOSE: OpcionData[] = [
  { slug: 'si', etiqueta: 'Sí' },
  { slug: 'no', etiqueta: 'No' },
  { slug: 'nose', etiqueta: 'No sé' },
];

/** Opciones 1, 2, 3… hasta `hasta`, y una última "Más de N" que pide el número exacto. */
const cantidad = (hasta: number, unidad: string): OpcionData[] => [
  ...Array.from({ length: hasta }, (_, i) => ({ slug: String(i + 1), etiqueta: String(i + 1) })),
  { slug: 'mas', etiqueta: `Más de ${hasta}`, entrada: 'numero', ayuda: unidad },
];

/** Todos los servicios menos electricidad (ahí se pregunta por puntos, no por m²). */
const CON_AREA = SERVICIOS.map((s) => s.slug).filter((s) => s !== 'electricidad');

export const PREGUNTAS: PreguntaData[] = [
  // ---- Medidas (una pregunta más: sirve a casi todos los servicios) ----
  {
    slug: 'area',
    texto: '¿Cuántos m² aproximadamente?',
    etiqueta: 'Área',
    tipo: 'unica',
    servicios: CON_AREA,
    opciones: [
      { slug: 'sabe', etiqueta: 'Sé el área aproximada', entrada: 'numero', ayuda: 'm²' },
      { slug: 'nose', etiqueta: 'Aún no lo sé' },
    ],
  },
  // ---- Acabado (compartida por varios servicios: se muestra una sola vez) ----
  {
    slug: 'acabado',
    texto: 'Nivel de acabado',
    etiqueta: 'Acabado',
    tipo: 'unica',
    servicios: ['cocina', 'bano', 'enchapado', 'departamento'],
    opciones: [
      { slug: 'estandar', etiqueta: 'Estándar', descripcion: 'Buen acabado, el más usado' },
      { slug: 'corte45', etiqueta: 'Corte 45° + resina', descripcion: 'Bordes a inglete y resina' },
      { slug: 'granito', etiqueta: 'Granito o formato grande', descripcion: 'Piezas grandes, más premium' },
      { slug: 'recomiendame', etiqueta: 'Recomiéndame', descripcion: 'Que ustedes me aconsejen' },
    ],
  },
  // ---- Cocina ----
  { slug: 'mueble-alto', texto: '¿Quieres mueble alto?', etiqueta: 'Mueble alto', tipo: 'unica', servicios: ['cocina'], opciones: SI_NO_NOSE },
  {
    slug: 'estructura',
    texto: '¿Ya hay estructura o es desde cero?',
    etiqueta: 'Estructura',
    tipo: 'unica',
    servicios: ['cocina'],
    opciones: [
      { slug: 'hay', etiqueta: 'Ya hay estructura' },
      { slug: 'cero', etiqueta: 'Desde cero' },
    ],
  },
  // ---- Baño ----
  { slug: 'cantidad-banos', texto: '¿Cuántos baños?', etiqueta: 'Baños', tipo: 'unica', servicios: ['bano'], opciones: cantidad(4, 'baños') },
  // (retirar lo anterior: compartida por baño y enchapado)
  { slug: 'retirar-anterior', texto: '¿Hay que retirar lo anterior (enchape o revestimiento antiguo)?', etiqueta: 'Retirar lo anterior', tipo: 'unica', servicios: ['bano', 'enchapado'], opciones: SI_NO_NOSE },
  // ---- Departamento ----
  { slug: 'ambientes', texto: '¿Cuántos ambientes?', etiqueta: 'Ambientes', tipo: 'unica', servicios: ['departamento'], opciones: cantidad(6, 'ambientes') },
  {
    slug: 'departamento-estado',
    texto: '¿Está vacío o habitado?',
    etiqueta: 'Estado',
    tipo: 'unica',
    servicios: ['departamento'],
    opciones: [
      { slug: 'vacio', etiqueta: 'Vacío' },
      { slug: 'habitado', etiqueta: 'Habitado' },
    ],
  },
  // ---- Divisiones y cuartos ----
  { slug: 'cantidad-divisiones', texto: '¿Cuántas divisiones?', etiqueta: 'Divisiones', tipo: 'unica', servicios: ['divisiones'], opciones: cantidad(4, 'divisiones') },
  {
    slug: 'puertas-ventanas',
    texto: '¿Llevan puerta o ventana?',
    etiqueta: 'Puertas o ventanas',
    tipo: 'unica',
    servicios: ['divisiones'],
    opciones: [
      { slug: 'si', etiqueta: 'Sí' },
      { slug: 'no', etiqueta: 'No' },
    ],
  },
  // ---- Techo en drywall ----
  {
    slug: 'techo-tipo',
    texto: '¿Techo liso o con diseño?',
    etiqueta: 'Tipo de techo',
    tipo: 'unica',
    servicios: ['techo'],
    opciones: [
      { slug: 'liso', etiqueta: 'Liso' },
      { slug: 'diseno', etiqueta: 'Con diseño (caídas, molduras)' },
      { slug: 'nose', etiqueta: 'No sé' },
    ],
  },
  { slug: 'luces-empotradas', texto: '¿Con luces empotradas?', etiqueta: 'Luces empotradas', tipo: 'unica', servicios: ['techo'], opciones: SI_NO_NOSE },
  // ---- Enchapado ----
  {
    slug: 'enchape-donde',
    texto: '¿Dónde va el enchape?',
    etiqueta: 'Dónde',
    tipo: 'unica',
    servicios: ['enchapado'],
    opciones: [
      { slug: 'piso', etiqueta: 'Piso' },
      { slug: 'paredes', etiqueta: 'Paredes' },
      { slug: 'ambos', etiqueta: 'Piso y paredes' },
    ],
  },
  // ---- Electricidad ----
  {
    slug: 'electricidad-trabajo',
    texto: '¿Qué trabajo necesitas?',
    etiqueta: 'Trabajo eléctrico',
    tipo: 'unica',
    servicios: ['electricidad'],
    opciones: [
      { slug: 'nueva', etiqueta: 'Instalación nueva' },
      { slug: 'reparacion', etiqueta: 'Cambio o reparación' },
      { slug: 'tablero', etiqueta: 'Ampliar el tablero' },
    ],
  },
  {
    slug: 'electricidad-puntos',
    texto: '¿Cuántos puntos aproximadamente? (tomas, luces e interruptores)',
    etiqueta: 'Puntos eléctricos',
    tipo: 'unica',
    servicios: ['electricidad'],
    opciones: [
      { slug: 'p1-5', etiqueta: '1 a 5' },
      { slug: 'p6-15', etiqueta: '6 a 15' },
      { slug: 'p15mas', etiqueta: 'Más de 15' },
      { slug: 'nose', etiqueta: 'No sé' },
    ],
  },
  // ---- Muebles de melamina ----
  {
    slug: 'melamina-muebles',
    texto: '¿Qué muebles quieres?',
    etiqueta: 'Muebles',
    tipo: 'multiple',
    servicios: ['melamina'],
    opciones: [
      { slug: 'closet', etiqueta: 'Closet' },
      { slug: 'escritorio', etiqueta: 'Escritorio' },
      { slug: 'tv', etiqueta: 'Mueble de TV' },
      { slug: 'otro', etiqueta: 'Otro', entrada: 'texto', ayuda: '¿Cuál?' },
    ],
  },
  {
    slug: 'melamina-diseno',
    texto: '¿Ya tienes el diseño?',
    etiqueta: 'Diseño',
    tipo: 'unica',
    servicios: ['melamina'],
    opciones: [
      { slug: 'tengo', etiqueta: 'Ya tengo el diseño o las medidas' },
      { slug: 'propongan', etiqueta: 'Quiero que ustedes propongan' },
    ],
  },
  // ---- Pintura ----
  {
    slug: 'pintura-zona',
    texto: '¿Interior, exterior o ambos?',
    etiqueta: 'Zona',
    tipo: 'unica',
    servicios: ['pintura'],
    opciones: [
      { slug: 'interior', etiqueta: 'Interior' },
      { slug: 'exterior', etiqueta: 'Exterior' },
      { slug: 'ambos', etiqueta: 'Ambos' },
    ],
  },
  {
    slug: 'pintura-estado',
    texto: '¿Cómo están las paredes?',
    etiqueta: 'Paredes',
    tipo: 'unica',
    servicios: ['pintura'],
    opciones: [
      { slug: 'buenas', etiqueta: 'En buen estado' },
      { slug: 'resanar', etiqueta: 'Hay que resanar' },
      { slug: 'nose', etiqueta: 'No sé' },
    ],
  },
  // ---- Local comercial ----
  {
    slug: 'local-tipo',
    texto: '¿Qué tipo de local es?',
    etiqueta: 'Tipo de local',
    tipo: 'unica',
    servicios: ['local'],
    opciones: [
      { slug: 'tienda', etiqueta: 'Tienda' },
      { slug: 'restaurante', etiqueta: 'Restaurante o café' },
      { slug: 'oficina', etiqueta: 'Oficina' },
      { slug: 'otro', etiqueta: 'Otro', entrada: 'texto', ayuda: '¿Cuál?' },
    ],
  },
  {
    slug: 'local-funcionando',
    texto: '¿El local está en funcionamiento? (si atiende, trabajaríamos fuera de horario)',
    etiqueta: 'En funcionamiento',
    tipo: 'unica',
    servicios: ['local'],
    opciones: [
      { slug: 'si', etiqueta: 'Sí, está atendiendo' },
      { slug: 'no', etiqueta: 'No, está cerrado' },
    ],
  },
];
