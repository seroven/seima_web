import { describe, expect, it } from 'vitest';
import { faltantesParaPublicar, mensajeIncompatible, type MedioRegla } from '../../src/modules/projects/project-rules';
import { orientacionDe } from '../../src/modules/projects/projects.types';
import { slugify } from '../../src/modules/projects/slug';

const medio = (p: Partial<MedioRegla> = {}): MedioRegla => ({
  id: 'm',
  etapa: 'antes',
  tipo: 'foto',
  estado: 'listo',
  ancho: 1080,
  alto: 1920,
  duracionMs: null,
  esPrincipal: false,
  esPortada: false,
  ...p,
});

describe('orientacionDe', () => {
  it('el cuadrado cuenta como horizontal y sin medidas no hay orientación', () => {
    expect(orientacionDe(100, 100)).toBe('horizontal');
    expect(orientacionDe(1920, 1080)).toBe('horizontal');
    expect(orientacionDe(1080, 1920)).toBe('vertical');
    expect(orientacionDe(null, 10)).toBeNull();
  });
});

describe('mensajeIncompatible', () => {
  it('acepta el mismo tipo y la misma orientación', () => {
    expect(mensajeIncompatible(medio({ etapa: 'antes' }), medio({ etapa: 'despues', id: 'd' }))).toBeNull();
  });
  it('explica foto contra video y vertical contra horizontal', () => {
    expect(mensajeIncompatible(medio(), medio({ tipo: 'video', duracionMs: 1000 }))).toMatch(/fotos o los dos videos/);
    expect(mensajeIncompatible(medio({ ancho: 1920, alto: 1080 }), medio({ ancho: 1080, alto: 1920 }))).toMatch(/horizontales/);
  });
  it('el video del comparador no pasa de 15 segundos', () => {
    const a = medio({ tipo: 'video', duracionMs: 15_000 });
    const largo = medio({ tipo: 'video', duracionMs: 15_001 });
    expect(mensajeIncompatible(a, medio({ tipo: 'video', duracionMs: 10_000 }))).toBeNull();
    expect(mensajeIncompatible(a, largo)).toMatch(/15 segundos/);
  });
});

describe('faltantesParaPublicar', () => {
  const completo = (): MedioRegla[] => [
    medio({ id: 'a', etapa: 'antes', esPrincipal: true, esPortada: true }),
    medio({ id: 'd', etapa: 'durante', ancho: 800, alto: 600 }),
    medio({ id: 'p', etapa: 'despues', esPrincipal: true, esPortada: true }),
  ];

  it('un proyecto completo no tiene faltantes', () => {
    expect(faltantesParaPublicar(completo())).toEqual([]);
  });

  it('exige archivo en cada etapa, comparación, portada y que nada siga subiendo', () => {
    const sinDurante = completo().filter((m) => m.etapa !== 'durante');
    expect(faltantesParaPublicar(sinDurante).join(' ')).toMatch(/Durante/);
    const subiendo = completo().map((m) => (m.id === 'd' ? { ...m, estado: 'subiendo' as const } : m));
    expect(faltantesParaPublicar(subiendo).join(' ')).toMatch(/subiendo/);
    const sinPortada = completo().map((m) => ({ ...m, esPortada: false }));
    expect(faltantesParaPublicar(sinPortada).join(' ')).toMatch(/portada/);
    const sinComparar = completo().map((m) => ({ ...m, esPrincipal: false }));
    expect(faltantesParaPublicar(sinComparar).join(' ')).toMatch(/comparación/);
  });

  it('con comparador de videos igual exige una foto de portada en antes y en después', () => {
    const videos = completo().map((m) =>
      m.etapa === 'durante' ? m : { ...m, tipo: 'video' as const, duracionMs: 10_000, esPortada: false },
    );
    expect(faltantesParaPublicar(videos).join(' ')).toMatch(/portada/);
    const conFotos = [
      ...videos,
      medio({ id: 'fa', etapa: 'antes', esPortada: true }),
      medio({ id: 'fd', etapa: 'despues', esPortada: true }),
    ];
    expect(faltantesParaPublicar(conFotos)).toEqual([]);
  });
});

describe('slugify', () => {
  it('pasa a minúsculas, quita tildes y une con guiones', () => {
    expect(slugify('Cocina en Baño Ñandú')).toBe('cocina-en-bano-nandu');
    expect(slugify('   ')).toBe('proyecto');
  });
});
