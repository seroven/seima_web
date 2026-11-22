import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CategoriesPanelService } from '../../src/modules/categories/categories-panel.service';
import type { CategoriesRepository } from '../../src/modules/categories/categories.repository';
import type { Category } from '../../src/modules/categories/category.entity';
import type { ProjectMedia } from '../../src/modules/projects/project-media.entity';
import type { Project } from '../../src/modules/projects/project.entity';
import { PanelProjectsService } from '../../src/modules/projects/projects-panel.service';
import type { ProjectsRepository } from '../../src/modules/projects/projects.repository';
import type { UploadsService } from '../../src/modules/uploads/uploads.service';
import { WebRebuildService } from '../../src/modules/web-rebuild/web-rebuild.service';

vi.mock('../../src/modules/uploads/cloudinary-destroy', () => ({ borrarDeCloudinary: vi.fn(async () => undefined) }));

// El «deploy hook» de verdad es un secreto: aquí va uno inventado y se comprueba que nunca se escribe en los logs.
const HOOK = 'https://api.render.com/deploy/srv-prueba?key=SECRETO-DE-PRUEBA';
const MIN = 60_000;

describe('WebRebuildService (el aviso a Render)', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  const armar = (url: string | null = HOOK, respuesta: () => Promise<Response> = async () => new Response('', { status: 200 })) => {
    const llamar = vi.fn(respuesta) as unknown as typeof fetch & ReturnType<typeof vi.fn>;
    const log = { info: vi.fn(), warn: vi.fn() };
    return { servicio: new WebRebuildService(url ?? undefined, { llamar, log }), llamar, log };
  };

  it('sin URL (desarrollo) no hace nada', async () => {
    const { servicio, llamar } = armar(null);
    servicio.solicitar('obra publicada');
    await vi.advanceTimersByTimeAsync(10 * MIN);
    expect(servicio.activo).toBe(false);
    expect(llamar).not.toHaveBeenCalled();
  });

  it('no avisa enseguida: espera un minuto de calma', async () => {
    const { servicio, llamar } = armar();
    servicio.solicitar('obra publicada');
    await vi.advanceTimersByTimeAsync(59_000);
    expect(llamar).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(2_000);
    expect(llamar).toHaveBeenCalledTimes(1);
    expect(llamar).toHaveBeenCalledWith(HOOK, expect.objectContaining({ method: 'POST' }));
  });

  it('varios cambios seguidos son UNA sola llamada', async () => {
    const { servicio, llamar, log } = armar();
    servicio.solicitar('obra editada');
    await vi.advanceTimersByTimeAsync(20_000);
    servicio.solicitar('portada cambiada');
    await vi.advanceTimersByTimeAsync(20_000);
    servicio.solicitar('obra publicada');
    await vi.advanceTimersByTimeAsync(2 * MIN);
    expect(llamar).toHaveBeenCalledTimes(1);
    expect(log.info).toHaveBeenCalledWith(expect.objectContaining({ motivos: ['obra editada', 'portada cambiada', 'obra publicada'] }), expect.any(String));
  });

  it('si se sigue editando sin parar, igual avisa a los 5 minutos', async () => {
    const { servicio, llamar } = armar();
    for (let i = 0; i < 12; i++) {
      servicio.solicitar(`cambio ${i}`);
      await vi.advanceTimersByTimeAsync(30_000);
    }
    expect(llamar.mock.calls.length).toBeGreaterThanOrEqual(1);
    // …y no más de una por tramo de 5 minutos
    expect(llamar.mock.calls.length).toBeLessThanOrEqual(2);
  });

  it('después de avisar, un cambio nuevo vuelve a avisar', async () => {
    const { servicio, llamar } = armar();
    servicio.solicitar('uno');
    await vi.advanceTimersByTimeAsync(2 * MIN);
    servicio.solicitar('dos');
    await vi.advanceTimersByTimeAsync(2 * MIN);
    expect(llamar).toHaveBeenCalledTimes(2);
  });

  it('si Render falla o rechaza, no lanza error y registra un aviso SIN la URL', async () => {
    const caida = armar(HOOK, async () => {
      throw new TypeError(`fetch failed ${HOOK}`);
    });
    caida.servicio.solicitar('obra publicada');
    await vi.advanceTimersByTimeAsync(2 * MIN);
    expect(caida.log.warn).toHaveBeenCalledTimes(1);

    const rechazo = armar(HOOK, async () => new Response('no', { status: 401 }));
    rechazo.servicio.solicitar('obra publicada');
    await vi.advanceTimersByTimeAsync(2 * MIN);
    expect(rechazo.log.warn).toHaveBeenCalledTimes(1);

    const todo = JSON.stringify([...caida.log.warn.mock.calls, ...caida.log.info.mock.calls, ...rechazo.log.warn.mock.calls, ...rechazo.log.info.mock.calls]);
    expect(todo).not.toContain('SECRETO-DE-PRUEBA');
    expect(todo).not.toContain('render.com');
  });

  it('en el caso normal tampoco escribe la URL en los logs', async () => {
    const { servicio, log } = armar();
    servicio.solicitar('obra publicada');
    await vi.advanceTimersByTimeAsync(2 * MIN);
    expect(JSON.stringify(log.info.mock.calls)).not.toContain('SECRETO-DE-PRUEBA');
  });
});

// ---------------------------------------------------------------------------------------------
// Cuándo se pide reconstruir: solo cuando cambia algo que la web ya muestra
// ---------------------------------------------------------------------------------------------

const medio = (id: string, etapa: 'antes' | 'durante' | 'despues', extra: Partial<ProjectMedia> = {}): ProjectMedia =>
  ({ id, projectId: 'p1', etapa, tipo: 'foto', estado: 'listo', orden: 0, esPrincipal: false, esPortada: false, pie: null, ancho: 1600, alto: 900, duracionMs: null, cloudinaryId: `seima/projects/p1/${id}`, ...extra }) as ProjectMedia;

/** Una obra completa: comparación, portada y una foto por etapa. Se puede publicar. */
const MEDIOS_COMPLETOS = [
  medio('a1', 'antes', { esPrincipal: true, esPortada: true }),
  medio('d1', 'durante'),
  medio('x1', 'despues', { esPrincipal: true, esPortada: true }),
  medio('subiendo', 'durante', { estado: 'subiendo' as never, orden: 1 }),
];

function panel(estado: 'borrador' | 'publicado' | 'oculto') {
  const proyecto = { id: 'p1', slug: 'obra', titulo: 'Obra', descripcion: '', distrito: null, areaM2: null, dias: null, servicios: [], destacado: false, cliente: 'persona', estado, categorias: [], createdAt: new Date(), updatedAt: new Date() } as unknown as Project;
  const sinPendientes = MEDIOS_COMPLETOS.filter((m) => m.estado === 'listo');
  const repo = {
    findById: vi.fn(async () => proyecto),
    update: vi.fn(async () => undefined),
    setCategorias: vi.fn(async () => undefined),
    findAllMedia: vi.fn(async () => sinPendientes),
    findMediaById: vi.fn(async (id: string) => [...MEDIOS_COMPLETOS, medio('suelta', 'durante', { orden: 2 }), medio('sub2', 'durante', { estado: 'subiendo' as never, orden: 3 })].find((m) => m.id === id) ?? null),
    updateMedia: vi.fn(async () => undefined),
    deleteMedia: vi.fn(async () => undefined),
    reordenar: vi.fn(async () => undefined),
    setComparador: vi.fn(async () => undefined),
    setPortada: vi.fn(async () => undefined),
  };
  const solicitar = vi.fn();
  const servicio = new PanelProjectsService(repo as unknown as ProjectsRepository, {} as never, { signProjectMedia: vi.fn() } as unknown as UploadsService, { solicitar });
  return { servicio, solicitar };
}

describe('qué cambios piden reconstruir la web', () => {
  it('editar una obra PUBLICADA sí; un borrador o una oculta no', async () => {
    for (const [estado, esperado] of [['publicado', 1], ['borrador', 0], ['oculto', 0]] as const) {
      const { servicio, solicitar } = panel(estado);
      await servicio.update('p1', { titulo: 'Otro nombre' });
      expect(solicitar, estado).toHaveBeenCalledTimes(esperado);
    }
  });

  it('publicar, y ocultar una publicada, sí; publicar no avisa si falla la validación', async () => {
    const publicar = panel('borrador');
    await publicar.servicio.setEstado('p1', 'publicado');
    expect(publicar.solicitar).toHaveBeenCalledWith('obra publicada');

    const mostrar = panel('oculto');
    await mostrar.servicio.setEstado('p1', 'publicado');
    expect(mostrar.solicitar).toHaveBeenCalledWith('obra publicada');

    const ocultar = panel('publicado');
    await ocultar.servicio.setEstado('p1', 'oculto');
    expect(ocultar.solicitar).toHaveBeenCalledWith('obra oculta');

    const incompleta = panel('borrador');
    incompleta.servicio['repository'].findAllMedia = vi.fn(async () => []) as never;
    await expect(incompleta.servicio.setEstado('p1', 'publicado')).rejects.toThrow();
    expect(incompleta.solicitar).not.toHaveBeenCalled();

    const igual = panel('publicado');
    await igual.servicio.setEstado('p1', 'publicado');
    expect(igual.solicitar, 'sin cambio de estado no hay nada que reconstruir').not.toHaveBeenCalled();
  });

  it('comparación, portada, orden y quitar un archivo avisan solo si la obra está publicada', async () => {
    const acciones: [string, (s: PanelProjectsService) => Promise<unknown>][] = [
      ['comparación', (s) => s.setComparador('p1', { antesId: 'a1', despuesId: 'x1' })],
      ['portada', (s) => s.setPortada('p1', { antesId: 'a1', despuesId: 'x1' })],
      ['orden', (s) => s.reordenar('p1', { etapa: 'durante', ids: ['d1'] })],
      ['quitar', (s) => s.borrarMedio('p1', 'suelta')],
    ];
    for (const [nombre, accion] of acciones) {
      const publicada = panel('publicado');
      await accion(publicada.servicio);
      expect(publicada.solicitar, `${nombre} en publicada`).toHaveBeenCalledTimes(1);
      const borrador = panel('borrador');
      await accion(borrador.servicio);
      expect(borrador.solicitar, `${nombre} en borrador`).not.toHaveBeenCalled();
    }
  });

  it('terminar de subir un archivo avisa solo si es de una obra publicada', async () => {
    const publicada = panel('publicado');
    await publicada.servicio.confirmarMedio('p1', 'sub2', { cloudinaryId: 'seima/projects/p1/sub2', ancho: 1600, alto: 900 });
    expect(publicada.solicitar).toHaveBeenCalledWith('archivo agregado');
    const borrador = panel('borrador');
    await borrador.servicio.confirmarMedio('p1', 'sub2', { cloudinaryId: 'seima/projects/p1/sub2', ancho: 1600, alto: 900 });
    expect(borrador.solicitar).not.toHaveBeenCalled();
  });

  it('los tipos de trabajo (crear, editar, ordenar) avisan: salen en los filtros de la web', async () => {
    const cat = (id: string, nombre: string) => ({ id, slug: nombre.toLowerCase(), nombre, orden: 0, activo: true, obras: 0 }) as Category;
    const filas = [cat('c1', 'Cocinas'), cat('c2', 'Baños')];
    const repo = {
      findAllWithCounts: vi.fn(async () => filas),
      findByIdWithCount: vi.fn(async (id: string) => filas.find((c) => c.id === id) ?? cat(id, 'Nuevo')),
      findByNombre: vi.fn(async () => null),
      slugTaken: vi.fn(async () => false),
      nextOrden: vi.fn(async () => 2),
      save: vi.fn(async () => cat('c3', 'Pisos')),
      update: vi.fn(async () => undefined),
      countByIds: vi.fn(async (ids: string[]) => ids.length),
      reorder: vi.fn(async () => undefined),
    };
    const solicitar = vi.fn();
    const servicio = new CategoriesPanelService(repo as unknown as CategoriesRepository, { solicitar });
    await servicio.create({ nombre: 'Pisos' });
    await servicio.update('c1', { activo: false });
    await servicio.reorder(['c2', 'c1']);
    expect(solicitar.mock.calls.map((c) => c[0])).toEqual(['tipo de trabajo creado', 'tipo de trabajo editado', 'tipos de trabajo reordenados']);
  });

  it('sin aviso configurado, todo funciona igual', async () => {
    const repo = panel('publicado');
    const sinHook = new PanelProjectsService(repo.servicio['repository'], {} as never, {} as UploadsService);
    await expect(sinHook.update('p1', { titulo: 'Otro nombre' })).resolves.toBeDefined();
  });
});
