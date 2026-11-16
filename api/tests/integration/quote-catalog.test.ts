// El cotizador parametrizado en tablas: catálogo (GET /quote-form), respuestas guardadas como filas y filtros para el panel.
import { describe, expect, it } from 'vitest';
import { AppDataSource } from '../../src/database/data-source';
import { Servicio } from '../../src/modules/catalog/servicio.entity';
import { QuotesRepository } from '../../src/modules/quotes/quotes.repository';
import { Quote } from '../../src/modules/quotes/quote.entity';
import { RespuestaCotizacion } from '../../src/modules/quotes/respuesta-cotizacion.entity';
import { API, agent, cotizacionValida, useDatabase } from './helpers';

useDatabase();

const enviar = (extra: Record<string, unknown>) => agent().post(`${API}/quotes`).send({ ...cotizacionValida, ...extra });
const repo = () => new QuotesRepository(AppDataSource);
const sel = (opcion: string, valor?: string | number) => ({ opcion, ...(valor !== undefined ? { valor } : {}) });

describe('GET /quote-form (público)', () => {
  it('entrega los servicios y las preguntas para armar el formulario, con el dato extra que pide cada opción', async () => {
    const res = await agent().get(`${API}/quote-form`);
    expect(res.status).toBe(200);
    const { servicios, preguntas } = res.body.data;
    expect(servicios).toHaveLength(10);
    expect(servicios[0]).toEqual({ slug: 'cocina', nombre: 'Cocina', icono: 'cocinas' });
    expect(preguntas).toHaveLength(21);
    const acabado = preguntas.find((p: { slug: string }) => p.slug === 'acabado');
    expect(acabado.servicios.sort()).toEqual(['bano', 'cocina', 'departamento', 'enchapado']);
    expect(acabado.opciones.map((o: { slug: string }) => o.slug)).toEqual(['estandar', 'corte45', 'granito', 'recomiendame']);
    const area = preguntas.find((p: { slug: string }) => p.slug === 'area');
    expect(area.servicios).not.toContain('electricidad');
    expect(area.opciones[0]).toMatchObject({ slug: 'sabe', tipoEntrada: 'numero', entradaAyuda: 'm²' });
    const muebles = preguntas.find((p: { slug: string }) => p.slug === 'melamina-muebles');
    expect(muebles.tipo).toBe('multiple');
    expect(muebles.opciones.find((o: { slug: string }) => o.slug === 'otro')).toMatchObject({ tipoEntrada: 'texto', entradaAyuda: '¿Cuál?' });
    for (const p of preguntas) expect(['unica', 'multiple']).toContain(p.tipo);
  });
});

describe('POST /quotes guarda todo como filas', () => {
  it('servicios en quote_services y respuestas en quote_answers (una opción, varias, y con dato extra)', async () => {
    const res = await enviar({
      servicios: ['cocina', 'bano', 'melamina'],
      respuestas: {
        area: [sel('sabe', '85,5')],
        acabado: [sel('granito')],
        'mueble-alto': [sel('si')],
        'cantidad-banos': [sel('mas', 6)],
        'melamina-muebles': [sel('closet'), sel('otro', 'escritorio en L')],
      },
      notas: 'Entrada por el garaje',
    });
    expect(res.status).toBe(201);
    const q = await repo().findByIdFull(res.body.data.id);
    expect(q!.servicios.map((s) => s.slug).sort()).toEqual(['bano', 'cocina', 'melamina']);
    expect(q!.notas).toBe('Entrada por el garaje');
    const resumen = q!.respuestas.map((r) => `${r.opcion.pregunta.slug}=${r.opcion.slug}${r.valor ? `(${r.valor})` : ''}`).sort();
    expect(resumen).toEqual(['acabado=granito', 'area=sabe(85.5)', 'cantidad-banos=mas(6)', 'melamina-muebles=closet', 'melamina-muebles=otro(escritorio en L)', 'mueble-alto=si']);
    expect(res.body.data.mensaje).toContain('Área: Sé el área aproximada: 85.5 m²');
    expect(res.body.data.mensaje).toContain('Muebles: Closet, Otro: escritorio en L');
  });

  it('la pregunta compartida (acabado) se guarda una sola vez aunque pidan varios servicios que la comparten', async () => {
    const res = await enviar({ servicios: ['cocina', 'bano', 'enchapado'], respuestas: { acabado: [sel('estandar')] } });
    const filas = await AppDataSource.getRepository(RespuestaCotizacion).find({ where: { quoteId: res.body.data.id }, relations: { opcion: { pregunta: true } } });
    expect(filas.map((f) => f.opcion.pregunta.slug)).toEqual(['acabado']);
  });

  it('opción o pregunta inventada, dato extra faltante o inválido → 422 con el campo, y no se guarda nada', async () => {
    const antes = await AppDataSource.getRepository(Quote).count();
    const malas = [
      { servicios: ['cocina'], respuestas: { acabado: [sel('dorado')] } },
      { servicios: ['cocina'], respuestas: { 'pregunta-falsa': [sel('x')] } },
      { servicios: ['cocina'], respuestas: { area: [sel('sabe')] } }, // la opción pide el área y no viene
      { servicios: ['cocina'], respuestas: { area: [sel('sabe', 'mucho')] } }, // no es número
      { servicios: ['melamina'], respuestas: { 'melamina-muebles': [sel('otro')] } }, // "Otro" sin decir cuál
      { servicios: ['cocina'], respuestas: { acabado: [sel('estandar'), sel('granito')] } }, // una sola opción
      { servicios: ['volar'] },
    ];
    for (const m of malas) {
      const res = await enviar(m);
      expect(res.status, JSON.stringify(m)).toBe(422);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    }
    const res = await enviar({ servicios: ['cocina'], respuestas: { area: [sel('sabe')] } });
    expect(res.body.error.details[0].campo).toBe('respuestas.area.sabe');
    expect(await AppDataSource.getRepository(Quote).count()).toBe(antes);
  });

  it('la base impide repetir una opción en la misma cotización y guardar una respuesta sin opción', async () => {
    const res = await enviar({ servicios: ['cocina'], respuestas: { 'mueble-alto': [sel('si')] } });
    const respuestas = AppDataSource.getRepository(RespuestaCotizacion);
    const fila = await respuestas.findOneByOrFail({ quoteId: res.body.data.id });
    await expect(respuestas.insert({ quoteId: fila.quoteId, optionId: fila.optionId, valor: 'otra vez' })).rejects.toThrow(); // única
    await expect(respuestas.insert({ quoteId: fila.quoteId, optionId: null as never })).rejects.toThrow(); // opción obligatoria
  });

  it('al borrar la cotización se borran sus servicios y respuestas; el catálogo no se toca', async () => {
    const res = await enviar({ servicios: ['cocina'], respuestas: { 'mueble-alto': [sel('no')] } });
    const id = res.body.data.id as string;
    const respuestas = AppDataSource.getRepository(RespuestaCotizacion);
    expect(await respuestas.countBy({ quoteId: id })).toBe(1);
    await AppDataSource.getRepository(Quote).delete({ id });
    expect(await respuestas.countBy({ quoteId: id })).toBe(0);
    expect(await AppDataSource.getRepository(Servicio).countBy({ slug: 'cocina' })).toBe(1);
    const [{ n }] = await AppDataSource.query('SELECT count(*)::int AS n FROM quote_services WHERE quote_id = $1', [id]);
    expect(n).toBe(0);
  });

  it('no se puede borrar una opción que ya tiene respuestas (se desactiva)', async () => {
    const res = await enviar({ servicios: ['cocina'], respuestas: { 'mueble-alto': [sel('si')] } });
    const fila = await AppDataSource.getRepository(RespuestaCotizacion).findOneByOrFail({ quoteId: res.body.data.id });
    await expect(AppDataSource.query('DELETE FROM question_options WHERE id = $1', [fila.optionId])).rejects.toThrow();
  });
});

describe('Filtros para el panel (QuotesRepository.search)', () => {
  it('por servicio, por respuesta (opción o dato extra), por estado y combinados', async () => {
    const marca = `Filtro ${Date.now()}`;
    await enviar({ nombre: `${marca} A`, servicios: ['cocina'], respuestas: { 'mueble-alto': [sel('si')], estructura: [sel('cero')], area: [sel('sabe', 40)] } });
    await enviar({ nombre: `${marca} B`, servicios: ['cocina'], respuestas: { 'mueble-alto': [sel('no')], area: [sel('nose')] } });
    await enviar({ nombre: `${marca} C`, servicios: ['bano', 'techo'], respuestas: { 'cantidad-banos': [sel('2')], 'luces-empotradas': [sel('si')] } });
    await enviar({ nombre: `${marca} D`, servicios: ['bano'], respuestas: { 'cantidad-banos': [sel('mas', 6)] } });

    const nombres = async (f: Parameters<QuotesRepository['search']>[0]) => {
      const [filas] = await repo().search({ ...f, limit: 100 });
      return filas.map((q) => q.nombre).filter((n) => n.startsWith(marca)).map((n) => n.slice(-1)).sort();
    };

    expect(await nombres({ servicio: 'cocina' })).toEqual(['A', 'B']);
    expect(await nombres({ servicio: 'bano' })).toEqual(['C', 'D']);
    expect(await nombres({ respuestas: [{ pregunta: 'mueble-alto', opcion: 'si' }] })).toEqual(['A']);
    expect(await nombres({ respuestas: [{ pregunta: 'cantidad-banos', opcion: '2' }] })).toEqual(['C']);
    expect(await nombres({ respuestas: [{ pregunta: 'cantidad-banos', opcion: 'mas', valor: '6' }] })).toEqual(['D']);
    expect(await nombres({ respuestas: [{ pregunta: 'area', opcion: 'sabe', valor: '40' }] })).toEqual(['A']);
    expect(await nombres({ respuestas: [{ pregunta: 'area' }] })).toEqual(['A', 'B']); // cualquiera que haya contestado el área
    // varios filtros a la vez: cocinas con mueble alto Y estructura desde cero
    expect(await nombres({ servicio: 'cocina', respuestas: [{ pregunta: 'mueble-alto', opcion: 'si' }, { pregunta: 'estructura', opcion: 'cero' }] })).toEqual(['A']);
    expect(await nombres({ servicio: 'cocina', respuestas: [{ pregunta: 'mueble-alto', opcion: 'si' }, { pregunta: 'estructura', opcion: 'hay' }] })).toEqual([]);
    expect(await nombres({ estado: 'descartada' })).toEqual([]);
    expect(await nombres({ estado: 'nueva', servicio: 'techo' })).toEqual(['C']);
  });

  it('el listado trae los servicios de cada cotización completos (aunque se filtre por uno)', async () => {
    const marca = `Completa ${Date.now()}`;
    await enviar({ nombre: marca, servicios: ['bano', 'techo'] });
    const [filas] = await repo().search({ servicio: 'techo' });
    const q = filas.find((f) => f.nombre === marca)!;
    expect(q.servicios.map((s) => s.slug).sort()).toEqual(['bano', 'techo']);
  });

  it('pagina y ordena la más reciente primero', async () => {
    const [filas, total] = await repo().search({ page: 1, limit: 2 });
    expect(filas).toHaveLength(2);
    expect(total).toBeGreaterThan(2);
    expect(filas[0].createdAt.getTime()).toBeGreaterThanOrEqual(filas[1].createdAt.getTime());
  });
});
