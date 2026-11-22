// Gestión desde la app de Luis: tipos de trabajo, servicios del cotizador, sus preguntas y opciones.
// Lo que se crea aquí se DESACTIVA al final para no alterar los conteos de las demás pruebas (la base se comparte).
import { afterAll, describe, expect, it } from 'vitest';
import { AppDataSource } from '../../src/database/data-source';
import { seedCatalog } from '../../src/database/seeds/catalog.seed';
import { seedCategories } from '../../src/database/seeds/categories.seed';
import { API, agent, useDatabase } from './helpers';

useDatabase();

async function tokenAdmin() {
  const res = await agent().post(`${API}/auth/login`).send({ usuario: 'luis', password: '123456' });
  expect(res.status).toBe(200);
  return res.body.data.token as string;
}
const auth = (token: string) => ({ Authorization: `Bearer ${token}` });
const ids = (lista: { id: string }[]) => lista.map((x) => x.id);

const creados = { categoria: '', servicio: '', pregunta: '' };

afterAll(async () => {
  const token = await tokenAdmin();
  if (creados.categoria) await agent().patch(`${API}/categories/${creados.categoria}`).set(auth(token)).send({ activo: false });
  if (creados.pregunta) await agent().patch(`${API}/catalog/questions/${creados.pregunta}`).set(auth(token)).send({ activo: false });
  if (creados.servicio) await agent().patch(`${API}/catalog/services/${creados.servicio}`).set(auth(token)).send({ activo: false });
});

describe('sin sesión no se puede gestionar nada', () => {
  it.each([
    ['get', '/categories/gestion'],
    ['post', '/categories'],
    ['put', '/categories/orden'],
    ['get', '/catalog/services'],
    ['post', '/catalog/services'],
    ['get', '/catalog/questions'],
    ['post', '/catalog/questions'],
    ['patch', '/catalog/options/11111111-1111-4111-8111-111111111111'],
  ] as const)('%s %s → 401', async (metodo, ruta) => {
    expect((await agent()[metodo](`${API}${ruta}`).send({})).status).toBe(401);
  });
});

describe('tipos de trabajo', () => {
  it('lista todos con cuántas obras usa cada uno', async () => {
    const token = await tokenAdmin();
    const res = await agent().get(`${API}/categories/gestion`).set(auth(token));
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(8);
    const cocinas = res.body.data.find((c: { slug: string }) => c.slug === 'cocinas');
    expect(cocinas).toMatchObject({ nombre: 'Cocinas', activo: true });
    expect(cocinas.obras).toBeGreaterThanOrEqual(1);
  });

  it('crea, renombra sin cambiar el slug, ordena y desactiva; la web lo refleja', async () => {
    const token = await tokenAdmin();
    const creada = await agent().post(`${API}/categories`).set(auth(token)).send({ nombre: 'Pisos de prueba' });
    expect(creada.status).toBe(201);
    expect(creada.body.data).toMatchObject({ slug: 'pisos-de-prueba', activo: true, obras: 0 });
    creados.categoria = creada.body.data.id;

    expect((await agent().get(`${API}/categories`)).body.data.map((c: { slug: string }) => c.slug)).toContain('pisos-de-prueba');
    expect((await agent().post(`${API}/categories`).set(auth(token)).send({ nombre: 'PISOS DE PRUEBA' })).status).toBe(409);
    expect((await agent().post(`${API}/categories`).set(auth(token)).send({ nombre: 'x' })).status).toBe(422);

    const renombrada = await agent().patch(`${API}/categories/${creados.categoria}`).set(auth(token)).send({ nombre: 'Pisos y zócalos de prueba' });
    expect(renombrada.body.data).toMatchObject({ nombre: 'Pisos y zócalos de prueba', slug: 'pisos-de-prueba' });

    // Orden: se pasa al principio y la lista pública lo respeta
    const actual = (await agent().get(`${API}/categories/gestion`).set(auth(token))).body.data as { id: string }[];
    const nuevoOrden = [creados.categoria, ...ids(actual).filter((id) => id !== creados.categoria)];
    const ordenada = await agent().put(`${API}/categories/orden`).set(auth(token)).send({ ids: nuevoOrden });
    expect(ordenada.status).toBe(200);
    expect(ordenada.body.data[0].id).toBe(creados.categoria);
    expect((await agent().get(`${API}/categories`)).body.data[0].slug).toBe('pisos-de-prueba');
    // …y se deja donde estaba
    await agent().put(`${API}/categories/orden`).set(auth(token)).send({ ids: [...ids(actual)] });

    expect((await agent().put(`${API}/categories/orden`).set(auth(token)).send({ ids: [creados.categoria, creados.categoria] })).status).toBe(422);
    expect((await agent().patch(`${API}/categories/11111111-1111-4111-8111-111111111111`).set(auth(token)).send({ activo: false })).status).toBe(404);

    const apagada = await agent().patch(`${API}/categories/${creados.categoria}`).set(auth(token)).send({ activo: false });
    expect(apagada.body.data.activo).toBe(false);
    expect((await agent().get(`${API}/categories`)).body.data.map((c: { slug: string }) => c.slug)).not.toContain('pisos-de-prueba');
    // Sigue en la gestión (se ve «desactivado» en la app)
    expect((await agent().get(`${API}/categories/gestion`).set(auth(token))).body.data.map((c: { slug: string }) => c.slug)).toContain('pisos-de-prueba');
  });

  it('el seed de categorías no pisa lo que se editó', async () => {
    const token = await tokenAdmin();
    const lista = (await agent().get(`${API}/categories/gestion`).set(auth(token))).body.data as { id: string; slug: string; nombre: string }[];
    const techos = lista.find((c) => c.slug === 'techos')!;
    await agent().patch(`${API}/categories/${techos.id}`).set(auth(token)).send({ nombre: 'Techos editados', activo: false });
    try {
      expect(await seedCategories(AppDataSource)).toBe(0);
      const despues = (await agent().get(`${API}/categories/gestion`).set(auth(token))).body.data.find((c: { slug: string }) => c.slug === 'techos');
      expect(despues).toMatchObject({ nombre: 'Techos editados', activo: false });
    } finally {
      await agent().patch(`${API}/categories/${techos.id}`).set(auth(token)).send({ nombre: techos.nombre, activo: true });
    }
  });
});

describe('servicios, preguntas y opciones del cotizador', () => {
  it('un servicio nuevo aparece en el formulario y desaparece al desactivarlo', async () => {
    const token = await tokenAdmin();
    const lista = await agent().get(`${API}/catalog/services`).set(auth(token));
    expect(lista.body.data).toHaveLength(10);
    expect(lista.body.data[0]).toMatchObject({ slug: 'cocina', activo: true });
    expect(lista.body.data[0].preguntas).toBeGreaterThan(0);

    const creado = await agent().post(`${API}/catalog/services`).set(auth(token)).send({ nombre: 'Pisos laminados' });
    expect(creado.status).toBe(201);
    expect(creado.body.data).toMatchObject({ slug: 'pisos-laminados', icono: 'generico', activo: true, preguntas: 0 });
    creados.servicio = creado.body.data.id;
    expect((await agent().post(`${API}/catalog/services`).set(auth(token)).send({ nombre: 'cocina' })).status).toBe(409);
    expect((await agent().post(`${API}/catalog/services`).set(auth(token)).send({ nombre: 'Pisos', icono: 'cohete' })).status).toBe(422);

    const enForm = async () => (await agent().get(`${API}/quote-form`)).body.data.servicios.map((s: { slug: string }) => s.slug) as string[];
    expect(await enForm()).toContain('pisos-laminados');

    const editado = await agent().patch(`${API}/catalog/services/${creados.servicio}`).set(auth(token)).send({ nombre: 'Pisos laminados y vinílicos', icono: 'enchapado' });
    expect(editado.body.data).toMatchObject({ slug: 'pisos-laminados', nombre: 'Pisos laminados y vinílicos', icono: 'enchapado' });
    expect((await agent().get(`${API}/quote-form`)).body.data.servicios.find((s: { slug: string }) => s.slug === 'pisos-laminados')).toMatchObject({ icono: 'enchapado' });

    await agent().patch(`${API}/catalog/services/${creados.servicio}`).set(auth(token)).send({ activo: false });
    expect(await enForm()).not.toContain('pisos-laminados');
    await agent().patch(`${API}/catalog/services/${creados.servicio}`).set(auth(token)).send({ activo: true });
  });

  it('una pregunta se muestra cuando tiene opciones; se pueden ordenar, editar y apagar', async () => {
    const token = await tokenAdmin();
    const pregunta = await agent().post(`${API}/catalog/questions`).set(auth(token)).send({
      texto: '¿Qué tipo de piso quieres?',
      etiqueta: 'Tipo de piso',
      tipo: 'unica',
      servicios: [creados.servicio],
    });
    expect(pregunta.status).toBe(201);
    expect(pregunta.body.data).toMatchObject({ slug: 'tipo-de-piso', activo: true, opciones: [], visible: false });
    creados.pregunta = pregunta.body.data.id;
    const id = creados.pregunta;

    const enForm = async () => {
      const preguntas = (await agent().get(`${API}/quote-form`)).body.data.preguntas as { slug: string; servicios: string[]; opciones: { slug: string; etiqueta: string; tipoEntrada: string; entradaAyuda: string | null }[] }[];
      return preguntas.find((p) => p.slug === 'tipo-de-piso');
    };
    // Sin opciones no se muestra
    expect(await enForm()).toBeUndefined();

    const a = await agent().post(`${API}/catalog/questions/${id}/options`).set(auth(token)).send({ etiqueta: 'Laminado', descripcion: 'Rápido de instalar' });
    expect(a.status).toBe(201);
    expect(a.body.data.visible).toBe(true);
    await agent().post(`${API}/catalog/questions/${id}/options`).set(auth(token)).send({ etiqueta: 'Otro', tipoEntrada: 'texto', entradaAyuda: '¿Cuál?' });
    await agent().post(`${API}/catalog/questions/${id}/options`).set(auth(token)).send({ etiqueta: 'No sé', tipoEntrada: 'ninguna', entradaAyuda: 'se ignora' });
    expect((await agent().post(`${API}/catalog/questions/${id}/options`).set(auth(token)).send({ etiqueta: 'laminado' })).status).toBe(409);

    const visible = await enForm();
    expect(visible?.servicios).toEqual(['pisos-laminados']);
    expect(visible?.opciones.map((o) => o.slug)).toEqual(['laminado', 'otro', 'no-se']);
    expect(visible?.opciones[1]).toMatchObject({ tipoEntrada: 'texto', entradaAyuda: '¿Cuál?' });
    expect(visible?.opciones[2]).toMatchObject({ tipoEntrada: 'ninguna', entradaAyuda: null });

    // Ordenar: «No sé» primero
    const detalle = (await agent().get(`${API}/catalog/questions/${id}`).set(auth(token))).body.data;
    const [o1, o2, o3] = ids(detalle.opciones);
    const reorden = await agent().put(`${API}/catalog/questions/${id}/options/orden`).set(auth(token)).send({ ids: [o3, o1, o2] });
    expect(reorden.body.data.opciones.map((o: { slug: string }) => o.slug)).toEqual(['no-se', 'laminado', 'otro']);
    expect((await enForm())?.opciones.map((o) => o.slug)).toEqual(['no-se', 'laminado', 'otro']);
    expect((await agent().put(`${API}/catalog/questions/${id}/options/orden`).set(auth(token)).send({ ids: [o1, '22222222-2222-4222-8222-222222222222'] })).status).toBe(422);

    // Editar una opción: pasar «Otro» a número limpia/pone la ayuda; apagar «Laminado» la saca del formulario
    const numero = await agent().patch(`${API}/catalog/options/${o2}`).set(auth(token)).send({ tipoEntrada: 'numero', entradaAyuda: 'm²' });
    expect(numero.body.data.opciones.find((o: { id: string }) => o.id === o2)).toMatchObject({ tipoEntrada: 'numero', entradaAyuda: 'm²' });
    const sinAyuda = await agent().patch(`${API}/catalog/options/${o2}`).set(auth(token)).send({ tipoEntrada: 'ninguna' });
    expect(sinAyuda.body.data.opciones.find((o: { id: string }) => o.id === o2)).toMatchObject({ tipoEntrada: 'ninguna', entradaAyuda: null });
    await agent().patch(`${API}/catalog/options/${o1}`).set(auth(token)).send({ activo: false });
    expect((await enForm())?.opciones.map((o) => o.slug)).toEqual(['no-se', 'otro']);

    // Texto y tipo de la pregunta
    const editada = await agent().patch(`${API}/catalog/questions/${id}`).set(auth(token)).send({ tipo: 'multiple', texto: '¿Qué pisos te interesan?' });
    expect(editada.body.data).toMatchObject({ tipo: 'multiple', texto: '¿Qué pisos te interesan?', slug: 'tipo-de-piso' });

    // Apagar la pregunta la saca del formulario
    await agent().patch(`${API}/catalog/questions/${id}`).set(auth(token)).send({ activo: false });
    expect(await enForm()).toBeUndefined();
    await agent().patch(`${API}/catalog/questions/${id}`).set(auth(token)).send({ activo: true });
  });

  it('una pregunta puede aplicar a varios servicios y se cambian sin perder las opciones', async () => {
    const token = await tokenAdmin();
    const base = (await agent().get(`${API}/catalog/services`).set(auth(token))).body.data as { id: string; slug: string }[];
    const cocina = base.find((s) => s.slug === 'cocina')!;
    const id = creados.pregunta;
    const dos = await agent().patch(`${API}/catalog/questions/${id}`).set(auth(token)).send({ servicios: [creados.servicio, cocina.id] });
    expect(dos.body.data.servicios.map((s: { slug: string }) => s.slug).sort()).toEqual(['cocina', 'pisos-laminados']);
    expect(dos.body.data.opciones.length).toBeGreaterThan(0);
    const uno = await agent().patch(`${API}/catalog/questions/${id}`).set(auth(token)).send({ servicios: [creados.servicio] });
    expect(uno.body.data.servicios).toHaveLength(1);
    expect((await agent().patch(`${API}/catalog/questions/${id}`).set(auth(token)).send({ servicios: [] })).status).toBe(422);
    expect((await agent().patch(`${API}/catalog/questions/${id}`).set(auth(token)).send({ servicios: ['11111111-1111-4111-8111-111111111111'] })).status).toBe(422);
  });

  it('ordenar las preguntas de un servicio no mueve las de los demás', async () => {
    const token = await tokenAdmin();
    const antes = (await agent().get(`${API}/catalog/questions`).set(auth(token))).body.data as { id: string; slug: string; orden: number; servicios: { slug: string }[] }[];
    const delBano = antes.filter((p) => p.servicios.some((s) => s.slug === 'bano'));
    expect(delBano.length).toBeGreaterThan(1);
    const invertido = [...delBano].reverse().map((p) => p.id);
    const res = await agent().put(`${API}/catalog/questions/orden`).set(auth(token)).send({ ids: invertido });
    expect(res.status).toBe(200);
    const despues = res.body.data as { id: string; slug: string; orden: number }[];
    // Las que no son del baño conservan su número de orden
    for (const p of antes.filter((x) => !delBano.some((b) => b.id === x.id))) expect(despues.find((d) => d.id === p.id)?.orden).toBe(p.orden);
    // Las del baño quedaron en el orden pedido
    const ordenDelBano = despues.filter((d) => invertido.includes(d.id)).sort((a, b) => a.orden - b.orden).map((d) => d.id);
    expect(ordenDelBano).toEqual(invertido);
    // …y se deja como estaba
    await agent().put(`${API}/catalog/questions/orden`).set(auth(token)).send({ ids: delBano.map((p) => p.id) });
    expect((await agent().get(`${API}/quote-form`)).body.data.preguntas.map((p: { slug: string }) => p.slug).slice(0, 3)).toEqual(antes.slice(0, 3).map((p) => p.slug));
  });

  it('el seed del catálogo no pisa lo que se editó ni reactiva lo apagado', async () => {
    const token = await tokenAdmin();
    const servicios = (await agent().get(`${API}/catalog/services`).set(auth(token))).body.data as { id: string; slug: string; nombre: string; activo: boolean }[];
    const pintura = servicios.find((s) => s.slug === 'pintura')!;
    await agent().patch(`${API}/catalog/services/${pintura.id}`).set(auth(token)).send({ nombre: 'Pintura editada', activo: false });
    try {
      const r = await seedCatalog(AppDataSource);
      expect(r).toEqual({ servicios: 0, preguntas: 0, opciones: 0 });
      // En una base nueva, las preguntas que crean las migraciones quedaron con el orden del catálogo base (sin repetidos)
      const ordenes = (await agent().get(`${API}/catalog/questions`).set(auth(token))).body.data.map((p: { orden: number }) => p.orden) as number[];
      expect(new Set(ordenes).size).toBe(ordenes.length);
      const despues = (await agent().get(`${API}/catalog/services`).set(auth(token))).body.data.find((s: { slug: string }) => s.slug === 'pintura');
      expect(despues).toMatchObject({ nombre: 'Pintura editada', activo: false });
    } finally {
      await agent().patch(`${API}/catalog/services/${pintura.id}`).set(auth(token)).send({ nombre: pintura.nombre, activo: pintura.activo });
    }
  });
});
