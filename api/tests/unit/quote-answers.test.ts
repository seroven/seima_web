import { describe, expect, it } from 'vitest';
import type { AppError } from '../../src/common/errors/app-error';
import { resolverRespuestas, textoDeOpcion, type OpcionCatalogo, type PreguntaCatalogo } from '../../src/modules/quotes/quote-answers';
import { thrown } from './fakes';

const opcion = (slug: string, etiqueta = slug, extra: Partial<OpcionCatalogo> = {}): OpcionCatalogo => ({
  id: `o-${slug}`, slug, etiqueta, tipoEntrada: 'ninguna', entradaAyuda: null, ...extra,
});

const CATALOGO: PreguntaCatalogo[] = [
  { id: 'p-area', slug: 'area', etiqueta: 'Área', tipo: 'unica', servicios: ['cocina', 'bano'], opciones: [opcion('sabe', 'Sé el área', { tipoEntrada: 'numero', entradaAyuda: 'm²' }), opcion('nose', 'Aún no lo sé')] },
  { id: 'p-acabado', slug: 'acabado', etiqueta: 'Acabado', tipo: 'unica', servicios: ['cocina', 'bano'], opciones: [opcion('estandar', 'Estándar'), opcion('granito', 'Granito')] },
  { id: 'p-alto', slug: 'mueble-alto', etiqueta: 'Mueble alto', tipo: 'unica', servicios: ['cocina'], opciones: [opcion('si', 'Sí'), opcion('no', 'No')] },
  { id: 'p-muebles', slug: 'muebles', etiqueta: 'Muebles', tipo: 'multiple', servicios: ['melamina'], opciones: [opcion('closet', 'Closet'), opcion('tv', 'Mueble de TV'), opcion('otro', 'Otro', { tipoEntrada: 'texto', entradaAyuda: '¿Cuál?' })] },
  { id: 'p-banos', slug: 'cantidad-banos', etiqueta: 'Baños', tipo: 'unica', servicios: ['bano'], opciones: [opcion('1', '1'), opcion('mas', 'Más de 4', { tipoEntrada: 'numero', entradaAyuda: 'baños' })] },
];

const detalles = (e: unknown) => (e as AppError).details as { campo: string; mensaje: string }[];
const intenta = (servicios: string[], r: Parameters<typeof resolverRespuestas>[2]) => thrown(() => resolverRespuestas(CATALOGO, servicios, r)) as AppError;

describe('textoDeOpcion', () => {
  it('sin dato extra: solo la etiqueta', () => {
    expect(textoDeOpcion(opcion('si', 'Sí'), null)).toBe('Sí');
  });
  it('con dato de texto: "etiqueta: dato"', () => {
    expect(textoDeOpcion(opcion('otro', 'Otro', { tipoEntrada: 'texto', entradaAyuda: '¿Cuál?' }), 'escritorio en L')).toBe('Otro: escritorio en L');
  });
  it('con dato numérico: "etiqueta: dato unidad"', () => {
    expect(textoDeOpcion(opcion('sabe', 'Sé el área', { tipoEntrada: 'numero', entradaAyuda: 'm²' }), '85')).toBe('Sé el área: 85 m²');
    expect(textoDeOpcion(opcion('mas', 'Más de 4', { tipoEntrada: 'numero', entradaAyuda: null }), '6')).toBe('Más de 4: 6');
  });
});

describe('resolverRespuestas', () => {
  it('pregunta de una opción: una fila con la opción (sin dato) y su resumen', () => {
    const r = resolverRespuestas(CATALOGO, ['cocina'], { 'mueble-alto': [{ opcion: 'si' }] });
    expect(r.filas).toEqual([{ optionId: 'o-si', valor: null }]);
    expect(r.resumen).toEqual([{ etiqueta: 'Mueble alto', valor: 'Sí' }]);
  });

  it('opción que pide un número: guarda la opción Y el dato (normalizado)', () => {
    const r = resolverRespuestas(CATALOGO, ['cocina'], { area: [{ opcion: 'sabe', valor: '85' }] });
    expect(r.filas).toEqual([{ optionId: 'o-sabe', valor: '85' }]);
    expect(r.resumen).toEqual([{ etiqueta: 'Área', valor: 'Sé el área: 85 m²' }]);
    expect(resolverRespuestas(CATALOGO, ['cocina'], { area: [{ opcion: 'sabe', valor: ' 12,5 ' }] }).filas[0].valor).toBe('12.5');
    expect(resolverRespuestas(CATALOGO, ['cocina'], { area: [{ opcion: 'sabe', valor: '40.00' }] }).filas[0].valor).toBe('40');
  });

  it('opción que pide texto: guarda el texto recortado', () => {
    const r = resolverRespuestas(CATALOGO, ['melamina'], { muebles: [{ opcion: 'otro', valor: '  escritorio en L  ' }] });
    expect(r.filas).toEqual([{ optionId: 'o-otro', valor: 'escritorio en L' }]);
  });

  it('pregunta múltiple: una fila por opción, sin repetidos, cada una con su dato; el resumen las junta', () => {
    const r = resolverRespuestas(CATALOGO, ['melamina'], { muebles: [{ opcion: 'closet' }, { opcion: 'tv' }, { opcion: 'otro', valor: 'repisa' }, { opcion: 'closet' }] });
    expect(r.filas.map((f) => f.optionId)).toEqual(['o-closet', 'o-tv', 'o-otro']);
    expect(r.resumen).toEqual([{ etiqueta: 'Muebles', valor: 'Closet, Mueble de TV, Otro: repisa' }]);
  });

  it('el dato extra que mande una opción que NO lo pide se ignora', () => {
    const r = resolverRespuestas(CATALOGO, ['cocina'], { 'mueble-alto': [{ opcion: 'si', valor: 'basura' }] });
    expect(r.filas).toEqual([{ optionId: 'o-si', valor: null }]);
  });

  it('una pregunta compartida entre servicios se guarda UNA vez', () => {
    const r = resolverRespuestas(CATALOGO, ['cocina', 'bano'], { acabado: [{ opcion: 'granito' }] });
    expect(r.filas).toHaveLength(1);
  });

  it('ignora las respuestas de preguntas que no aplican a los servicios elegidos', () => {
    const r = resolverRespuestas(CATALOGO, ['bano'], { 'mueble-alto': [{ opcion: 'si' }], 'cantidad-banos': [{ opcion: '1' }] });
    expect(r.filas.map((f) => f.optionId)).toEqual(['o-1']);
  });

  it('el resumen sale en el orden del catálogo, no en el de llegada', () => {
    const r = resolverRespuestas(CATALOGO, ['cocina', 'bano'], { 'cantidad-banos': [{ opcion: '1' }], 'mueble-alto': [{ opcion: 'no' }], acabado: [{ opcion: 'estandar' }], area: [{ opcion: 'nose' }] });
    expect(r.resumen.map((x) => x.etiqueta)).toEqual(['Área', 'Acabado', 'Mueble alto', 'Baños']);
  });

  it('sin respuestas → nada que guardar', () => {
    expect(resolverRespuestas(CATALOGO, ['cocina'], {})).toEqual({ filas: [], resumen: [] });
  });

  it('pregunta que NO existe en el catálogo → 422 (manipulación)', () => {
    const e = intenta(['cocina'], { 'pregunta-falsa': [{ opcion: 'x' }] });
    expect(e.status).toBe(422);
    expect(detalles(e)[0]).toEqual({ campo: 'respuestas.pregunta-falsa', mensaje: 'Pregunta desconocida' });
  });

  it('opción inexistente → 422', () => {
    expect(detalles(intenta(['cocina'], { acabado: [{ opcion: 'dorado' }] }))[0].mensaje).toContain('Opción inválida');
  });

  it('una pregunta de opción única no admite varias', () => {
    expect(detalles(intenta(['cocina'], { acabado: [{ opcion: 'estandar' }, { opcion: 'granito' }] }))[0].mensaje).toBe('Elige una sola opción');
  });

  it('lista vacía → 422', () => {
    expect(detalles(intenta(['cocina'], { acabado: [] }))[0].mensaje).toBe('Elige una opción');
  });

  it('la opción pide un dato y no viene (o viene vacío) → 422 con el campo de esa opción', () => {
    for (const valor of [undefined, '', '   ']) {
      const e = intenta(['cocina'], { area: [{ opcion: 'sabe', valor }] });
      expect(detalles(e)[0]).toEqual({ campo: 'respuestas.area.sabe', mensaje: 'Escribe el dato que pide esta opción' });
    }
    expect(detalles(intenta(['melamina'], { muebles: [{ opcion: 'otro' }] }))[0].campo).toBe('respuestas.muebles.otro');
  });

  it.each([['0'], ['-5'], ['abc'], ['1e3'], ['12,345'], ['100001'], ['85 m2']])('número inválido %j → 422', (valor) => {
    const e = intenta(['cocina'], { area: [{ opcion: 'sabe', valor }] });
    expect(detalles(e)[0].mensaje).toContain('número válido');
  });

  it('texto demasiado largo → 422', () => {
    const e = intenta(['melamina'], { muebles: [{ opcion: 'otro', valor: 'x'.repeat(201) }] });
    expect(detalles(e)[0].mensaje).toContain('Máximo 200');
  });

  it('junta TODOS los errores en una sola respuesta', () => {
    const e = intenta(['cocina', 'bano'], { acabado: [{ opcion: 'dorado' }], area: [{ opcion: 'sabe' }], fantasma: [{ opcion: 'x' }] });
    expect(detalles(e).map((d) => d.campo).sort()).toEqual(['respuestas.acabado', 'respuestas.area.sabe', 'respuestas.fantasma']);
  });
});
