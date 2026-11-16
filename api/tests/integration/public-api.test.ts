import { describe, expect, it } from 'vitest';
import { AppDataSource } from '../../src/database/data-source';
import { QuotePhoto } from '../../src/modules/quotes/quote-photo.entity';
import { RespuestaCotizacion } from '../../src/modules/quotes/respuesta-cotizacion.entity';
import { Quote } from '../../src/modules/quotes/quote.entity';
import { API, agent, cotizacionValida, useDatabase } from './helpers';

useDatabase();

describe('GET /health', () => {
  it('responde ok con la base conectada', async () => {
    const res = await agent().get(`${API}/health`);
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ status: 'ok', db: 'up' });
  });
});

describe('GET /categories (público)', () => {
  it('devuelve las categorías activas en orden', async () => {
    const res = await agent().get(`${API}/categories`);
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(8);
    expect(res.body.data[0]).toEqual({ slug: 'cocinas', nombre: 'Cocinas', orden: 0 });
  });
});

describe('GET /projects (público)', () => {
  it('lista los proyectos publicados con su portada', async () => {
    const res = await agent().get(`${API}/projects`);
    expect(res.status).toBe(200);
    expect(res.body.meta).toMatchObject({ page: 1, total: 7 });
    const cocina = res.body.data.find((p: { slug: string }) => p.slug === 'cocina-drywall-porcelanato');
    expect(cocina.portada.despues.esPrincipal).toBe(true);
    expect(cocina.portada.antes.etapa).toBe('antes');
    expect(cocina).not.toHaveProperty('fotos'); // la lista no manda toda la galería
  });

  it('pone los destacados primero', async () => {
    const res = await agent().get(`${API}/projects`);
    const flags = res.body.data.map((p: { destacado: boolean }) => p.destacado);
    expect(flags.slice(0, 3)).toEqual([true, true, true]);
  });

  it('filtra por categoría (categoria y alias category) y por destacado', async () => {
    const a = await agent().get(`${API}/projects?categoria=locales`);
    const b = await agent().get(`${API}/projects?category=locales`);
    expect(a.body.data.map((p: { slug: string }) => p.slug)).toEqual(['local-comercial-acabados']);
    expect(b.body.data).toEqual(a.body.data);
    const d = await agent().get(`${API}/projects?destacado=true`);
    expect(d.body.data).toHaveLength(3);
  });

  it('pagina', async () => {
    const res = await agent().get(`${API}/projects?limit=3&page=3`);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.meta).toMatchObject({ page: 3, limit: 3, total: 7, totalPages: 3 });
  });

  it('rechaza parámetros inválidos con 422 en español', async () => {
    const res = await agent().get(`${API}/projects?limit=9999&categoria=Mala%20Categoria`);
    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(res.body.error.details.map((d: { campo: string }) => d.campo).sort()).toEqual(['categoria', 'limit']);
  });
});

describe('GET /projects/:slug (público)', () => {
  it('devuelve la galería agrupada por etapa y ordenada, con una sola principal por etapa', async () => {
    const res = await agent().get(`${API}/projects/mini-departamento-drywall`);
    expect(res.status).toBe(200);
    const { fotos } = res.body.data;
    expect([fotos.antes.length, fotos.durante.length, fotos.despues.length]).toEqual([5, 8, 10]);
    for (const etapa of ['antes', 'durante', 'despues'] as const) {
      expect(fotos[etapa].filter((f: { esPrincipal: boolean }) => f.esPrincipal)).toHaveLength(1);
      expect(fotos[etapa].map((f: { orden: number }) => f.orden)).toEqual([...fotos[etapa].map((f: { orden: number }) => f.orden)].sort((x, y) => x - y));
    }
  });

  it('tolera una etapa sin fotos', async () => {
    const res = await agent().get(`${API}/projects/falso-techo-drywall`);
    expect(res.body.data.fotos.durante).toEqual([]);
    expect(res.body.data.portada.despues).not.toBeNull();
  });

  it('no inventa URL para fotos de prueba (demo/…)', async () => {
    const res = await agent().get(`${API}/projects/closet-melamina`);
    expect(res.body.data.fotos.antes[0].url).toBeNull();
  });

  it('404 si no existe', async () => {
    const res = await agent().get(`${API}/projects/no-existe`);
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });
});

describe('POST /quotes (público)', () => {
  it('guarda la solicitud y devuelve el resumen', async () => {
    const res = await agent()
      .post(`${API}/quotes`)
      .send({ ...cotizacionValida, servicios: ['cocina', 'departamento', 'cocina'], respuestas: { area: [{ opcion: 'sabe', valor: '12' }], acabado: [{ opcion: 'corte45' }], 'mueble-alto': [{ opcion: 'si' }], estructura: [{ opcion: 'cero' }], ambientes: [{ opcion: '3' }] }, notas: 'Hay un perro en casa', fotos: ['seima/quotes/uno', 'seima/quotes/dos'], proyecto: 'cocina-drywall-porcelanato' });
    expect(res.status).toBe(201);
    const { id, mensaje } = res.body.data;
    expect(id).toMatch(/^[0-9a-f-]{36}$/);
    expect(mensaje).toContain('*Nueva solicitud · SEIMA web*');
    expect(mensaje).toContain('Servicios: Cocina, Departamento completo'); // sin duplicados
    expect(mensaje).toContain('Área: Sé el área aproximada: 12 m²');
    expect(mensaje).toContain('Acabado: Corte 45° + resina');
    expect(mensaje).toContain('Mueble alto: Sí');
    expect(mensaje).toContain('Ambientes: 3');
    expect(mensaje).toContain('Estructura: Desde cero');
    expect(mensaje).toContain('Notas: Hay un perro en casa');
    expect(mensaje).toContain('Referencia: proyecto «Cocina en drywall y porcelanato»');
    expect(mensaje).toContain('Contacto: Ana Prueba · 987 654 321');
  });

  it('acepta EXACTAMENTE el cuerpo que arma el cotizador de la web (cadenas vacías y null incluidos)', async () => {
    // Forma real del cuerpo que arma web/src/lib/quote.ts → submitQuote (whatsapp y ruc ya vienen solo con dígitos)
    const deLaWeb = {
      cliente: 'persona', servicios: ['pintura'], respuestas: { 'pintura-zona': [{ opcion: 'interior', valor: null }], area: [{ opcion: 'nose', valor: '' }] }, notas: '',
      distrito: 'Los Olivos', plazo: 'asap', fotos: [], nombre: 'Ana Test', whatsapp: '987654321', consentimiento: true, website: '',
      razonSocial: '', ruc: '', proyecto: null,
    };
    const res = await agent().post(`${API}/quotes`).send(deLaWeb);
    expect(res.status).toBe(201);
    expect(res.body.data.mensaje).toContain('Área: Aún no lo sé');
    expect(res.body.data.mensaje).toContain('Zona: Interior');
    expect(res.body.data.mensaje).toContain('Contacto: Ana Test · 987 654 321');
  });

  it('guarda las fotos subidas (public_id), la constancia de consentimiento y deja la solicitud lista para el panel', async () => {
    const res = await agent().post(`${API}/quotes`).send({ ...cotizacionValida, fotos: ['seima/quotes/abc123', 'seima/quotes/def456'] });
    expect(res.status).toBe(201);
    const fila = await AppDataSource.getRepository(Quote).findOneOrFail({ where: { id: res.body.data.id }, relations: { fotos: true }, order: { fotos: { orden: 'ASC' } } });
    expect(fila.fotos.map((f) => [f.orden, f.cloudinaryId])).toEqual([
      [0, 'seima/quotes/abc123'],
      [1, 'seima/quotes/def456'],
    ]);
    expect(fila.consentimientoEn).toBeInstanceOf(Date);
    expect(fila.estado).toBe('nueva');
    expect(fila.mensaje).toContain('Fotos: 2 adjuntas');
  });

  it('las fotos viven en su propia tabla: se borran con la cotización y no se repite el orden', async () => {
    const res = await agent().post(`${API}/quotes`).send({ ...cotizacionValida, fotos: ['seima/quotes/borrar1', 'seima/quotes/borrar2'] });
    const id = res.body.data.id as string;
    const fotos = AppDataSource.getRepository(QuotePhoto);
    expect(await fotos.countBy({ quoteId: id })).toBe(2);
    // dos fotos con el mismo orden en la misma cotización: la base lo rechaza
    await expect(fotos.insert({ quoteId: id, cloudinaryId: 'seima/quotes/otra', orden: 0 })).rejects.toThrow();
    await AppDataSource.getRepository(Quote).delete({ id });
    expect(await fotos.countBy({ quoteId: id })).toBe(0); // ON DELETE CASCADE
  });

  it('sin fotos no crea filas de fotos', async () => {
    const res = await agent().post(`${API}/quotes`).send(cotizacionValida);
    expect(await AppDataSource.getRepository(QuotePhoto).countBy({ quoteId: res.body.data.id })).toBe(0);
  });

  it('sin consentimiento → 422 y no se guarda', async () => {
    const antes = await AppDataSource.getRepository(Quote).count();
    const res = await agent().post(`${API}/quotes`).send({ ...cotizacionValida, consentimiento: false });
    expect(res.status).toBe(422);
    expect(res.body.error.details[0].campo).toBe('consentimiento');
    expect(await AppDataSource.getRepository(Quote).count()).toBe(antes);
  });

  it('fotos que no son de la carpeta de cotizaciones → 422', async () => {
    const res = await agent().post(`${API}/quotes`).send({ ...cotizacionValida, fotos: ['otra-carpeta/foto'] });
    expect(res.status).toBe(422);
  });

  it('robot (campo trampa lleno): 201 aparente pero no se guarda nada', async () => {
    const antes = await AppDataSource.getRepository(Quote).count();
    const res = await agent().post(`${API}/quotes`).send({ ...cotizacionValida, website: 'http://spam.example' });
    expect(res.status).toBe(201);
    expect(await AppDataSource.getRepository(Quote).count()).toBe(antes);
  });

  it('ignora las respuestas de preguntas que no aplican a los servicios elegidos', async () => {
    const res = await agent().post(`${API}/quotes`).send({ ...cotizacionValida, servicios: ['pintura'], respuestas: { acabado: [{ opcion: 'granito' }], 'mueble-alto': [{ opcion: 'si' }], ambientes: [{ opcion: '5' }] } });
    expect(res.status).toBe(201);
    expect(res.body.data.mensaje).not.toContain('Acabado');
    expect(res.body.data.mensaje).not.toContain('Mueble alto');
    expect(res.body.data.mensaje).not.toContain('Ambientes');
    expect(await AppDataSource.getRepository(RespuestaCotizacion).countBy({ quoteId: res.body.data.id })).toBe(0);
  });

  it('empresa exige razón social; el RUC debe tener 11 dígitos', async () => {
    const base = { ...cotizacionValida, cliente: 'empresa', servicios: ['local'] };
    const sin = await agent().post(`${API}/quotes`).send(base);
    expect(sin.status).toBe(422);
    expect(sin.body.error.details[0].campo).toBe('razonSocial');
    const ruc = await agent().post(`${API}/quotes`).send({ ...base, razonSocial: 'Constructora Demo SAC', ruc: '123' });
    expect(ruc.status).toBe(422);
    const ok = await agent().post(`${API}/quotes`).send({ ...base, razonSocial: 'Constructora Demo SAC', ruc: '20123456789' });
    expect(ok.status).toBe(201);
    expect(ok.body.data.mensaje).toContain('Cliente: Empresa — Constructora Demo SAC (RUC 20123456789)');
  });

  it.each([
    ['celular inválido', { whatsapp: '123' }],
    ['servicio desconocido', { servicios: ['volar'] }],
    ['sin servicios', { servicios: [] }],
    ['plazo desconocido', { plazo: 'ayer' }],
    ['nombre muy corto', { nombre: 'A' }],
  ])('rechaza %s con 422', async (_caso, cambio) => {
    const res = await agent().post(`${API}/quotes`).send({ ...cotizacionValida, ...cambio });
    expect(res.status).toBe(422);
  });

  it('un proyecto de referencia inexistente no rompe la solicitud', async () => {
    const res = await agent().post(`${API}/quotes`).send({ ...cotizacionValida, proyecto: 'no-existe' });
    expect(res.status).toBe(201);
    expect(res.body.data.mensaje).not.toContain('Referencia');
  });

  it('JSON mal formado → 400', async () => {
    const res = await agent().post(`${API}/quotes`).set('Content-Type', 'application/json').send('{rota');
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('BAD_JSON');
  });
});

describe('Seguridad general', () => {
  it('envía cabeceras de helmet y no revela Express', async () => {
    const res = await agent().get(`${API}/health`);
    expect(res.headers['x-powered-by']).toBeUndefined();
    expect(res.headers['x-content-type-options']).toBe('nosniff');
  });

  it('CORS: permite el origen de la web y no el de extraños', async () => {
    const ok = await agent().get(`${API}/health`).set('Origin', 'http://localhost:4321');
    expect(ok.headers['access-control-allow-origin']).toBe('http://localhost:4321');
    const mal = await agent().get(`${API}/health`).set('Origin', 'https://sitio-malicioso.com');
    expect(mal.headers['access-control-allow-origin']).toBeUndefined();
  });

  it('ruta inexistente → 404 con el formato de error de la API', async () => {
    const res = await agent().get(`${API}/nada`);
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });
});
