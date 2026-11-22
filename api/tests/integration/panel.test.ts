import { describe, expect, it } from 'vitest';
import { AppDataSource } from '../../src/database/data-source';
import { Category } from '../../src/modules/categories/category.entity';
import { API, agent, cotizacionValida, useDatabase } from './helpers';

useDatabase();

async function tokenAdmin() {
  const res = await agent().post(`${API}/auth/login`).send({ usuario: 'luis', password: '123456' });
  expect(res.status).toBe(200);
  return res.body.data.token as string;
}

const auth = (token: string) => ({ Authorization: `Bearer ${token}` });

describe('proyectos desde la app', () => {
  it('crea un borrador, sube el mínimo, publica, lo oculta y no deja borrarlo', async () => {
    const token = await tokenAdmin();
    const creado = await agent().post(`${API}/projects`).set(auth(token)).send({
      titulo: 'Cocina de prueba de la app',
      categorias: ['melamina', 'cocinas'],
      descripcion: 'Borrador de la prueba',
      distrito: 'Comas',
    });
    expect(creado.status).toBe(201);
    const id = creado.body.data.id as string;
    expect(creado.body.data.estado).toBe('borrador');
    expect(creado.body.data.slug).toBe('cocina-de-prueba-de-la-app');
    // Dos tipos de trabajo, en el orden del catálogo; la principal es la primera.
    expect(creado.body.data.categorias.map((c: { slug: string }) => c.slug)).toEqual(['cocinas', 'melamina']);
    expect(creado.body.data.categoria.slug).toBe('cocinas');

    const subir = async (etapa: 'antes' | 'durante' | 'despues', tipo: 'foto' | 'video' = 'foto') => {
      const reserva = await agent().post(`${API}/projects/${id}/medios`).set(auth(token)).send({ etapa, tipo });
      expect(reserva.status).toBe(201);
      const medio = reserva.body.data.medio;
      expect(medio.estado).toBe('subiendo');
      expect(reserva.body.data.firma.publicId).toBe(medio.cloudinaryId);
      expect(reserva.body.data.firma.signature).toMatch(/^[a-f0-9]{40}$/);
      const listo = await agent().post(`${API}/projects/${id}/medios/${medio.id}/confirmar`).set(auth(token)).send({
        cloudinaryId: medio.cloudinaryId,
        ancho: tipo === 'video' ? 1080 : 1920,
        alto: tipo === 'video' ? 1920 : 1080,
        ...(tipo === 'video' ? { duracionMs: 8000 } : {}),
      });
      expect(listo.status).toBe(200);
      return medio.id as string;
    };

    const antes = await subir('antes');
    const antesVideo = await subir('antes', 'video');
    await subir('durante');
    const despues = await subir('despues');
    const despuesVideo = await subir('despues', 'video');

    const mezcla = await agent().put(`${API}/projects/${id}/comparador`).set(auth(token)).send({ antesId: antes, despuesId: despuesVideo });
    expect(mezcla.status).toBe(422);
    expect(mezcla.body.error.details[0].mensaje).toMatch(/fotos o los dos videos/);

    const videos = await agent().put(`${API}/projects/${id}/comparador`).set(auth(token)).send({ antesId: antesVideo, despuesId: despuesVideo });
    expect(videos.status).toBe(200);
    expect(videos.body.data.comparador.antes.tipo).toBe('video');
    expect(videos.body.data.comparador.antes.orientacion).toBe('vertical');

    const portadaVideo = await agent().put(`${API}/projects/${id}/portada`).set(auth(token)).send({ antesId: antesVideo, despuesId: despues });
    expect(portadaVideo.status).toBe(422);

    const portada = await agent().put(`${API}/projects/${id}/portada`).set(auth(token)).send({ antesId: antes, despuesId: despues });
    expect(portada.status).toBe(200);

    const publicado = await agent().patch(`${API}/projects/${id}/estado`).set(auth(token)).send({ estado: 'publicado' });
    expect(publicado.status).toBe(200);
    const publico = await agent().get(`${API}/projects/${creado.body.data.slug}`);
    expect(publico.status).toBe(200);
    expect(publico.body.data.comparador.despues.tipo).toBe('video');
    expect(publico.body.data.portada.despues.tipo).toBe('foto');

    expect((await agent().delete(`${API}/projects/${id}`).set(auth(token))).status).toBe(409);

    const oculto = await agent().patch(`${API}/projects/${id}/estado`).set(auth(token)).send({ estado: 'oculto' });
    expect(oculto.status).toBe(200);
    expect((await agent().get(`${API}/projects/${creado.body.data.slug}`)).status).toBe(404);

    const borrarPortada = await agent().delete(`${API}/projects/${id}/medios/${antes}`).set(auth(token));
    expect(borrarPortada.status).toBe(409);
  });

  it('un borrador sí se puede borrar', async () => {
    const token = await tokenAdmin();
    const creado = await agent().post(`${API}/projects`).set(auth(token)).send({ titulo: 'Para borrar', categorias: ['banos', 'techos'] });
    const id = creado.body.data.id as string;
    const vinculos = () => AppDataSource.query('SELECT count(*)::int AS n FROM project_categories WHERE project_id = $1', [id]) as Promise<{ n: number }[]>;
    expect((await vinculos())[0].n).toBe(2);
    expect((await agent().delete(`${API}/projects/${id}`).set(auth(token))).status).toBe(204);
    expect((await agent().get(`${API}/projects/gestion/${id}`).set(auth(token))).status).toBe(404);
    // Al borrar la obra se van también sus vínculos con las categorías.
    expect((await vinculos())[0].n).toBe(0);
  });

  it('sin token no deja gestionar', async () => {
    expect((await agent().get(`${API}/projects/gestion`)).status).toBe(401);
    expect((await agent().post(`${API}/projects`).send({ titulo: 'Nada', categorias: ['cocinas'] })).status).toBe(401);
  });
});

describe('varios tipos de trabajo por obra', () => {
  it('se pueden cambiar al editar y se rechaza lo inválido', async () => {
    const token = await tokenAdmin();
    const creado = await agent().post(`${API}/projects`).set(auth(token)).send({ titulo: 'Obra con varios tipos', categorias: ['cocinas'] });
    expect(creado.status).toBe(201);
    const id = creado.body.data.id as string;

    const editado = await agent().patch(`${API}/projects/${id}`).set(auth(token)).send({ categorias: ['techos', 'banos', 'techos'] });
    expect(editado.status).toBe(200);
    expect(editado.body.data.categorias.map((c: { slug: string }) => c.slug)).toEqual(['banos', 'techos']);

    // Solo el título: las categorías no se tocan
    const titulo = await agent().patch(`${API}/projects/${id}`).set(auth(token)).send({ titulo: 'Obra renombrada' });
    expect(titulo.body.data.categorias).toHaveLength(2);

    const inexistente = await agent().patch(`${API}/projects/${id}`).set(auth(token)).send({ categorias: ['banos', 'no-existe'] });
    expect(inexistente.status).toBe(422);
    expect(JSON.stringify(inexistente.body.error.details)).toContain('no-existe');
    const intacto = await agent().get(`${API}/projects/gestion/${id}`).set(auth(token));
    expect(intacto.body.data.categorias).toHaveLength(2);

    expect((await agent().patch(`${API}/projects/${id}`).set(auth(token)).send({ categorias: [] })).status).toBe(422);
    expect((await agent().post(`${API}/projects`).set(auth(token)).send({ titulo: 'Sin tipo', categorias: [] })).status).toBe(422);
    expect((await agent().post(`${API}/projects`).set(auth(token)).send({ titulo: 'Con el campo viejo', categoria: 'cocinas' })).status).toBe(422);
    expect((await agent().post(`${API}/projects`).set(auth(token)).send({ titulo: 'Demasiados', categorias: ['cocinas', 'banos', 'techos', 'melamina', 'locales'] })).status).toBe(422);
  });

  it('una categoría que tiene obras no se puede borrar', async () => {
    const token = await tokenAdmin();
    await agent().post(`${API}/projects`).set(auth(token)).send({ titulo: 'Obra que usa remodelaciones', categorias: ['remodelaciones'] });
    await expect(AppDataSource.getRepository(Category).delete({ slug: 'remodelaciones' })).rejects.toThrow();
  });
});

describe('cotizaciones y dispositivos', () => {
  it('lista la cotización, cambia el estado y registra el celular', async () => {
    const token = await tokenAdmin();
    const creada = await agent().post(`${API}/quotes`).send(cotizacionValida);
    expect(creada.status).toBe(201);
    const id = creada.body.data.id as string;

    const lista = await agent().get(`${API}/quotes?estado=nueva`).set(auth(token));
    expect(lista.status).toBe(200);
    expect(lista.body.data.some((q: { id: string }) => q.id === id)).toBe(true);

    const detalle = await agent().get(`${API}/quotes/${id}`).set(auth(token));
    expect(detalle.status).toBe(200);
    expect(detalle.body.data.whatsapp).toBe('987654321');
    expect(detalle.body.data.servicios[0].slug).toBe('cocina');

    const estado = await agent().patch(`${API}/quotes/${id}/estado`).set(auth(token)).send({ estado: 'contactada' });
    expect(estado.status).toBe(200);
    expect(estado.body.data.estado).toBe('contactada');

    expect((await agent().get(`${API}/quotes`)).status).toBe(401);

    const dispositivo = await agent().post(`${API}/devices`).set(auth(token)).send({ token: 'token-fcm-de-prueba-123' });
    expect(dispositivo.status).toBe(201);
    const otraVez = await agent().post(`${API}/devices`).set(auth(token)).send({ token: 'token-fcm-de-prueba-123' });
    expect(otraVez.status).toBe(201);
    expect((await agent().delete(`${API}/devices/${encodeURIComponent('token-fcm-de-prueba-123')}`).set(auth(token))).status).toBe(204);
  });
});
