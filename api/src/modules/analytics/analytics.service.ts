import { CONSERVAR_MESES, type Dispositivo, type Periodo } from './analytics.constants';
import type { AnalyticsRepository } from './analytics.repository';
import { dispositivoDe, esRobot, fechasDelRango, normalizarRuta, origenDe, proyectoDeRuta, rangoDe, visitanteId } from './analytics.rules';
import type { HitInput } from './analytics.schemas';
import { ubicarIp, type Ubicacion } from './geo';

export interface Cifra {
  actual: number;
  anterior: number;
}

export interface ResumenVisitas {
  periodo: Periodo;
  desde: string;
  hasta: string;
  visitas: Cifra;
  visitantes: Cifra;
  cotizaciones: Cifra;
  whatsapp: Cifra;
  compartidos: Cifra;
  porDia: { fecha: string; visitas: number; visitantes: number }[];
  proyectos: { slug: string; titulo: string; visitas: number; visitantes: number }[];
  paginas: { ruta: string; nombre: string; visitas: number }[];
  origenes: { origen: string; visitas: number }[];
  lugares: { pais: string; ciudad: string | null; visitas: number }[];
  dispositivos: Record<Dispositivo, number>;
}

export interface Contexto {
  ip: string;
  ua: string | undefined;
}

interface Opciones {
  /** Secreto para fabricar el código anónimo del visitante (el JWT_SECRET). */
  secreto: string;
  /** Hosts de la propia web (para no contar «vino de nuestro sitio» como origen). */
  hostsPropios?: string[];
  ubicar?: (ip: string) => Ubicacion;
  ahora?: () => Date;
}

const NOMBRE_PAGINA: Record<string, string> = {
  '/': 'Inicio',
  '/proyectos': 'Catálogo de proyectos',
  '/empresas': 'Empresas',
  '/cotizador': 'Cotizador',
  '/privacidad': 'Privacidad',
};

const nombrePais = (() => {
  const nombres = new Intl.DisplayNames(['es'], { type: 'region' });
  return (codigo: string | null): string => {
    if (!codigo) return 'Sin ubicación';
    try {
      return nombres.of(codigo) ?? codigo;
    } catch {
      return codigo;
    }
  };
})();

const LIMITE_LISTAS = 8;

/** Registra las visitas de la web y arma el resumen que ve Luis en la app. */
export class AnalyticsService {
  private readonly ubicar: (ip: string) => Ubicacion;
  private readonly ahora: () => Date;

  constructor(
    private readonly repository: AnalyticsRepository,
    private readonly contarCotizaciones: (desde: Date, hasta: Date) => Promise<number>,
    private readonly opciones: Opciones,
  ) {
    this.ubicar = opciones.ubicar ?? ubicarIp;
    this.ahora = opciones.ahora ?? (() => new Date());
  }

  /** Devuelve false si la visita se descartó (robot o ruta que no medimos). No guarda la IP. */
  async registrar(hit: HitInput, ctx: Contexto): Promise<boolean> {
    if (esRobot(ctx.ua)) return false;
    const ruta = normalizarRuta(hit.ruta);
    if (!ruta) return false;
    const ahora = this.ahora();
    const lugar = this.ubicar(ctx.ip);
    await this.repository.guardar({
      createdAt: ahora,
      tipo: hit.tipo,
      ruta,
      proyectoSlug: proyectoDeRuta(ruta),
      visitante: visitanteId(this.opciones.secreto, ahora, ctx.ip, ctx.ua ?? ''),
      origen: origenDe(hit.referrer, hit.utm, this.opciones.hostsPropios),
      pais: lugar.pais,
      ciudad: lugar.ciudad,
      dispositivo: dispositivoDe(ctx.ua),
    });
    return true;
  }

  async resumen(periodo: Periodo): Promise<ResumenVisitas> {
    const rango = rangoDe(periodo, this.ahora());
    const { desde, hasta, desdeAnterior } = rango;
    const r = this.repository;
    const [pagActual, pagAnterior, waActual, waAnterior, shActual, shAnterior, cotActual, cotAnterior, dias, proyectos, paginas, origenes, lugares, dispositivos] = await Promise.all([
      r.contar('pagina', desde, hasta),
      r.contar('pagina', desdeAnterior, desde),
      r.contar('whatsapp', desde, hasta),
      r.contar('whatsapp', desdeAnterior, desde),
      r.contar('compartir', desde, hasta),
      r.contar('compartir', desdeAnterior, desde),
      this.contarCotizaciones(desde, hasta),
      this.contarCotizaciones(desdeAnterior, desde),
      r.porDia(desde, hasta),
      r.proyectos(desde, hasta, LIMITE_LISTAS),
      r.paginas(desde, hasta),
      r.origenes(desde, hasta, LIMITE_LISTAS),
      r.lugares(desde, hasta, LIMITE_LISTAS),
      r.dispositivos(desde, hasta),
    ]);
    const porFecha = new Map(dias.map((d) => [d.fecha, d]));
    const disp: Record<Dispositivo, number> = { movil: 0, escritorio: 0, tablet: 0 };
    for (const d of dispositivos) if (d.dispositivo in disp) disp[d.dispositivo as Dispositivo] = d.visitas;

    return {
      periodo,
      desde: desde.toISOString(),
      hasta: hasta.toISOString(),
      visitas: { actual: pagActual.visitas, anterior: pagAnterior.visitas },
      visitantes: { actual: pagActual.visitantes, anterior: pagAnterior.visitantes },
      cotizaciones: { actual: cotActual, anterior: cotAnterior },
      whatsapp: { actual: waActual.visitas, anterior: waAnterior.visitas },
      compartidos: { actual: shActual.visitas, anterior: shAnterior.visitas },
      porDia: fechasDelRango(rango).map((fecha) => ({ fecha, visitas: porFecha.get(fecha)?.visitas ?? 0, visitantes: porFecha.get(fecha)?.visitantes ?? 0 })),
      proyectos,
      paginas: paginas.map((p) => ({ ruta: p.ruta, nombre: NOMBRE_PAGINA[p.ruta] ?? p.ruta, visitas: p.visitas })),
      origenes,
      lugares: lugares.map((l) => ({ pais: nombrePais(l.pais), ciudad: l.ciudad, visitas: l.visitas })),
      dispositivos: disp,
    };
  }

  /** Borra el historial de más de CONSERVAR_MESES meses. */
  async purgar(): Promise<number> {
    const limite = this.ahora();
    limite.setMonth(limite.getMonth() - CONSERVAR_MESES);
    return this.repository.purgarAntes(limite);
  }
}
