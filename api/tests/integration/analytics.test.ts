// Mediciones de la web: la web avisa cada visita (público) y la app de Luis ve el resumen (JWT).
// Lo que se guarda aquí se borra al terminar: la base de pruebas se comparte entre archivos.
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { AppDataSource } from '../../src/database/data-source';
import { Visit } from '../../src/modules/analytics/visit.entity';
import { API, agent, useDatabase } from './helpers';

useDatabase();

const UA_IPHONE = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148 Safari/604.1';
const UA_PC = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0 Safari/537.36';

const limpiar = () => AppDataSource.getRepository(Visit).clear();
beforeAll(limpiar);
afterAll(limpiar);

async function tokenAdmin() {
  const res = await agent().post(`${API}/auth/login`).send({ usuario: 'luis', password: '123456' });
  expect(res.status).toBe(200);
  return res.body.data.token as string;
}
const auth = (token: string) => ({ Authorization: `Bearer ${token}` });
const hit = (cuerpo: object, ua: string | null = UA_IPHONE) => {
  const r = agent().post(`${API}/analytics/hit`);
  return (ua ? r.set('User-Agent', ua) : r).send(cuerpo);
};
const guardadas = () => AppDataSource.getRepository(Visit).count();

describe('POST /analytics/hit (público)', () => {
  it('guarda la visita y responde 204 sin cuerpo', async () => {
    const res = await hit({ ruta: '/', referrer: 'https://l.instagram.com/' });
    expect(res.status).toBe(204);
    expect(res.text).toBe('');
    const fila = (await AppDataSource.getRepository(Visit).find())[0]!;
    expect(fila).toMatchObject({ tipo: 'pagina', ruta: '/', origen: 'Instagram', dispositivo: 'movil', proyectoSlug: null });
    expect(fila.visitante).toHaveLength(32);
  });

  it('descarta robots, rutas que no medimos y navegadores vacíos (igual responde 204)', async () => {
    const antes = await guardadas();
    expect((await hit({ ruta: '/' }, 'Googlebot/2.1')).status).toBe(204);
    expect((await hit({ ruta: '/wp-login.php' })).status).toBe(204);
    expect((await hit({ ruta: '/' }, null)).status).toBe(204);
    expect(await guardadas()).toBe(antes);
  });

  it('rechaza datos mal formados con el formato de error de la API', async () => {
    const res = await hit({ ruta: 'sin-barra' });
    expect(res.status).toBe(422);
    expect(res.body.error.code).toBeDefined();
    expect((await hit({ ruta: '/', tipo: 'raro' })).status).toBe(422);
    expect((await hit({})).status).toBe(422);
  });

  it('no necesita sesión', async () => {
    expect((await hit({ ruta: '/empresas' })).status).toBe(204);
  });
});

describe('GET /analytics/summary (app de Luis)', () => {
  it('sin sesión → 401', async () => {
    expect((await agent().get(`${API}/analytics/summary`)).status).toBe(401);
  });

  it('periodo inválido → 422', async () => {
    const token = await tokenAdmin();
    expect((await agent().get(`${API}/analytics/summary?periodo=1año`).set(auth(token))).status).toBe(422);
  });

  it('cuenta visitas, visitantes, obras vistas, orígenes y dispositivos', async () => {
    await limpiar();
    const lista = await agent().get(`${API}/projects`);
    const obra = lista.body.data[0] as { slug: string; titulo: string };
    expect(obra?.slug).toBeTruthy();

    // dos personas distintas (otro navegador) ven la obra; una de ellas también el inicio y toca WhatsApp
    await hit({ ruta: `/proyectos/${obra.slug}`, referrer: 'https://www.google.com/' }, UA_IPHONE);
    await hit({ ruta: `/proyectos/${obra.slug}?x=1`, utm: 'tiktok' }, UA_PC);
    await hit({ ruta: '/' }, UA_IPHONE);
    await hit({ tipo: 'whatsapp', ruta: `/proyectos/${obra.slug}` }, UA_IPHONE);
    await hit({ ruta: '/proyectos/una-obra-que-no-existe' }, UA_PC); // cuenta como página vista pero no aparece entre las obras

    const token = await tokenAdmin();
    const res = await agent().get(`${API}/analytics/summary?periodo=hoy`).set(auth(token));
    expect(res.status).toBe(200);
    const r = res.body.data;

    expect(r.periodo).toBe('hoy');
    expect(r.visitas.actual).toBe(4); // 2 de la obra + inicio + la inexistente (el toque de WhatsApp no es página vista)
    expect(r.visitantes.actual).toBe(2);
    expect(r.visitas.anterior).toBe(0);
    expect(r.whatsapp.actual).toBe(1);
    expect(r.cotizaciones).toEqual(expect.objectContaining({ actual: expect.any(Number), anterior: expect.any(Number) }));
    expect(r.porDia).toHaveLength(1);
    expect(r.porDia[0].visitas).toBe(4);

    expect(r.proyectos).toEqual([{ slug: obra.slug, titulo: obra.titulo, visitas: 2, visitantes: 2 }]);
    expect(r.origenes.map((o: { origen: string }) => o.origen).sort()).toEqual(['Directo', 'Google', 'TikTok']);
    expect(r.dispositivos).toEqual({ movil: 2, escritorio: 2, tablet: 0 });
    expect(r.paginas).toEqual([{ ruta: '/', nombre: 'Inicio', visitas: 1 }]);
    expect(Array.isArray(r.lugares)).toBe(true);
  });

  it('7 y 30 días devuelven un punto por día, con ceros donde no hubo visitas', async () => {
    const token = await tokenAdmin();
    const siete = await agent().get(`${API}/analytics/summary?periodo=7d`).set(auth(token));
    expect(siete.body.data.porDia).toHaveLength(7);
    const treinta = await agent().get(`${API}/analytics/summary?periodo=30d`).set(auth(token));
    expect(treinta.body.data.porDia).toHaveLength(30);
    expect(treinta.body.data.visitas.actual).toBe(4);
    // por defecto son 7 días
    const defecto = await agent().get(`${API}/analytics/summary`).set(auth(token));
    expect(defecto.body.data.periodo).toBe('7d');
  });
});
