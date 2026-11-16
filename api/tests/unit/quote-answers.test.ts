import { describe, expect, it } from 'vitest';
import type { AppError } from '../../src/common/errors/app-error';
import { resolverRespuestas, type PreguntaCatalogo } from '../../src/modules/quotes/quote-answers';
import { thrown } from './fakes';

const opcion = (slug: string, etiqueta = slug) => ({ id: `o-${slug}`, slug, etiqueta });

const CATALOGO: PreguntaCatalogo[] = [
  { id: 'p-acabado', slug: 'acabado', etiqueta: 'Acabado', tipo: 'unica', min: null, max: null, servicios: ['cocina', 'bano'], opciones: [opcion('estandar', 'Estándar'), opcion('granito', 'Granito')] },
  { id: 'p-alto', slug: 'mueble-alto', etiqueta: 'Mueble alto', tipo: 'unica', min: null, max: null, servicios: ['cocina'], opciones: [opcion('si', 'Sí'), opcion('no', 'No')] },
  { id: 'p-banos', slug: 'cantidad-banos', etiqueta: 'Baños', tipo: 'numero', min: 1, max: 5, servicios: ['bano'], opciones: [] },
  { id: 'p-muebles', slug: 'muebles', etiqueta: 'Muebles', tipo: 'multiple', min: null, max: null, servicios: ['melamina'], opciones: [opcion('closet', 'Closet'), opcion('tv', 'Mueble de TV'), opcion('otro', 'Otro')] },
];

const detalles = (e: unknown) => (e as AppError).details as { campo: string; mensaje: string }[];

describe('resolverRespuestas', () => {
  it('pregunta de una opción: una fila con option_id y su resumen', () => {
    const r = resolverRespuestas(CATALOGO, ['cocina'], { 'mueble-alto': 'si' });
    expect(r.filas).toEqual([{ questionId: 'p-alto', optionId: 'o-si', valorNumero: null }]);
    expect(r.resumen).toEqual([{ etiqueta: 'Mueble alto', valor: 'Sí' }]);
  });

  it('pregunta numérica: una fila con valor_numero (acepta número o texto numérico)', () => {
    expect(resolverRespuestas(CATALOGO, ['bano'], { 'cantidad-banos': 2 }).filas).toEqual([{ questionId: 'p-banos', optionId: null, valorNumero: 2 }]);
    expect(resolverRespuestas(CATALOGO, ['bano'], { 'cantidad-banos': '3' }).filas[0].valorNumero).toBe(3);
    expect(resolverRespuestas(CATALOGO, ['bano'], { 'cantidad-banos': 2 }).resumen).toEqual([{ etiqueta: 'Baños', valor: '2' }]);
  });

  it('pregunta de varias opciones: una fila por opción, sin repetidos, y el resumen las junta', () => {
    const r = resolverRespuestas(CATALOGO, ['melamina'], { muebles: ['closet', 'tv', 'closet'] });
    expect(r.filas.map((f) => f.optionId)).toEqual(['o-closet', 'o-tv']);
    expect(r.resumen).toEqual([{ etiqueta: 'Muebles', valor: 'Closet, Mueble de TV' }]);
  });

  it('una pregunta compartida entre servicios se guarda UNA vez', () => {
    const r = resolverRespuestas(CATALOGO, ['cocina', 'bano'], { acabado: 'granito' });
    expect(r.filas).toHaveLength(1);
  });

  it('ignora las respuestas de preguntas que no aplican a los servicios elegidos', () => {
    const r = resolverRespuestas(CATALOGO, ['bano'], { 'mueble-alto': 'si', 'cantidad-banos': 1 });
    expect(r.filas.map((f) => f.questionId)).toEqual(['p-banos']);
  });

  it('el resumen sale en el orden del catálogo, no en el de llegada', () => {
    const r = resolverRespuestas(CATALOGO, ['cocina', 'bano'], { 'cantidad-banos': 2, 'mueble-alto': 'no', acabado: 'estandar' });
    expect(r.resumen.map((x) => x.etiqueta)).toEqual(['Acabado', 'Mueble alto', 'Baños']);
  });

  it('sin respuestas → nada que guardar', () => {
    expect(resolverRespuestas(CATALOGO, ['cocina'], {})).toEqual({ filas: [], resumen: [] });
  });

  it('pregunta que NO existe en el catálogo → 422 (manipulación)', () => {
    const e = thrown(() => resolverRespuestas(CATALOGO, ['cocina'], { 'pregunta-falsa': 'x' })) as AppError;
    expect(e.status).toBe(422);
    expect(detalles(e)[0]).toEqual({ campo: 'respuestas.pregunta-falsa', mensaje: 'Pregunta desconocida' });
  });

  it('opción inexistente → 422', () => {
    const e = thrown(() => resolverRespuestas(CATALOGO, ['cocina'], { acabado: 'dorado' }));
    expect(detalles(e)[0].mensaje).toContain('Opción inválida');
  });

  it('una pregunta de opción única no admite varias', () => {
    const e = thrown(() => resolverRespuestas(CATALOGO, ['cocina'], { acabado: ['estandar', 'granito'] }));
    expect(detalles(e)[0].mensaje).toBe('Elige una sola opción');
  });

  it.each([[0], [6], [2.5], ['abc'], [['2']], [-1]])('número inválido o fuera de rango (%j) → 422', (valor) => {
    const e = thrown(() => resolverRespuestas(CATALOGO, ['bano'], { 'cantidad-banos': valor as never }));
    expect((e as AppError).status).toBe(422);
  });

  it.each([[''], [[]], [5]])('opción vacía o de tipo equivocado (%j) → 422', (valor) => {
    const e = thrown(() => resolverRespuestas(CATALOGO, ['cocina'], { acabado: valor as never }));
    expect((e as AppError).status).toBe(422);
  });

  it('junta TODOS los errores en una sola respuesta', () => {
    const e = thrown(() => resolverRespuestas(CATALOGO, ['cocina', 'bano'], { acabado: 'dorado', 'cantidad-banos': 99, fantasma: 1 }));
    expect(detalles(e).map((d) => d.campo).sort()).toEqual(['respuestas.acabado', 'respuestas.cantidad-banos', 'respuestas.fantasma']);
  });
});
