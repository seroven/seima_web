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

describe('GET /quote-form (público)', () => {
  it('entrega los servicios y las preguntas para armar el formulario', async () => {
    const res = await agent().get(`${API}/quote-form`);
    expect(res.status).toBe(200);
    const { servicios, preguntas } = res.body.data;
    expect(servicios).toHaveLength(10);
    expect(servicios[0]).toEqual({ slug: 'cocina', nombre: 'Cocina', icono: 'cocinas' });
    expect(preguntas).toHaveLength(20);
    const acabado = preguntas.find((p: { slug: string }) => p.slug === 'acabado');
    expect(acabado.servicios.sort()).toEqual(['bano', 'cocina', 'departamento', 'enchapado']);
    expect(acabado.opciones.map((o: { slug: string }) => o.slug)).toEqual(['estandar', 'corte45', 'granito', 'recomiendame']);
    const banos = preguntas.find((p: { slug: string }) => p.slug === 'cantidad-banos');
    expect(banos).toMatchObject({ tipo: 'numero', min: 1, max: 5, opciones: [] });
  });
});

describe('POST /quotes guarda todo como filas', () => {
  it('servicios en quote_services y respuestas en quote_answers (opción única, varias opciones y número)', async () => {
    const res = await enviar({
      servicios: ['cocina', 'bano', 'melamina'],
      respuestas: { acabado: 'granito', 'mueble-alto': 'si', 'cantidad-banos': 2, 'melamina-muebles': ['closet', 'tv'] },
      notas: 'Entrada por el garaje',
    });
    expect(res.status).toBe(201);
    const q = await repo().findByIdFull(res.body.data.id);
    expect(q!.servicios.map((s) => s.slug).sort()).toEqual(['bano', 'cocina', 'melamina']);
    expect(q!.notas).toBe('Entrada por el garaje');
    const resumen = q!.respuestas.map((r) => `${r.pregunta.slug}=${r.opcion?.slug ?? r.valorNumero}`).sort();
    expect(resumen).toEqual(['acabado=granito', 'cantidad-banos=2', 'melamina-muebles=closet', 'melamina-muebles=tv', 'mueble-alto=si']);
  });

  it('la pregunta compartida (acabado) se guarda una sola vez aunque pidan varios servicios que la comparten', async () => {
    const res = await enviar({ servicios: ['cocina', 'bano', 'enchapado'], respuestas: { acabado: 'estandar' } });
    const filas = await AppDataSource.getRepository(RespuestaCotizacion).find({ where: { quoteId: res.body.data.id }, relations: { pregunta: true } });
    expect(filas.map((f) => f.pregunta.slug)).toEqual(['acabado']);
  });

  it('opción inventada, pregunta inventada o número fuera de rango → 422 con el campo, y no se guarda nada', async () => {
    const antes = await AppDataSource.getRepository(Quote).count();
    const malas = [
      { servicios: ['cocina'], respuestas: { acabado: 'dorado' } },
      { servicios: ['cocina'], respuestas: { 'pregunta-falsa': 'x' } },
      { servicios: ['bano'], respuestas: { 'cantidad-banos': 99 } },
      { servicios: ['volar'] },
    ];
    for (const m of malas) {
      const res = await enviar(m);
      expect(res.status, JSON.stringify(m)).toBe(422);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    }
    expect(await AppDataSource.getRepository(Quote).count()).toBe(antes);
  });

  it('la base impide guardar una respuesta con opción Y número a la vez (o ninguna)', async () => {
    const res = await enviar({ servicios: ['cocina'], respuestas: { 'mueble-alto': 'si' } });
    const fila = (await AppDataSource.getRepository(RespuestaCotizacion).findOneByOrFail({ quoteId: res.body.data.id }));
    await expect(AppDataSource.getRepository(RespuestaCotizacion).update(fila.id, { valorNumero: 3 })).rejects.toThrow();
    await expect(AppDataSource.getRepository(RespuestaCotizacion).update(fila.id, { optionId: null })).rejects.toThrow();
  });

  it('al borrar la cotización se borran sus servicios y respuestas; el catálogo no se toca', async () => {
    const res = await enviar({ servicios: ['cocina'], respuestas: { 'mueble-alto': 'no' } });
    const id = res.body.data.id as string;
    const respuestas = AppDataSource.getRepository(RespuestaCotizacion);
    expect(await respuestas.countBy({ quoteId: id })).toBe(1);
    await AppDataSource.getRepository(Quote).delete({ id });
    expect(await respuestas.countBy({ quoteId: id })).toBe(0);
    expect(await AppDataSource.getRepository(Servicio).countBy({ slug: 'cocina' })).toBe(1);
    const [{ n }] = await AppDataSource.query('SELECT count(*)::int AS n FROM quote_services WHERE quote_id = $1', [id]);
    expect(n).toBe(0);
  });
});

describe('Filtros para el panel (QuotesRepository.search)', () => {
  it('por servicio, por respuesta (opción o número), por estado y combinados', async () => {
    const marca = `Filtro ${Date.now()}`;
    await enviar({ nombre: `${marca} A`, servicios: ['cocina'], respuestas: { 'mueble-alto': 'si', estructura: 'cero' } });
    await enviar({ nombre: `${marca} B`, servicios: ['cocina'], respuestas: { 'mueble-alto': 'no' } });
    await enviar({ nombre: `${marca} C`, servicios: ['bano', 'techo'], respuestas: { 'cantidad-banos': 2, 'luces-empotradas': 'si' } });
    await enviar({ nombre: `${marca} D`, servicios: ['bano'], respuestas: { 'cantidad-banos': 3 } });

    const nombres = async (f: Parameters<QuotesRepository['search']>[0]) => {
      const [filas] = await repo().search({ ...f, limit: 100 });
      return filas.map((q) => q.nombre).filter((n) => n.startsWith(marca)).map((n) => n.slice(-1)).sort();
    };

    expect(await nombres({ servicio: 'cocina' })).toEqual(['A', 'B']);
    expect(await nombres({ servicio: 'bano' })).toEqual(['C', 'D']);
    expect(await nombres({ respuestas: [{ pregunta: 'mueble-alto', opcion: 'si' }] })).toEqual(['A']);
    expect(await nombres({ respuestas: [{ pregunta: 'cantidad-banos', valor: 2 }] })).toEqual(['C']);
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
