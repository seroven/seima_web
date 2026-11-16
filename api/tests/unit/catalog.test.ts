import { describe, expect, it, vi } from 'vitest';
import type { CatalogRepository } from '../../src/modules/catalog/catalog.repository';
import { CatalogService } from '../../src/modules/catalog/catalog.service';
import { PREGUNTAS, SERVICIOS } from '../../src/database/seeds/catalog.data';

describe('CatalogService.quoteForm', () => {
  const repo = {
    findActiveServices: vi.fn().mockResolvedValue([
      { slug: 'cocina', nombre: 'Cocina', icono: 'cocinas' },
      { slug: 'bano', nombre: 'Baño', icono: 'banos' },
    ]),
    findActiveQuestions: vi.fn().mockResolvedValue([
      {
        slug: 'area', texto: '¿Cuántos m²?', etiqueta: 'Área', tipo: 'unica',
        opciones: [
          { slug: 'sabe', etiqueta: 'Sé el área', descripcion: null, tipoEntrada: 'numero', entradaAyuda: 'm²', id: 'x', activo: true },
          { slug: 'nose', etiqueta: 'No sé', descripcion: null, tipoEntrada: 'ninguna', entradaAyuda: null, id: 'y', activo: true },
        ],
        // 'pintura' está desactivado (no está entre los servicios activos): no debe aparecer
        servicios: [{ slug: 'cocina' }, { slug: 'pintura' }],
      },
    ]),
  };

  it('entrega servicios y preguntas con lo que la web necesita (incluido el dato extra de cada opción), sin ids', async () => {
    const f = await new CatalogService(repo as unknown as CatalogRepository).quoteForm();
    expect(f.servicios).toEqual([
      { slug: 'cocina', nombre: 'Cocina', icono: 'cocinas' },
      { slug: 'bano', nombre: 'Baño', icono: 'banos' },
    ]);
    expect(f.preguntas[0]).toEqual({
      slug: 'area', texto: '¿Cuántos m²?', etiqueta: 'Área', tipo: 'unica',
      opciones: [
        { slug: 'sabe', etiqueta: 'Sé el área', descripcion: null, tipoEntrada: 'numero', entradaAyuda: 'm²' },
        { slug: 'nose', etiqueta: 'No sé', descripcion: null, tipoEntrada: 'ninguna', entradaAyuda: null },
      ],
      servicios: ['cocina'],
    });
    expect(JSON.stringify(f)).not.toContain('"id"');
  });
});

// El catálogo de datos (lo que carga `npm run seed:catalog`) debe ser coherente: si alguien lo edita mal, falla aquí
// y no en producción.
describe('catalog.data (datos del cotizador)', () => {
  const serviciosSlugs = new Set(SERVICIOS.map((s) => s.slug));

  it('los slugs de servicios, preguntas y opciones son únicos y con formato válido', () => {
    expect(serviciosSlugs.size).toBe(SERVICIOS.length);
    const preguntas = PREGUNTAS.map((p) => p.slug);
    expect(new Set(preguntas).size).toBe(preguntas.length);
    for (const slug of [...serviciosSlugs, ...preguntas]) expect(slug).toMatch(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
    for (const p of PREGUNTAS) {
      const opciones = p.opciones.map((o) => o.slug);
      expect(new Set(opciones).size, p.slug).toBe(opciones.length);
      for (const o of opciones) expect(o, `${p.slug} → ${o}`).toMatch(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
    }
  });

  it('cada pregunta apunta a servicios que existen y se hace al menos en uno', () => {
    for (const p of PREGUNTAS) {
      expect(p.servicios.length, p.slug).toBeGreaterThan(0);
      for (const s of p.servicios) expect(serviciosSlugs.has(s), `${p.slug} → ${s}`).toBe(true);
    }
  });

  it('solo hay preguntas de una opción (unica) o de varias (multiple), y todas tienen al menos 2 opciones', () => {
    for (const p of PREGUNTAS) {
      expect(['unica', 'multiple'], p.slug).toContain(p.tipo);
      expect(p.opciones.length, p.slug).toBeGreaterThanOrEqual(2);
    }
  });

  it('las opciones que piden un dato extra son texto o número, y llevan ayuda (el ejemplo o la unidad)', () => {
    const conEntrada = PREGUNTAS.flatMap((p) => p.opciones.filter((o) => o.entrada).map((o) => ({ p: p.slug, o })));
    expect(conEntrada.length).toBeGreaterThan(0);
    for (const { p, o } of conEntrada) {
      expect(['texto', 'numero'], `${p} → ${o.slug}`).toContain(o.entrada);
      expect(o.ayuda, `${p} → ${o.slug}`).toBeTruthy();
    }
  });

  it('las descripciones van en TODAS las opciones de una pregunta o en ninguna (así la web elige tarjetas o chips sin mezclar)', () => {
    for (const p of PREGUNTAS) {
      const con = p.opciones.filter((o) => o.descripcion).length;
      expect(con === 0 || con === p.opciones.length, p.slug).toBe(true);
    }
  });

  it('todo servicio tiene al menos una pregunta propia o compartida (el cotizador no queda vacío)', () => {
    for (const s of serviciosSlugs) expect(PREGUNTAS.some((p) => p.servicios.includes(s)), s).toBe(true);
  });

  it('pocas preguntas por servicio (la idea es no abrumar): máximo 4 por servicio', () => {
    for (const s of serviciosSlugs) expect(PREGUNTAS.filter((p) => p.servicios.includes(s)).length, s).toBeLessThanOrEqual(4);
  });

  it('las medidas son una pregunta más ("area"): aplica a todos los servicios menos electricidad', () => {
    const area = PREGUNTAS.find((p) => p.slug === 'area')!;
    expect(area.opciones.find((o) => o.slug === 'sabe')).toMatchObject({ entrada: 'numero', ayuda: 'm²' });
    expect(area.servicios).not.toContain('electricidad');
    expect(area.servicios.length).toBe(serviciosSlugs.size - 1);
  });
});
