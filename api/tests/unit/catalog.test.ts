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
        slug: 'mueble-alto', texto: '¿Quieres mueble alto?', etiqueta: 'Mueble alto', tipo: 'unica', min: null, max: null,
        opciones: [{ slug: 'si', etiqueta: 'Sí', descripcion: null, id: 'x', activo: true }],
        // 'pintura' está desactivado (no está entre los servicios activos): no debe aparecer
        servicios: [{ slug: 'cocina' }, { slug: 'pintura' }],
      },
    ]),
  };

  it('entrega servicios y preguntas con lo que la web necesita, sin ids ni campos internos', async () => {
    const f = await new CatalogService(repo as unknown as CatalogRepository).quoteForm();
    expect(f.servicios).toEqual([
      { slug: 'cocina', nombre: 'Cocina', icono: 'cocinas' },
      { slug: 'bano', nombre: 'Baño', icono: 'banos' },
    ]);
    expect(f.preguntas[0]).toEqual({
      slug: 'mueble-alto', texto: '¿Quieres mueble alto?', etiqueta: 'Mueble alto', tipo: 'unica', min: null, max: null,
      opciones: [{ slug: 'si', etiqueta: 'Sí', descripcion: null }],
      servicios: ['cocina'],
    });
    expect(JSON.stringify(f)).not.toContain('"id"');
  });
});

// El catálogo de datos (lo que carga `npm run seed:catalog`) debe ser coherente: si alguien lo edita mal, falla aquí
// y no en producción.
describe('catalog.data (datos del cotizador)', () => {
  const serviciosSlugs = new Set(SERVICIOS.map((s) => s.slug));

  it('los slugs de servicios y de preguntas son únicos y con formato válido', () => {
    expect(serviciosSlugs.size).toBe(SERVICIOS.length);
    const preguntas = PREGUNTAS.map((p) => p.slug);
    expect(new Set(preguntas).size).toBe(preguntas.length);
    for (const slug of [...serviciosSlugs, ...preguntas]) expect(slug).toMatch(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
  });

  it('cada pregunta apunta a servicios que existen y se hace al menos en uno', () => {
    for (const p of PREGUNTAS) {
      expect(p.servicios.length, p.slug).toBeGreaterThan(0);
      for (const s of p.servicios) expect(serviciosSlugs.has(s), `${p.slug} → ${s}`).toBe(true);
    }
  });

  it('las preguntas de opciones tienen al menos 2 opciones únicas; las numéricas, un rango válido y ninguna opción', () => {
    for (const p of PREGUNTAS) {
      if (p.tipo === 'numero') {
        expect(p.opciones ?? [], p.slug).toHaveLength(0);
        expect(p.min, p.slug).toBeLessThanOrEqual(p.max ?? -1);
      } else {
        const slugs = (p.opciones ?? []).map((o) => o.slug);
        expect(slugs.length, p.slug).toBeGreaterThanOrEqual(2);
        expect(new Set(slugs).size, p.slug).toBe(slugs.length);
      }
    }
  });

  it('todo servicio tiene al menos una pregunta propia o compartida (el cotizador no queda vacío)', () => {
    for (const s of serviciosSlugs) expect(PREGUNTAS.some((p) => p.servicios.includes(s)), s).toBe(true);
  });

  it('pocas preguntas por servicio (la idea es no abrumar): máximo 4 por servicio', () => {
    for (const s of serviciosSlugs) expect(PREGUNTAS.filter((p) => p.servicios.includes(s)).length, s).toBeLessThanOrEqual(4);
  });
});
