import { describe, expect, it, vi } from 'vitest';
import type { AppError } from '../../src/common/errors/app-error';
import { slugify, slugUnico } from '../../src/common/utils/slug';
import { CategoriesPanelService } from '../../src/modules/categories/categories-panel.service';
import type { CategoriesRepository } from '../../src/modules/categories/categories.repository';
import { createCategorySchema, updateCategorySchema } from '../../src/modules/categories/categories.schemas';
import type { Category } from '../../src/modules/categories/category.entity';
import { CatalogPanelService } from '../../src/modules/catalog/catalog-panel.service';
import type { CatalogRepository } from '../../src/modules/catalog/catalog.repository';
import { createOptionSchema, createQuestionSchema, createServiceSchema, updateOptionSchema, updateQuestionSchema } from '../../src/modules/catalog/catalog.schemas';
import { CatalogService } from '../../src/modules/catalog/catalog.service';
import type { OpcionPregunta } from '../../src/modules/catalog/opcion-pregunta.entity';
import type { Pregunta } from '../../src/modules/catalog/pregunta.entity';
import type { Servicio } from '../../src/modules/catalog/servicio.entity';
import { rejected } from './fakes';

const U1 = '11111111-1111-4111-8111-111111111111';
const U2 = '22222222-2222-4222-8222-222222222222';
const U3 = '33333333-3333-4333-8333-333333333333';

describe('slug', () => {
  it('quita tildes, símbolos y respeta el máximo', () => {
    expect(slugify('Cocina y baño')).toBe('cocina-y-bano');
    expect(slugify('  ¡¿Techo?!  ')).toBe('techo');
    expect(slugify('Pintura (interior)', { max: 10 })).toBe('pintura-in');
    expect(slugify('', { vacio: 'servicio' })).toBe('servicio');
    expect(slugify('abcdef-ghijk', { max: 7 })).toBe('abcdef');
  });
  it('slugUnico agrega -2, -3… sin pasarse del máximo', async () => {
    const tomados = new Set(['pintura', 'pintura-2']);
    expect(await slugUnico('pintura', async (s) => tomados.has(s), 40)).toBe('pintura-3');
    expect(await slugUnico('libre', async (s) => tomados.has(s), 40)).toBe('libre');
    const largo = 'a'.repeat(10);
    expect(await slugUnico(largo, async (s) => s === largo, 10)).toBe('aaaaaaaa-2');
  });
});

describe('esquemas del catálogo', () => {
  it('tipo de trabajo: nombre de 2 a 80 y algo que guardar al editar', () => {
    expect(createCategorySchema.safeParse({ nombre: 'Pisos' }).success).toBe(true);
    expect(createCategorySchema.safeParse({ nombre: 'x' }).success).toBe(false);
    expect(updateCategorySchema.safeParse({}).success).toBe(false);
    expect(updateCategorySchema.safeParse({ activo: false }).success).toBe(true);
  });
  it('servicio: el ícono por defecto es el genérico y solo se aceptan los que la web dibuja', () => {
    expect(createServiceSchema.parse({ nombre: 'Pisos' }).icono).toBe('generico');
    expect(createServiceSchema.safeParse({ nombre: 'Pisos', icono: 'cohete' }).success).toBe(false);
  });
  it('pregunta: al menos un servicio, sin repetidos, y tipo válido', () => {
    const base = { texto: '¿Qué tipo de piso?', etiqueta: 'Piso', tipo: 'unica' };
    expect(createQuestionSchema.parse({ ...base, servicios: [U1, U1, U2] }).servicios).toEqual([U1, U2]);
    expect(createQuestionSchema.safeParse({ ...base, servicios: [] }).success).toBe(false);
    expect(createQuestionSchema.safeParse({ ...base, tipo: 'abierta', servicios: [U1] }).success).toBe(false);
    expect(updateQuestionSchema.safeParse({ servicios: [] }).success).toBe(false);
  });
  it('opción: la ayuda vacía se vuelve null y el tipo de entrada por defecto es ninguna', () => {
    const o = createOptionSchema.parse({ etiqueta: 'Otro', descripcion: '', entradaAyuda: '  ' });
    expect(o).toMatchObject({ tipoEntrada: 'ninguna', descripcion: null, entradaAyuda: null });
    expect(updateOptionSchema.safeParse({}).success).toBe(false);
    expect(updateOptionSchema.parse({ activo: false }).descripcion).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------------------------

const cat = (id: string, nombre: string, extra: Partial<Category> = {}): Category => ({ id, slug: slugify(nombre), nombre, orden: 0, activo: true, obras: 0, ...extra }) as Category;

function repoCategorias(iniciales: Category[]) {
  const filas = [...iniciales];
  return {
    filas,
    repo: {
      findAllWithCounts: vi.fn(async () => filas),
      findByIdWithCount: vi.fn(async (id: string) => filas.find((c) => c.id === id) ?? null),
      findByNombre: vi.fn(async (n: string) => filas.find((c) => c.nombre.toLowerCase() === n.toLowerCase()) ?? null),
      slugTaken: vi.fn(async (s: string) => filas.some((c) => c.slug === s)),
      nextOrden: vi.fn(async () => filas.length),
      save: vi.fn(async (d: Partial<Category>) => {
        const nueva = cat(`new-${filas.length}`, d.nombre!, { slug: d.slug, orden: d.orden });
        filas.push(nueva);
        return nueva;
      }),
      update: vi.fn(async (id: string, d: Partial<Category>) => Object.assign(filas.find((c) => c.id === id)!, d)),
      countByIds: vi.fn(async (ids: string[]) => ids.filter((id) => filas.some((c) => c.id === id)).length),
      reorder: vi.fn(async () => undefined),
    },
  };
}

describe('CategoriesPanelService', () => {
  const armar = () => {
    const { repo, filas } = repoCategorias([cat(U1, 'Cocinas', { orden: 0, obras: 3 }), cat(U2, 'Baños', { orden: 1 })]);
    return { repo, filas, service: new CategoriesPanelService(repo as unknown as CategoriesRepository) };
  };

  it('lista con cuántas obras usa cada tipo', async () => {
    const { service } = armar();
    expect((await service.list())[0]).toMatchObject({ nombre: 'Cocinas', obras: 3 });
  });

  it('crea con slug a partir del nombre y al final del orden', async () => {
    const { service, repo } = armar();
    const nueva = await service.create({ nombre: 'Pisos y zócalos' });
    expect(nueva).toMatchObject({ slug: 'pisos-y-zocalos', orden: 2, activo: true });
    expect(repo.save).toHaveBeenCalled();
  });

  it('no repite nombres (sin importar mayúsculas)', async () => {
    const { service } = armar();
    const error = (await rejected(service.create({ nombre: 'COCINAS' }))) as AppError;
    expect(error.status).toBe(409);
  });

  it('si el slug ya existe con otro nombre, agrega -2', async () => {
    const { service, filas } = armar();
    filas.push(cat(U3, 'Otro', { slug: 'pisos' }));
    expect((await service.create({ nombre: 'Pisos' })).slug).toBe('pisos-2');
  });

  it('renombrar NO cambia el slug; se puede desactivar', async () => {
    const { service, filas } = armar();
    const editada = await service.update(U1, { nombre: 'Cocinas modernas', activo: false });
    expect(editada).toMatchObject({ nombre: 'Cocinas modernas', slug: 'cocinas', activo: false });
    expect(filas[0].slug).toBe('cocinas');
  });

  it('no deja renombrar a un nombre que ya tiene otro tipo, pero sí cambiar mayúsculas del propio', async () => {
    const { service } = armar();
    expect(((await rejected(service.update(U1, { nombre: 'baños' }))) as AppError).status).toBe(409);
    await expect(service.update(U1, { nombre: 'COCINAS' })).resolves.toMatchObject({ nombre: 'COCINAS' });
  });

  it('editar uno que no existe da 404', async () => {
    expect(((await rejected(armar().service.update(U3, { activo: false }))) as AppError).status).toBe(404);
  });

  it('reordena y rechaza repetidos o inexistentes', async () => {
    const { service, repo } = armar();
    await service.reorder([U2, U1]);
    expect(repo.reorder).toHaveBeenCalledWith([U2, U1]);
    expect(((await rejected(service.reorder([U1, U1]))) as AppError).status).toBe(422);
    expect(((await rejected(service.reorder([U1, U3]))) as AppError).status).toBe(422);
  });
});

// ---------------------------------------------------------------------------------------------

const srv = (id: string, nombre: string, extra: Partial<Servicio> = {}): Servicio => ({ id, slug: slugify(nombre), nombre, icono: 'generico', orden: 0, activo: true, ...extra }) as Servicio;
const opc = (id: string, questionId: string, etiqueta: string, extra: Partial<OpcionPregunta> = {}): OpcionPregunta =>
  ({ id, questionId, slug: slugify(etiqueta), etiqueta, descripcion: null, tipoEntrada: 'ninguna', entradaAyuda: null, orden: 0, activo: true, ...extra }) as OpcionPregunta;
const preg = (id: string, etiqueta: string, servicios: Servicio[], opciones: OpcionPregunta[], extra: Partial<Pregunta> = {}): Pregunta =>
  ({ id, slug: slugify(etiqueta), texto: `¿${etiqueta}?`, etiqueta, tipo: 'unica', orden: 0, activo: true, servicios, opciones, ...extra }) as Pregunta;

function repoCatalogo(servicios: Servicio[], preguntas: Pregunta[]) {
  const repo = {
    findAllServices: vi.fn(async () => servicios),
    findServiceById: vi.fn(async (id: string) => servicios.find((s) => s.id === id) ?? null),
    findServicesByIds: vi.fn(async (ids: string[]) => servicios.filter((s) => ids.includes(s.id))),
    findServiceByNombre: vi.fn(async (n: string) => servicios.find((s) => s.nombre.toLowerCase() === n.toLowerCase()) ?? null),
    serviceSlugTaken: vi.fn(async (s: string) => servicios.some((x) => x.slug === s)),
    nextServiceOrden: vi.fn(async () => servicios.length),
    saveService: vi.fn(async (d: Partial<Servicio>) => srv('nuevo', d.nombre!, d)),
    updateService: vi.fn(async (id: string, d: Partial<Servicio>) => Object.assign(servicios.find((s) => s.id === id)!, d)),
    countServicesByIds: vi.fn(async (ids: string[]) => ids.filter((id) => servicios.some((s) => s.id === id)).length),
    reorderServices: vi.fn(async () => undefined),
    findAllQuestions: vi.fn(async () => preguntas),
    findQuestionById: vi.fn(async (id: string) => preguntas.find((p) => p.id === id) ?? null),
    questionSlugTaken: vi.fn(async (s: string) => preguntas.some((p) => p.slug === s)),
    nextQuestionOrden: vi.fn(async () => preguntas.length),
    saveQuestion: vi.fn(async (d: Partial<Pregunta>) => {
      const nueva = preg(`q-${preguntas.length}`, d.etiqueta!, d.servicios!, [], { slug: d.slug, tipo: d.tipo, texto: d.texto, orden: d.orden });
      preguntas.push(nueva);
      return nueva;
    }),
    updateQuestion: vi.fn(async (id: string, d: Partial<Pregunta>) => Object.assign(preguntas.find((p) => p.id === id)!, d)),
    setQuestionServices: vi.fn(async (id: string, s: Servicio[]) => Object.assign(preguntas.find((p) => p.id === id)!, { servicios: s })),
    reorderQuestions: vi.fn(async () => undefined),
    countQuestionsByIds: vi.fn(async (ids: string[]) => ids.filter((id) => preguntas.some((p) => p.id === id)).length),
    findOptionById: vi.fn(async (id: string) => preguntas.flatMap((p) => p.opciones).find((o) => o.id === id) ?? null),
    findOptionsOfQuestion: vi.fn(async (qid: string) => preguntas.find((p) => p.id === qid)?.opciones ?? []),
    optionSlugTaken: vi.fn(async (qid: string, s: string) => (preguntas.find((p) => p.id === qid)?.opciones ?? []).some((o) => o.slug === s)),
    nextOptionOrden: vi.fn(async (qid: string) => preguntas.find((p) => p.id === qid)?.opciones.length ?? 0),
    saveOption: vi.fn(async (d: Partial<OpcionPregunta>) => {
      const p = preguntas.find((x) => x.id === d.questionId)!;
      const nueva = opc(`o-${p.opciones.length}`, p.id, d.etiqueta!, d);
      p.opciones.push(nueva);
      return nueva;
    }),
    updateOption: vi.fn(async (id: string, d: Partial<OpcionPregunta>) => {
      Object.assign(preguntas.flatMap((p) => p.opciones).find((o) => o.id === id)!, d);
    }),
    reorderOptions: vi.fn(async () => undefined),
  };
  return repo;
}

describe('CatalogPanelService', () => {
  const COCINA = srv(U1, 'Cocina', { orden: 0 });
  const BANO = srv(U2, 'Baño', { orden: 1, activo: false });
  const armar = () => {
    const acabado = preg('q1', 'Acabado', [COCINA, BANO], [opc('o1', 'q1', 'Estándar'), opc('o2', 'q1', 'Granito', { orden: 1, activo: false })], { orden: 0 });
    const vacia = preg('q2', 'Sin opciones', [COCINA], [], { orden: 1 });
    const repo = repoCatalogo([COCINA, BANO], [acabado, vacia]);
    return { repo, service: new CatalogPanelService(repo as unknown as CatalogRepository) };
  };

  it('lista los servicios (también los desactivados) con cuántas preguntas activas tienen', async () => {
    const lista = await armar().service.listServices();
    expect(lista.map((s) => [s.nombre, s.activo, s.preguntas])).toEqual([
      ['Cocina', true, 2],
      ['Baño', false, 1],
    ]);
  });

  it('crea un servicio con slug y ícono genérico, y no repite nombres', async () => {
    const { service, repo } = armar();
    const nuevo = await service.createService({ nombre: 'Pisos laminados', icono: 'generico' });
    expect(nuevo).toMatchObject({ slug: 'pisos-laminados', icono: 'generico', orden: 2, activo: true, preguntas: 0 });
    expect(repo.saveService).toHaveBeenCalled();
    expect(((await rejected(service.createService({ nombre: 'cocina', icono: 'generico' }))) as AppError).status).toBe(409);
  });

  it('editar un servicio no cambia su slug; uno inexistente da 404', async () => {
    const { service } = armar();
    expect(await service.updateService(U1, { nombre: 'Cocinas integrales', icono: 'cocinas' })).toMatchObject({ slug: 'cocina', nombre: 'Cocinas integrales', icono: 'cocinas' });
    expect(((await rejected(service.updateService(U3, { activo: false }))) as AppError).status).toBe(404);
  });

  it('una pregunta se ve en la web solo con opciones activas y un servicio activo', async () => {
    const lista = await armar().service.listQuestions();
    expect(lista.find((p) => p.id === 'q1')?.visible).toBe(true);
    expect(lista.find((p) => p.id === 'q2')?.visible).toBe(false);
  });

  it('crear una pregunta exige que los servicios existan', async () => {
    const { service } = armar();
    const base = { texto: '¿Qué tipo de piso?', etiqueta: 'Piso', tipo: 'unica' as const };
    const creada = await service.createQuestion({ ...base, servicios: [U1] });
    expect(creada).toMatchObject({ slug: 'piso', tipo: 'unica', activo: true, opciones: [] });
    expect(creada.visible).toBe(false);
    expect(((await rejected(service.createQuestion({ ...base, servicios: [U1, U3] }))) as AppError).status).toBe(422);
  });

  it('editar una pregunta cambia sus servicios solo si se pide', async () => {
    const { service, repo } = armar();
    await service.updateQuestion('q1', { texto: '¿Qué acabado quieres?' });
    expect(repo.setQuestionServices).not.toHaveBeenCalled();
    await service.updateQuestion('q1', { servicios: [U1] });
    expect(repo.setQuestionServices).toHaveBeenCalledWith('q1', [COCINA]);
    expect(((await rejected(service.updateQuestion('nope', { activo: false }))) as AppError).status).toBe(404);
  });

  it('reordenar preguntas rechaza repetidas o inexistentes', async () => {
    const { service, repo } = armar();
    await service.reorderQuestions(['q2', 'q1']);
    expect(repo.reorderQuestions).toHaveBeenCalledWith(['q2', 'q1']);
    expect(((await rejected(service.reorderQuestions(['q1', 'q1']))) as AppError).status).toBe(422);
    expect(((await rejected(service.reorderQuestions(['q1', 'zzz']))) as AppError).status).toBe(422);
  });

  it('crea una opción al final, con slug propio, y la ayuda solo si pide un dato', async () => {
    const { service, repo } = armar();
    const a = await service.createOption('q1', { etiqueta: 'Corte a 45°', tipoEntrada: 'ninguna', entradaAyuda: 'ignorada' });
    expect(repo.saveOption).toHaveBeenLastCalledWith(expect.objectContaining({ slug: 'corte-a-45', orden: 2, entradaAyuda: null }));
    expect(a.opciones.at(-1)?.slug).toBe('corte-a-45');
    await service.createOption('q1', { etiqueta: 'Otro', tipoEntrada: 'texto', entradaAyuda: '¿Cuál?' });
    expect(repo.saveOption).toHaveBeenLastCalledWith(expect.objectContaining({ tipoEntrada: 'texto', entradaAyuda: '¿Cuál?' }));
  });

  it('no repite una opción dentro de la misma pregunta', async () => {
    const error = (await rejected(armar().service.createOption('q1', { etiqueta: 'ESTÁNDAR', tipoEntrada: 'ninguna' }))) as AppError;
    expect(error.status).toBe(409);
  });

  it('editar una opción: desactivar, y al pasar a «ninguna» se borra la ayuda', async () => {
    const { service, repo } = armar();
    await service.createOption('q1', { etiqueta: 'Área', tipoEntrada: 'numero', entradaAyuda: 'm²' });
    const id = (await repo.findOptionsOfQuestion('q1')).at(-1)!.id;
    await service.updateOption(id, { tipoEntrada: 'ninguna' });
    expect(repo.updateOption).toHaveBeenLastCalledWith(id, expect.objectContaining({ tipoEntrada: 'ninguna', entradaAyuda: null }));
    await service.updateOption('o1', { activo: false });
    expect(repo.updateOption).toHaveBeenLastCalledWith('o1', { activo: false });
    expect(((await rejected(service.updateOption('nope', { activo: false }))) as AppError).status).toBe(404);
  });

  it('reordenar opciones solo acepta las de esa pregunta', async () => {
    const { service, repo } = armar();
    await service.reorderOptions('q1', ['o2', 'o1']);
    expect(repo.reorderOptions).toHaveBeenCalledWith('q1', ['o2', 'o1']);
    expect(((await rejected(service.reorderOptions('q1', ['o1', 'ajena']))) as AppError).status).toBe(422);
  });
});

describe('GET /quote-form', () => {
  it('no muestra una pregunta que no tiene opciones activas', async () => {
    const repo = {
      findActiveServices: vi.fn(async () => [srv(U1, 'Cocina')]),
      findActiveQuestions: vi.fn(async () => [
        preg('q1', 'Acabado', [srv(U1, 'Cocina')], [opc('o1', 'q1', 'Estándar')]),
        preg('q2', 'Vacía', [srv(U1, 'Cocina')], []),
      ]),
    };
    const form = await new CatalogService(repo as unknown as CatalogRepository).quoteForm();
    expect(form.preguntas.map((p) => p.slug)).toEqual(['acabado']);
  });
});
