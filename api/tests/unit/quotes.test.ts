import { describe, expect, it, vi } from 'vitest';
import type { AppError } from '../../src/common/errors/app-error';
import type { CatalogRepository } from '../../src/modules/catalog/catalog.repository';
import type { ProjectsRepository } from '../../src/modules/projects/projects.repository';
import { buildQuoteMessage, type MessageInput } from '../../src/modules/quotes/quote-message';
import type { QuotesRepository } from '../../src/modules/quotes/quotes.repository';
import { createQuoteSchema, type CreateQuoteInput } from '../../src/modules/quotes/quotes.schemas';
import { QuotesService } from '../../src/modules/quotes/quotes.service';
import { rejected } from './fakes';

const valida = {
  cliente: 'persona', servicios: ['cocina'],
  distrito: 'Comas', plazo: '1mes', nombre: 'Ana Prueba', whatsapp: '987 654 321', consentimiento: true,
};
const foto = (n: number | string) => `seima/quotes/foto${n}`;
const parse = (extra: Record<string, unknown> = {}) => createQuoteSchema.safeParse({ ...valida, ...extra });
const ok = (extra: Record<string, unknown> = {}) => {
  const r = parse(extra);
  if (!r.success) throw new Error(JSON.stringify(r.error.issues));
  return r.data;
};

describe('createQuoteSchema', () => {
  it('acepta un pedido válido y normaliza (whatsapp solo dígitos, defaults)', () => {
    expect(ok()).toMatchObject({ whatsapp: '987654321', fotos: [], respuestas: {} });
  });

  it('el consentimiento es obligatorio y debe ser exactamente true', () => {
    expect(parse({ consentimiento: undefined }).success).toBe(false);
    expect(parse({ consentimiento: false }).success).toBe(false);
    expect(parse({ consentimiento: 'true' }).success).toBe(false);
    expect(parse({ consentimiento: true }).success).toBe(true);
  });

  it('fotos: solo public_id de la carpeta de cotizaciones, sin repetidos, máximo 6', () => {
    expect(ok({ fotos: [foto(1), foto(1), foto(2)] }).fotos).toEqual([foto(1), foto(2)]);
    for (const mala of ['otra/carpeta/x', 'seima/quotes', 'seima/quotes/../secreto', 'seima/quotesX/a', 'http://evil.com/x.jpg', '', 'seima/quotes/a b']) {
      expect(parse({ fotos: [mala] }).success, mala).toBe(false);
    }
    expect(parse({ fotos: [1] }).success).toBe(false);
    expect(parse({ fotos: Array.from({ length: 6 }, (_, i) => foto(i)) }).success).toBe(true);
  });

  it('el campo trampa vacío = no enviado; lleno se conserva (el servicio lo descarta)', () => {
    expect(ok({ website: '' }).website).toBeUndefined();
    expect(ok({ website: 'spam' }).website).toBe('spam');
  });

  it('servicios: son slugs; se quitan repetidos; mínimo 1 y máximo 10', () => {
    expect(ok({ servicios: ['cocina', 'bano', 'cocina'] }).servicios).toEqual(['cocina', 'bano']);
    expect(parse({ servicios: [] }).success).toBe(false);
    expect(parse({ servicios: ['Con Mayúsculas'] }).success).toBe(false);
    expect(parse({ servicios: Array.from({ length: 11 }, (_, i) => `s${i}`) }).success).toBe(false);
  });

  it('respuestas: { pregunta: [{ opcion, valor? }] }; el valor (texto o número) llega como texto; vacío = sin dato', () => {
    const d = ok({ respuestas: { 'mueble-alto': [{ opcion: 'si' }], area: [{ opcion: 'sabe', valor: 85 }], muebles: [{ opcion: 'closet', valor: '' }, { opcion: 'otro', valor: 'repisa' }, { opcion: 'tv', valor: null }] } });
    expect(d.respuestas).toEqual({
      'mueble-alto': [{ opcion: 'si', valor: undefined }],
      area: [{ opcion: 'sabe', valor: '85' }],
      muebles: [{ opcion: 'closet', valor: undefined }, { opcion: 'otro', valor: 'repisa' }, { opcion: 'tv', valor: undefined }],
    });
  });

  it('respuestas: rechaza formas inválidas', () => {
    expect(parse({ respuestas: { 'Mala Clave': [{ opcion: 'x' }] } }).success).toBe(false);
    expect(parse({ respuestas: { ok: 'si' } }).success).toBe(false); // el viejo formato (texto suelto) ya no se acepta
    expect(parse({ respuestas: { ok: [] } }).success).toBe(false);
    expect(parse({ respuestas: { ok: [{ opcion: 'Mala Opcion' }] } }).success).toBe(false);
    expect(parse({ respuestas: { ok: [{ opcion: 'a', valor: { x: 1 } }] } }).success).toBe(false);
    expect(parse({ respuestas: 'texto' }).success).toBe(false);
  });

  it('notas: opcional, se recorta, vacío = no enviado y máximo 500 caracteres', () => {
    expect(ok({ notas: '  Hay un perro en casa  ' }).notas).toBe('Hay un perro en casa');
    expect(ok({ notas: '' }).notas).toBeUndefined();
    expect(ok({ notas: 'x'.repeat(500) }).notas).toHaveLength(500);
    expect(parse({ notas: 'x'.repeat(501) }).success).toBe(false);
  });

  it.each([['987654321', true], ['987 654 321', true], ['987-654-321', true], ['887654321', false], ['98765432', false], ['9876543210', false], ['', false]])('whatsapp %j → válido: %s', (w, esperado) =>
    expect(parse({ whatsapp: w }).success).toBe(esperado),
  );

  it('empresa exige razón social; persona no', () => {
    expect(parse({ cliente: 'empresa' }).success).toBe(false);
    expect(parse({ cliente: 'empresa', razonSocial: '' }).success).toBe(false);
    expect(parse({ cliente: 'empresa', razonSocial: 'Constructora Demo SAC' }).success).toBe(true);
    expect(parse({ cliente: 'persona' }).success).toBe(true);
  });

  it('RUC: opcional, 11 dígitos, vacío permitido', () => {
    const e = { cliente: 'empresa', razonSocial: 'Demo SAC' };
    expect(ok({ ...e, ruc: '20123456789' }).ruc).toBe('20123456789');
    expect(ok({ ...e, ruc: '' }).ruc).toBeUndefined();
    expect(parse({ ...e, ruc: '123' }).success).toBe(false);
  });

  it('acepta null en los campos opcionales que manda la web', () => {
    expect(parse({ proyecto: null, notas: null }).success).toBe(true);
  });

  it('rechaza valores fuera de catálogo fijo', () => {
    for (const mal of [{ plazo: 'ayer' }, { cliente: 'robot' }, { fotos: Array.from({ length: 7 }, (_, i) => foto(i)) }, { nombre: 'A' }, { distrito: 'x' }, { proyecto: 'Con Mayúsculas' }]) {
      expect(parse(mal).success, JSON.stringify(mal)).toBe(false);
    }
  });

  it('recorta espacios del nombre y distrito', () => {
    expect(ok({ nombre: '  Ana  ', distrito: ' Comas ' })).toMatchObject({ nombre: 'Ana', distrito: 'Comas' });
  });
});

describe('buildQuoteMessage', () => {
  const base: MessageInput = {
    cliente: 'persona', servicios: ['Pintura'], respuestas: [], distrito: 'Comas', plazo: 'asap', notas: null, fotos: 0,
    nombre: 'Ana', whatsapp: '987654321', razonSocial: null, ruc: null,
  };
  const msg = (o: Partial<MessageInput> = {}, t?: string | null) => buildQuoteMessage({ ...base, ...o }, t);

  it('mensaje mínimo', () => {
    expect(msg().split('\n')).toEqual([
      '*Nueva solicitud · SEIMA web*', 'Cliente: Persona', 'Servicios: Pintura',
      'Distrito: Comas · Plazo: Lo antes posible', 'Fotos: sin fotos', 'Contacto: Ana · 987 654 321',
    ]);
  });
  it('empresa con y sin RUC', () => {
    expect(msg({ cliente: 'empresa', razonSocial: 'Demo SAC', ruc: '20123456789' })).toContain('Cliente: Empresa — Demo SAC (RUC 20123456789)');
    expect(msg({ cliente: 'empresa', razonSocial: 'Demo SAC' })).toContain('Cliente: Empresa — Demo SAC\n');
  });
  it('cada respuesta es una línea "etiqueta: valor", justo después de los servicios y antes del lugar', () => {
    const lineas = msg({ respuestas: [{ etiqueta: 'Área', valor: 'Sé el área: 85 m²' }, { etiqueta: 'Baños', valor: '2' }] }).split('\n');
    expect(lineas.indexOf('Área: Sé el área: 85 m²')).toBe(lineas.findIndex((l) => l.startsWith('Servicios:')) + 1);
    expect(lineas).toContain('Baños: 2');
    expect(lineas.indexOf('Baños: 2')).toBeLessThan(lineas.findIndex((l) => l.startsWith('Distrito:')));
  });
  it('notas, fotos y proyecto de referencia', () => {
    const m = msg({ fotos: 2, notas: 'Hay un perro en casa' }, 'Cocina en drywall');
    expect(m).toContain('Notas: Hay un perro en casa');
    expect(m).toContain('Fotos: 2 adjuntas');
    expect(msg({ fotos: 1 })).toContain('Fotos: 1 adjunta\n');
    expect(m).toContain('Referencia: proyecto «Cocina en drywall»');
    expect(msg()).not.toContain('Referencia');
    expect(msg()).not.toContain('Notas:');
  });
  it('varios servicios en orden', () => {
    expect(msg({ servicios: ['Cocina', 'Baño'] })).toContain('Servicios: Cocina, Baño');
  });
});

/* ---------- Servicio, con un catálogo falso (sin base de datos) ---------- */
const SERVICIOS = ['cocina', 'bano', 'pintura'].map((slug) => ({ id: `s-${slug}`, slug, nombre: slug === 'bano' ? 'Baño' : slug[0].toUpperCase() + slug.slice(1) }));
const op = (slug: string, etiqueta: string, extra: Record<string, unknown> = {}) => ({ id: `o-${slug}`, slug, etiqueta, activo: true, tipoEntrada: 'ninguna', entradaAyuda: null, ...extra });
const PREGUNTAS = [
  { id: 'p-area', slug: 'area', etiqueta: 'Área', tipo: 'unica', opciones: [op('sabe', 'Sé el área', { id: 'o-area-sabe', tipoEntrada: 'numero', entradaAyuda: 'm²' }), op('nose', 'Aún no lo sé', { id: 'o-area-nose' })], servicios: [{ slug: 'cocina' }, { slug: 'bano' }, { slug: 'pintura' }] },
  { id: 'p-acabado', slug: 'acabado', etiqueta: 'Acabado', tipo: 'unica', opciones: [op('estandar', 'Estándar'), op('granito', 'Granito')], servicios: [{ slug: 'cocina' }, { slug: 'bano' }] },
  { id: 'p-alto', slug: 'mueble-alto', etiqueta: 'Mueble alto', tipo: 'unica', opciones: [op('si', 'Sí'), op('no', 'No')], servicios: [{ slug: 'cocina' }] },
  { id: 'p-banos', slug: 'cantidad-banos', etiqueta: 'Baños', tipo: 'unica', opciones: [op('2', '2', { id: 'o-banos-2' }), op('mas', 'Más de 4', { id: 'o-banos-mas', tipoEntrada: 'numero', entradaAyuda: 'baños' })], servicios: [{ slug: 'bano' }] },
];

describe('QuotesService', () => {
  function armar(proyecto: { id: string; titulo: string } | null = null) {
    const quotes = { create: vi.fn(async (d: Record<string, unknown>) => ({ id: 'q-1', createdAt: new Date('2026-03-04T05:06:07Z'), ...d })) };
    const projects = { findPublishedBySlug: vi.fn().mockResolvedValue(proyecto) };
    const catalog = {
      findActiveServicesBySlugs: vi.fn(async (slugs: string[]) => SERVICIOS.filter((s) => slugs.includes(s.slug))),
      findActiveQuestions: vi.fn(async () => PREGUNTAS),
    };
    const svc = new QuotesService(quotes as unknown as QuotesRepository, projects as unknown as ProjectsRepository, catalog as unknown as CatalogRepository);
    const crear = (extra: Record<string, unknown> = {}) => svc.create(ok(extra) as CreateQuoteInput);
    return { quotes, projects, catalog, crear, guardado: () => quotes.create.mock.calls[0][0] as Record<string, unknown> };
  }

  it('devuelve id, mensaje y fecha; guarda el mismo mensaje', async () => {
    const t = armar();
    const r = await t.crear();
    expect(r).toEqual({ id: 'q-1', mensaje: expect.stringContaining('*Nueva solicitud · SEIMA web*'), creadaEn: '2026-03-04T05:06:07.000Z' });
    expect(t.guardado().mensaje).toBe(r.mensaje);
  });

  it('guarda cada servicio como fila (por id) y el resumen con sus nombres', async () => {
    const t = armar();
    const r = await t.crear({ servicios: ['cocina', 'bano'] });
    expect(t.guardado().servicios).toEqual([{ id: 's-cocina' }, { id: 's-bano' }]);
    expect(r.mensaje).toContain('Servicios: Cocina, Baño');
  });

  it('guarda cada respuesta como fila (opción + dato extra) y la pone en el resumen', async () => {
    const t = armar();
    const r = await t.crear({
      servicios: ['cocina', 'bano'],
      respuestas: { area: [{ opcion: 'sabe', valor: '85' }], acabado: [{ opcion: 'granito' }], 'mueble-alto': [{ opcion: 'si' }], 'cantidad-banos': [{ opcion: 'mas', valor: '6' }] },
    });
    expect(t.guardado().respuestas).toEqual([
      { optionId: 'o-area-sabe', valor: '85' },
      { optionId: 'o-granito', valor: null },
      { optionId: 'o-si', valor: null },
      { optionId: 'o-banos-mas', valor: '6' },
    ]);
    expect(r.mensaje).toContain('Área: Sé el área: 85 m²');
    expect(r.mensaje).toContain('Acabado: Granito');
    expect(r.mensaje).toContain('Mueble alto: Sí');
    expect(r.mensaje).toContain('Baños: Más de 4: 6 baños');
  });

  it('descarta las respuestas de preguntas que no aplican a los servicios elegidos', async () => {
    const t = armar();
    await t.crear({ servicios: ['pintura'], respuestas: { acabado: [{ opcion: 'granito' }], 'mueble-alto': [{ opcion: 'si' }] } });
    expect(t.guardado().respuestas).toEqual([]);
  });

  it('servicio que no existe o no está activo → 422 y no se guarda nada', async () => {
    const t = armar();
    const e = (await rejected(t.crear({ servicios: ['cocina', 'volar'] }))) as AppError;
    expect(e.status).toBe(422);
    expect((e.details as { mensaje: string }[])[0].mensaje).toContain('volar');
    expect(t.quotes.create).not.toHaveBeenCalled();
  });

  it('opción o pregunta inventada, o dato extra faltante → 422 y no se guarda nada', async () => {
    const t = armar();
    expect(((await rejected(t.crear({ respuestas: { acabado: [{ opcion: 'dorado' }] } }))) as AppError).status).toBe(422);
    expect(((await rejected(t.crear({ respuestas: { fantasma: [{ opcion: 'x' }] } }))) as AppError).status).toBe(422);
    expect(((await rejected(t.crear({ respuestas: { area: [{ opcion: 'sabe' }] } }))) as AppError).status).toBe(422);
    expect(t.quotes.create).not.toHaveBeenCalled();
  });

  it('las notas se guardan (recortadas) y salen en el resumen; sin notas, null', async () => {
    const t = armar();
    const r = await t.crear({ notas: '  Hay un perro en casa  ' });
    expect(t.guardado().notas).toBe('Hay un perro en casa');
    expect(r.mensaje).toContain('Notas: Hay un perro en casa');
    const u = armar();
    await u.crear();
    expect(u.guardado().notas).toBeNull();
  });

  it('ya no guarda columnas de medidas (son una respuesta más)', async () => {
    const t = armar();
    await t.crear();
    for (const campo of ['medidasModo', 'largo', 'ancho', 'areaM2']) expect(t.guardado()).not.toHaveProperty(campo);
  });

  it('razón social y RUC solo se guardan para empresas', async () => {
    const persona = armar();
    await persona.crear({ razonSocial: 'Demo SAC', ruc: '20123456789' });
    expect(persona.guardado()).toMatchObject({ razonSocial: null, ruc: null });
    const empresa = armar();
    await empresa.crear({ cliente: 'empresa', razonSocial: 'Demo SAC', ruc: '20123456789' });
    expect(empresa.guardado()).toMatchObject({ razonSocial: 'Demo SAC', ruc: '20123456789' });
  });

  it('enlaza el proyecto de referencia y lo cita en el mensaje', async () => {
    const t = armar({ id: 'proj-9', titulo: 'Baño completo' });
    const r = await t.crear({ proyecto: 'bano-completo' });
    expect(t.projects.findPublishedBySlug).toHaveBeenCalledWith('bano-completo');
    expect(t.guardado().proyectoId).toBe('proj-9');
    expect(r.mensaje).toContain('Referencia: proyecto «Baño completo»');
  });

  it('proyecto inexistente: no falla, no se enlaza; sin proyecto ni se consulta', async () => {
    const a = armar(null);
    await a.crear({ proyecto: 'no-existe' });
    expect(a.guardado().proyectoId).toBeNull();
    const b = armar();
    await b.crear();
    expect(b.projects.findPublishedBySlug).not.toHaveBeenCalled();
  });

  it('guarda los public_id de las fotos subidas, la constancia de consentimiento y el contacto normalizado', async () => {
    const t = armar();
    const antes = Date.now();
    const r = await t.crear({ fotos: [foto(1), foto(2)] });
    expect(t.guardado()).toMatchObject({ whatsapp: '987654321', nombre: 'Ana Prueba', distrito: 'Comas' });
    expect(t.guardado().fotos).toEqual([
      { cloudinaryId: foto(1), orden: 0 },
      { cloudinaryId: foto(2), orden: 1 },
    ]);
    expect((t.guardado().consentimientoEn as Date).getTime()).toBeGreaterThanOrEqual(antes);
    expect(r.mensaje).toContain('Fotos: 2 adjuntas');
  });

  it('sin fotos, no se guarda ninguna fila de fotos', async () => {
    const t = armar();
    await t.crear();
    expect(t.guardado().fotos).toEqual([]);
  });

  it('campo trampa lleno (robot): responde como si nada pero NO guarda ni consulta nada', async () => {
    const t = armar();
    const r = await t.crear({ website: 'http://spam.example' });
    expect(r.id).toMatch(/^[0-9a-f-]{36}$/);
    expect(t.quotes.create).not.toHaveBeenCalled();
    expect(t.projects.findPublishedBySlug).not.toHaveBeenCalled();
    expect(t.catalog.findActiveServicesBySlugs).not.toHaveBeenCalled();
  });
});
