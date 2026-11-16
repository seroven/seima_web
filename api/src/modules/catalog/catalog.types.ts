// Tipos del catálogo del cotizador.
//
// Pregunta:
//  - unica:    el cliente elige UNA opción
//  - multiple: el cliente elige VARIAS opciones
//
// Opción: puede pedir un dato extra al elegirla (`tipo_entrada`):
//  - ninguna: nada más (lo normal: "Sí", "Granito"…)
//  - texto:   un texto libre ("Otro" → ¿cuál?)
//  - numero:  un número positivo ("Sé el área" → m²; "Más de 4" → cuántos)
// Así TODO es "pregunta → opciones → respuesta (opción + valor opcional)": no hay tipos de dato distintos por pregunta.
export const PREGUNTA_TIPOS = ['unica', 'multiple'] as const;
export type PreguntaTipo = (typeof PREGUNTA_TIPOS)[number];

export const TIPOS_ENTRADA = ['ninguna', 'texto', 'numero'] as const;
export type TipoEntrada = (typeof TIPOS_ENTRADA)[number];

/** Máximo de caracteres del dato extra de texto. */
export const MAX_VALOR_TEXTO = 200;
/** Máximo del dato extra numérico (evita basura como 99999999). */
export const MAX_VALOR_NUMERO = 100000;
