import { describe, expect, it, vi } from 'vitest';
import { buildQuoteMessage, medidasTexto, type MessageInput } from '../../src/modules/quotes/quote-message';
import type { ProjectsRepository } from '../../src/modules/projects/projects.repository';
import type { QuotesRepository } from '../../src/modules/quotes/quotes.repository';
import { createQuoteSchema, type CreateQuoteInput } from '../../src/modules/quotes/quotes.schemas';
import { QuotesService } from '../../src/modules/quotes/quotes.service';

const valida = {
  cliente: 'persona', servicios: ['cocina'], medidasModo: 'lxa', largo: '4', ancho: '3',
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
  it('acepta un pedido válido y normaliza (whatsapp solo dígitos, números, defaults)', () => {
    const d = ok();
    expect(d).toMatchObject({ whatsapp: '987654321', largo: 4, ancho: 3, fotos: [], medidasModo: 'lxa' });
  });

  it.each([
    ['4,5', 4.5],
    ['4.5', 4.5],
    [4, 4],
    ['  7 ', 7],
  ])('número %j → %j', (entrada, esperado) => expect(ok({ largo: entrada }).largo).toBe(esperado));

  it.each([[''], [null], ['   ']])('largo vacío (%j) = no enviado', (v) => expect(ok({ largo: v }).largo).toBeUndefined());
  it.each([['0'], ['-3'], ['abc'], ['100001']])('largo inválido %j', (v) => expect(parse({ largo: v }).success).toBe(false));

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
    expect(parse({ fotos: [1] }).success).toBe(false); // el viejo formato (un número) ya no se acepta
    expect(parse({ fotos: Array.from({ length: 6 }, (_, i) => foto(i)) }).success).toBe(true);
  });

  it('el campo trampa vacío = no enviado; lleno se conserva (el servicio lo descarta)', () => {
    expect(ok({ website: '' }).website).toBeUndefined();
    expect(ok({ website: 'spam' }).website).toBe('spam');
  });

  it('quita servicios repetidos', () => {
    expect(ok({ servicios: ['cocina', 'bano', 'cocina'] }).servicios).toEqual(['cocina', 'bano']);
  });
  it('rechaza servicios vacíos, desconocidos o más de 10', () => {
    expect(parse({ servicios: [] }).success).toBe(false);
    expect(parse({ servicios: ['volar'] }).success).toBe(false);
    expect(parse({ servicios: Array(11).fill('cocina') }).success).toBe(false);
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
    expect(parse({ acabado: null, muebleAlto: null, estructura: null, ambientes: null, proyecto: null }).success).toBe(true);
  });

  it('rechaza valores fuera de catálogo', () => {
    for (const mal of [{ plazo: 'ayer' }, { cliente: 'robot' }, { acabado: 'oro' }, { muebleAlto: 'tal vez' }, { ambientes: 11 }, { fotos: Array.from({ length: 7 }, (_, i) => foto(i)) }, { nombre: 'A' }, { distrito: 'x' }, { proyecto: 'Con Mayúsculas' }]) {
      expect(parse(mal).success, JSON.stringify(mal)).toBe(false);
    }
  });

  it('recorta espacios del nombre y distrito', () => {
    expect(ok({ nombre: '  Ana  ', distrito: ' Comas ' })).toMatchObject({ nombre: 'Ana', distrito: 'Comas' });
  });
});

describe('medidasTexto', () => {
  it('por definir en "nose", sin área o sin dimensiones', () => {
    expect(medidasTexto({ medidasModo: 'nose', largo: null, ancho: null, areaM2: null })).toBe('por definir');
    expect(medidasTexto({ medidasModo: 'm2', largo: null, ancho: null, areaM2: null })).toBe('por definir');
    expect(medidasTexto({ medidasModo: 'lxa', largo: null, ancho: 3, areaM2: 12 })).toBe('por definir');
  });
  it('m² directos y largo × ancho', () => {
    expect(medidasTexto({ medidasModo: 'm2', largo: null, ancho: null, areaM2: 25 })).toBe('25 m²');
    expect(medidasTexto({ medidasModo: 'lxa', largo: 4, ancho: 3, areaM2: 12 })).toBe('4 × 3 m (≈ 12 m²)');
  });
});

describe('buildQuoteMessage', () => {
  const base: MessageInput = {
    cliente: 'persona', servicios: ['pintura'], medidasModo: 'nose', largo: null, ancho: null, areaM2: null,
    acabado: null, muebleAlto: null, estructura: null, ambientes: null, distrito: 'Comas', plazo: 'asap',
    fotos: 0, nombre: 'Ana', whatsapp: '987654321', razonSocial: null, ruc: null,
  };
  const msg = (o: Partial<MessageInput> = {}, t?: string | null) => buildQuoteMessage({ ...base, ...o }, t);

  it('mensaje mínimo', () => {
    expect(msg().split('\n')).toEqual([
      '*Nueva solicitud · SEIMA web*', 'Cliente: Persona', 'Servicios: Pintura', 'Medidas: por definir',
      'Distrito: Comas · Plazo: Lo antes posible', 'Fotos: sin fotos', 'Contacto: Ana · 987 654 321',
    ]);
  });
  it('empresa con y sin RUC', () => {
    expect(msg({ cliente: 'empresa', razonSocial: 'Demo SAC', ruc: '20123456789' })).toContain('Cliente: Empresa — Demo SAC (RUC 20123456789)');
    expect(msg({ cliente: 'empresa', razonSocial: 'Demo SAC' })).toContain('Cliente: Empresa — Demo SAC\n');
  });
  it('cocina: las combinaciones de mueble alto y estructura', () => {
    expect(msg({ servicios: ['cocina'], muebleAlto: 'si', estructura: 'cero' })).toContain('Cocina: con mueble alto, desde cero');
    expect(msg({ servicios: ['cocina'], muebleAlto: 'no', estructura: 'hay' })).toContain('Cocina: sin mueble alto, ya hay estructura');
    expect(msg({ servicios: ['cocina'] })).toContain('Cocina: mueble alto por definir, estructura por definir');
    expect(msg({ servicios: ['pintura'], muebleAlto: 'si' })).not.toContain('Cocina:');
  });
  it('departamento: singular y plural de ambientes', () => {
    expect(msg({ servicios: ['departamento'], ambientes: 1 })).toContain('Departamento: 1 ambiente\n');
    expect(msg({ servicios: ['departamento'], ambientes: 3 })).toContain('Departamento: 3 ambientes\n');
    expect(msg({ servicios: ['departamento'], ambientes: null })).not.toContain('Departamento:');
  });
  it('acabado, fotos y proyecto de referencia', () => {
    const m = msg({ acabado: 'corte45', fotos: 2 }, 'Cocina en drywall');
    expect(m).toContain('Acabado: Corte 45° + resina');
    expect(m).toContain('Fotos: 2 adjuntas');
    expect(msg({ fotos: 1 })).toContain('Fotos: 1 adjunta\n');
    expect(m).toContain('Referencia: proyecto «Cocina en drywall»');
    expect(msg()).not.toContain('Referencia');
  });
  it('varios servicios en orden, con su nombre legible', () => {
    expect(msg({ servicios: ['cocina', 'bano'] })).toContain('Servicios: Cocina, Baño');
  });
});

describe('QuotesService', () => {
  function armar(proyecto: { id: string; titulo: string } | null = null) {
    const quotes = { create: vi.fn(async (d: Record<string, unknown>) => ({ id: 'q-1', createdAt: new Date('2026-03-04T05:06:07Z'), ...d })) };
    const projects = { findPublishedBySlug: vi.fn().mockResolvedValue(proyecto) };
    const svc = new QuotesService(quotes as unknown as QuotesRepository, projects as unknown as ProjectsRepository);
    const crear = (extra: Record<string, unknown> = {}) => svc.create(ok(extra) as CreateQuoteInput);
    return { quotes, projects, crear, guardado: () => quotes.create.mock.calls[0][0] as Record<string, unknown> };
  }

  it('devuelve id, mensaje y fecha; guarda el mismo mensaje', async () => {
    const t = armar();
    const r = await t.crear();
    expect(r).toEqual({ id: 'q-1', mensaje: expect.stringContaining('*Nueva solicitud · SEIMA web*'), creadaEn: '2026-03-04T05:06:07.000Z' });
    expect(t.guardado().mensaje).toBe(r.mensaje);
  });

  it('calcula el área largo × ancho con un decimal', async () => {
    const t = armar();
    await t.crear({ largo: '3.33', ancho: '3' });
    expect(t.guardado()).toMatchObject({ largo: 3.33, ancho: 3, areaM2: 10 });
  });

  it('modo m²: usa los m² y descarta largo/ancho', async () => {
    const t = armar();
    await t.crear({ medidasModo: 'm2', m2: '25', largo: '9', ancho: '9' });
    expect(t.guardado()).toMatchObject({ largo: null, ancho: null, areaM2: 25 });
  });

  it('modo "no sé": sin medidas aunque lleguen valores', async () => {
    const t = armar();
    await t.crear({ medidasModo: 'nose', largo: '4', ancho: '3', m2: '12' });
    expect(t.guardado()).toMatchObject({ largo: null, ancho: null, areaM2: null });
  });

  it('modo largo×ancho incompleto: área null', async () => {
    const t = armar();
    await t.crear({ ancho: '' });
    expect(t.guardado().areaM2).toBeNull();
  });

  it('descarta lo que no aplica a los servicios elegidos', async () => {
    const t = armar();
    await t.crear({ servicios: ['pintura'], acabado: 'granito', muebleAlto: 'si', estructura: 'cero', ambientes: 5 });
    expect(t.guardado()).toMatchObject({ acabado: null, muebleAlto: null, estructura: null, ambientes: null });
  });

  it('conserva lo que sí aplica', async () => {
    const t = armar();
    await t.crear({ servicios: ['cocina', 'departamento'], acabado: 'granito', muebleAlto: 'si', estructura: 'cero', ambientes: 3 });
    expect(t.guardado()).toMatchObject({ acabado: 'granito', muebleAlto: 'si', estructura: 'cero', ambientes: 3 });
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
    // cada foto es una fila de quote_photos, con el orden en que se subió
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
  });
});
