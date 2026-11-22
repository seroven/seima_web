import { describe, expect, it, vi } from 'vitest';
import type { AnalyticsRepository } from '../../src/modules/analytics/analytics.repository';
import { dispositivoDe, esRobot, fechaLima, fechasDelRango, normalizarRuta, origenDe, proyectoDeRuta, rangoDe, visitanteId } from '../../src/modules/analytics/analytics.rules';
import { hitSchema, resumenQuerySchema } from '../../src/modules/analytics/analytics.schemas';
import { AnalyticsService } from '../../src/modules/analytics/analytics.service';

const UA_IPHONE = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148 Safari/604.1';
const UA_ANDROID = 'Mozilla/5.0 (Linux; Android 14; SM-S911B) AppleWebKit/537.36 Chrome/120.0 Mobile Safari/537.36';
const UA_TABLET = 'Mozilla/5.0 (Linux; Android 13; SM-X700) AppleWebKit/537.36 Chrome/120.0 Safari/537.36';
const UA_PC = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0 Safari/537.36';

describe('rutas que se miden', () => {
  it('limpia parámetros, ancla, barra final y mayúsculas', () => {
    expect(normalizarRuta('/')).toBe('/');
    expect(normalizarRuta('/proyectos/')).toBe('/proyectos');
    expect(normalizarRuta('/proyectos?categoria=cocinas')).toBe('/proyectos');
    expect(normalizarRuta('/Proyectos/Cocina-Moderna#fotos')).toBe('/proyectos/cocina-moderna');
    expect(normalizarRuta('/empresas')).toBe('/empresas');
    expect(normalizarRuta('/cotizador')).toBe('/cotizador');
  });

  it('ignora lo que no es una página de la web', () => {
    for (const mala of ['/admin', '/wp-login.php', '/proyectos/a b', '/proyectos/x/y', '/proyectos/-x', '//evil.com', '/api/v1/quotes']) {
      expect(normalizarRuta(mala), mala).toBeNull();
    }
  });

  it('saca la obra de /proyectos/<slug>', () => {
    expect(proyectoDeRuta('/proyectos/cocina-moderna')).toBe('cocina-moderna');
    expect(proyectoDeRuta('/proyectos')).toBeNull();
    expect(proyectoDeRuta('/')).toBeNull();
  });
});

describe('de dónde vienen', () => {
  const propios = ['seima.pe', 'www.seima.pe'];
  it('sin referrer ni utm es «Directo»', () => {
    expect(origenDe(undefined, undefined, propios)).toBe('Directo');
    expect(origenDe('', '', propios)).toBe('Directo');
    expect(origenDe('no es una url', undefined, propios)).toBe('Directo');
  });
  it('reconoce los sitios conocidos', () => {
    expect(origenDe('https://www.google.com/', undefined, propios)).toBe('Google');
    expect(origenDe('https://www.google.com.pe/search?q=x', undefined, propios)).toBe('Google');
    expect(origenDe('https://l.instagram.com/?u=x', undefined, propios)).toBe('Instagram');
    expect(origenDe('https://l.facebook.com/l.php', undefined, propios)).toBe('Facebook');
    expect(origenDe('https://www.tiktok.com/@seima.drywall', undefined, propios)).toBe('TikTok');
    expect(origenDe('https://wa.me/51999', undefined, propios)).toBe('WhatsApp');
    expect(origenDe('https://www.bing.com/', undefined, propios)).toBe('Otro buscador');
  });
  it('otro sitio: muestra su dirección sin www', () => {
    expect(origenDe('https://www.blog-de-obras.pe/nota', undefined, propios)).toBe('blog-de-obras.pe');
  });
  it('venir de la propia web no es un origen', () => {
    expect(origenDe('https://www.seima.pe/proyectos', undefined, propios)).toBe('Directo');
    expect(origenDe('https://seima.pe/', undefined, propios)).toBe('Directo');
  });
  it('utm_source manda sobre el referrer y se normaliza', () => {
    expect(origenDe('https://www.google.com/', 'tiktok', propios)).toBe('TikTok');
    expect(origenDe(undefined, 'WhatsApp', propios)).toBe('WhatsApp');
    expect(origenDe(undefined, 'boletin', propios)).toBe('Boletin');
  });
});

describe('robots y dispositivos', () => {
  it('descarta robots y navegadores vacíos', () => {
    expect(esRobot('Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)')).toBe(true);
    expect(esRobot('facebookexternalhit/1.1')).toBe(true);
    expect(esRobot('WhatsApp/2.23.20 A')).toBe(true);
    expect(esRobot('HeadlessChrome/120')).toBe(true);
    expect(esRobot('curl/8.4.0')).toBe(true);
    expect(esRobot(undefined)).toBe(true);
    expect(esRobot('')).toBe(true);
    expect(esRobot(UA_IPHONE)).toBe(false);
    expect(esRobot(UA_PC)).toBe(false);
  });
  it('distingue celular, tableta y computadora', () => {
    expect(dispositivoDe(UA_IPHONE)).toBe('movil');
    expect(dispositivoDe(UA_ANDROID)).toBe('movil');
    expect(dispositivoDe(UA_TABLET)).toBe('tablet');
    expect(dispositivoDe('Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X)')).toBe('tablet');
    expect(dispositivoDe(UA_PC)).toBe('escritorio');
    expect(dispositivoDe(undefined)).toBe('escritorio');
  });
});

describe('visitante anónimo', () => {
  const dia1 = new Date('2026-11-22T15:00:00Z'); // 10:00 en Lima
  it('es estable el mismo día y no revela la IP', () => {
    const a = visitanteId('secreto', dia1, '190.236.12.5', UA_PC);
    expect(a).toHaveLength(32);
    expect(a).toBe(visitanteId('secreto', new Date('2026-11-22T23:00:00Z'), '190.236.12.5', UA_PC));
    expect(a).not.toContain('190');
  });
  it('cambia con la IP, el navegador, el secreto y el día de Lima', () => {
    const base = visitanteId('secreto', dia1, '190.236.12.5', UA_PC);
    expect(visitanteId('secreto', dia1, '190.236.12.6', UA_PC)).not.toBe(base);
    expect(visitanteId('secreto', dia1, '190.236.12.5', UA_IPHONE)).not.toBe(base);
    expect(visitanteId('otro', dia1, '190.236.12.5', UA_PC)).not.toBe(base);
    expect(visitanteId('secreto', new Date('2026-11-23T15:00:00Z'), '190.236.12.5', UA_PC)).not.toBe(base);
  });
  it('el día se corta a medianoche de Lima, no de UTC', () => {
    // 03:00 UTC del 23 = 22:00 del 22 en Lima; 05:00 UTC del 23 = 00:00 del 23 en Lima
    expect(fechaLima(new Date('2026-11-23T03:00:00Z'))).toBe('2026-11-22');
    expect(fechaLima(new Date('2026-11-23T04:59:59Z'))).toBe('2026-11-22');
    expect(fechaLima(new Date('2026-11-23T05:00:00Z'))).toBe('2026-11-23');
  });
});

describe('periodos en hora de Lima', () => {
  const ahora = new Date('2026-11-22T15:00:00Z'); // domingo 10:00 en Lima
  it('hoy empieza a las 00:00 de Lima y el anterior es ayer', () => {
    const r = rangoDe('hoy', ahora);
    expect(r.desde.toISOString()).toBe('2026-11-22T05:00:00.000Z');
    expect(r.desdeAnterior.toISOString()).toBe('2026-11-21T05:00:00.000Z');
    expect(r.hasta).toBe(ahora);
    expect(fechasDelRango(r)).toEqual(['2026-11-22']);
  });
  it('7 días cuenta hoy y los 6 anteriores', () => {
    const r = rangoDe('7d', ahora);
    expect(r.desde.toISOString()).toBe('2026-11-16T05:00:00.000Z');
    expect(r.desdeAnterior.toISOString()).toBe('2026-11-09T05:00:00.000Z');
    expect(fechasDelRango(r)).toEqual(['2026-11-16', '2026-11-17', '2026-11-18', '2026-11-19', '2026-11-20', '2026-11-21', '2026-11-22']);
  });
  it('30 días', () => {
    const r = rangoDe('30d', ahora);
    expect(fechasDelRango(r)).toHaveLength(30);
    expect(fechasDelRango(r)[29]).toBe('2026-11-22');
    expect(r.desde.toISOString()).toBe('2026-10-24T05:00:00.000Z');
  });
  it('de madrugada en UTC todavía es el día anterior en Lima', () => {
    const r = rangoDe('hoy', new Date('2026-11-23T02:00:00Z')); // 21:00 del 22 en Lima
    expect(fechasDelRango(r)).toEqual(['2026-11-22']);
  });
});

describe('esquemas', () => {
  it('la visita exige una ruta que empiece con /', () => {
    expect(hitSchema.safeParse({ ruta: 'proyectos' }).success).toBe(false);
    expect(hitSchema.safeParse({ ruta: '' }).success).toBe(false);
    const ok = hitSchema.parse({ ruta: '/proyectos' });
    expect(ok.tipo).toBe('pagina');
    expect(hitSchema.safeParse({ ruta: '/', tipo: 'raro' }).success).toBe(false);
    expect(hitSchema.safeParse({ ruta: '/' + 'a'.repeat(300) }).success).toBe(false);
  });
  it('el periodo por defecto son 7 días y rechaza otros', () => {
    expect(resumenQuerySchema.parse({}).periodo).toBe('7d');
    expect(resumenQuerySchema.safeParse({ periodo: '1año' }).success).toBe(false);
  });
});

function repoFalso(sobreescribe: Partial<Record<keyof AnalyticsRepository, unknown>> = {}) {
  const vacio = { visitas: 0, visitantes: 0 };
  return {
    guardar: vi.fn(async (d: unknown) => d),
    contar: vi.fn(async () => vacio),
    porDia: vi.fn(async () => []),
    proyectos: vi.fn(async () => []),
    paginas: vi.fn(async () => []),
    origenes: vi.fn(async () => []),
    lugares: vi.fn(async () => []),
    dispositivos: vi.fn(async () => []),
    purgarAntes: vi.fn(async () => 0),
    ...sobreescribe,
  } as unknown as AnalyticsRepository & Record<string, ReturnType<typeof vi.fn>>;
}

describe('AnalyticsService.registrar', () => {
  const ahora = new Date('2026-11-22T15:00:00Z');
  const armar = (repo = repoFalso()) =>
    ({ repo, servicio: new AnalyticsService(repo, async () => 0, { secreto: 's', hostsPropios: ['seima.pe'], ubicar: () => ({ pais: 'PE', ciudad: 'Lima' }), ahora: () => ahora }) });

  it('guarda la visita con su origen, lugar y dispositivo, y NUNCA la IP', async () => {
    const { repo, servicio } = armar();
    const ok = await servicio.registrar({ tipo: 'pagina', ruta: '/proyectos/cocina-moderna?x=1', referrer: 'https://l.instagram.com/', utm: undefined }, { ip: '190.236.12.5', ua: UA_IPHONE });
    expect(ok).toBe(true);
    const fila = (repo.guardar as ReturnType<typeof vi.fn>).mock.calls[0]![0];
    expect(fila).toMatchObject({ tipo: 'pagina', ruta: '/proyectos/cocina-moderna', proyectoSlug: 'cocina-moderna', origen: 'Instagram', pais: 'PE', ciudad: 'Lima', dispositivo: 'movil' });
    expect(fila.visitante).toHaveLength(32);
    expect(JSON.stringify(fila)).not.toContain('190.236.12.5');
  });

  it('descarta robots y rutas desconocidas sin guardar nada', async () => {
    const { repo, servicio } = armar();
    expect(await servicio.registrar({ tipo: 'pagina', ruta: '/' }, { ip: '1.1.1.1', ua: 'Googlebot/2.1' })).toBe(false);
    expect(await servicio.registrar({ tipo: 'pagina', ruta: '/wp-admin' }, { ip: '1.1.1.1', ua: UA_PC })).toBe(false);
    expect(repo.guardar).not.toHaveBeenCalled();
  });

  it('guarda los eventos (whatsapp / compartir) con su tipo', async () => {
    const { repo, servicio } = armar();
    await servicio.registrar({ tipo: 'whatsapp', ruta: '/proyectos/cocina-moderna' }, { ip: '1.1.1.1', ua: UA_PC });
    expect((repo.guardar as ReturnType<typeof vi.fn>).mock.calls[0]![0]).toMatchObject({ tipo: 'whatsapp', proyectoSlug: 'cocina-moderna', dispositivo: 'escritorio' });
  });
});

describe('AnalyticsService.resumen', () => {
  const ahora = new Date('2026-11-22T15:00:00Z');

  it('completa con 0 los días sin visitas y arma cada bloque', async () => {
    const repo = repoFalso({
      contar: vi.fn(async (tipo: string, desde: Date) => {
        const esActual = desde.toISOString() === '2026-11-16T05:00:00.000Z';
        if (tipo === 'pagina') return esActual ? { visitas: 120, visitantes: 80 } : { visitas: 100, visitantes: 90 };
        if (tipo === 'whatsapp') return { visitas: esActual ? 9 : 4, visitantes: 0 };
        return { visitas: esActual ? 2 : 0, visitantes: 0 };
      }),
      porDia: vi.fn(async () => [{ fecha: '2026-11-18', visitas: 30, visitantes: 20 }]),
      proyectos: vi.fn(async () => [{ slug: 'cocina-moderna', titulo: 'Cocina moderna', visitas: 40, visitantes: 25 }]),
      paginas: vi.fn(async () => [{ ruta: '/', visitas: 70 }, { ruta: '/cotizador', visitas: 12 }]),
      origenes: vi.fn(async () => [{ origen: 'TikTok', visitas: 50 }]),
      lugares: vi.fn(async () => [{ pais: 'PE', ciudad: 'Lima', visitas: 90 }, { pais: null, ciudad: null, visitas: 3 }]),
      dispositivos: vi.fn(async () => [{ dispositivo: 'movil', visitas: 100 }, { dispositivo: 'escritorio', visitas: 20 }]),
    });
    const contarCot = vi.fn(async (desde: Date) => (desde.toISOString() === '2026-11-16T05:00:00.000Z' ? 5 : 3));
    const s = new AnalyticsService(repo, contarCot, { secreto: 's', ahora: () => ahora });
    const r = await s.resumen('7d');

    expect(r.visitas).toEqual({ actual: 120, anterior: 100 });
    expect(r.visitantes).toEqual({ actual: 80, anterior: 90 });
    expect(r.whatsapp).toEqual({ actual: 9, anterior: 4 });
    expect(r.compartidos).toEqual({ actual: 2, anterior: 0 });
    expect(r.cotizaciones).toEqual({ actual: 5, anterior: 3 });
    expect(r.porDia).toHaveLength(7);
    expect(r.porDia.find((d) => d.fecha === '2026-11-18')).toEqual({ fecha: '2026-11-18', visitas: 30, visitantes: 20 });
    expect(r.porDia.find((d) => d.fecha === '2026-11-19')).toEqual({ fecha: '2026-11-19', visitas: 0, visitantes: 0 });
    expect(r.proyectos[0]).toMatchObject({ slug: 'cocina-moderna', visitas: 40 });
    expect(r.paginas).toEqual([{ ruta: '/', nombre: 'Inicio', visitas: 70 }, { ruta: '/cotizador', nombre: 'Cotizador', visitas: 12 }]);
    expect(r.lugares).toEqual([{ pais: 'Perú', ciudad: 'Lima', visitas: 90 }, { pais: 'Sin ubicación', ciudad: null, visitas: 3 }]);
    expect(r.dispositivos).toEqual({ movil: 100, escritorio: 20, tablet: 0 });
  });

  it('sin ninguna visita todo sale en 0 y no falla', async () => {
    const s = new AnalyticsService(repoFalso(), async () => 0, { secreto: 's', ahora: () => ahora });
    const r = await s.resumen('hoy');
    expect(r.visitas).toEqual({ actual: 0, anterior: 0 });
    expect(r.porDia).toEqual([{ fecha: '2026-11-22', visitas: 0, visitantes: 0 }]);
    expect(r.proyectos).toEqual([]);
    expect(r.dispositivos).toEqual({ movil: 0, escritorio: 0, tablet: 0 });
  });

  it('borra el historial de más de 18 meses', async () => {
    const repo = repoFalso({ purgarAntes: vi.fn(async () => 7) });
    const s = new AnalyticsService(repo, async () => 0, { secreto: 's', ahora: () => new Date('2026-11-22T15:00:00Z') });
    expect(await s.purgar()).toBe(7);
    const limite = (repo.purgarAntes as ReturnType<typeof vi.fn>).mock.calls[0]![0] as Date;
    expect(limite.getFullYear()).toBe(2025);
    expect(limite.getMonth()).toBe(4); // mayo de 2025 = 18 meses antes de noviembre de 2026
  });
});
