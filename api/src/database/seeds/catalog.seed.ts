import type { DataSource } from 'typeorm';
import { OpcionPregunta } from '../../modules/catalog/opcion-pregunta.entity';
import { Pregunta } from '../../modules/catalog/pregunta.entity';
import { Servicio } from '../../modules/catalog/servicio.entity';
import { PREGUNTAS, SERVICIOS } from './catalog.data';

/**
 * Carga el catálogo del cotizador (catalog.data.ts). Se puede correr las veces que haga falta: actualiza lo que ya existe
 * y agrega lo nuevo, siempre por `slug`. No borra nada (hay respuestas guardadas que apuntan a estas filas).
 */
export async function seedCatalog(ds: DataSource): Promise<{ servicios: number; preguntas: number; opciones: number }> {
  const servicios = ds.getRepository(Servicio);
  const preguntas = ds.getRepository(Pregunta);
  const opciones = ds.getRepository(OpcionPregunta);

  await servicios.upsert(
    SERVICIOS.map((s, i) => ({ ...s, orden: i, activo: true })),
    ['slug'],
  );
  const porSlug = new Map((await servicios.find()).map((s) => [s.slug, s]));

  let totalOpciones = 0;
  for (const [i, p] of PREGUNTAS.entries()) {
    const aplica = p.servicios.map((slug) => {
      const s = porSlug.get(slug);
      if (!s) throw new Error(`catalog.data.ts: la pregunta "${p.slug}" apunta a un servicio que no existe: "${slug}"`);
      return s;
    });
    const existente = await preguntas.findOne({ where: { slug: p.slug }, relations: { servicios: true } });
    const pregunta = existente ?? preguntas.create({ slug: p.slug });
    Object.assign(pregunta, { texto: p.texto, etiqueta: p.etiqueta, tipo: p.tipo, orden: i, activo: true, servicios: aplica });
    await preguntas.save(pregunta);

    await opciones.upsert(
      p.opciones.map((o, j) => ({
        questionId: pregunta.id,
        slug: o.slug,
        etiqueta: o.etiqueta,
        descripcion: o.descripcion ?? null,
        tipoEntrada: o.entrada ?? ('ninguna' as const),
        entradaAyuda: o.ayuda ?? null,
        orden: j,
        activo: true,
      })),
      ['questionId', 'slug'],
    );
    totalOpciones += p.opciones.length;
  }
  return { servicios: SERVICIOS.length, preguntas: PREGUNTAS.length, opciones: totalOpciones };
}
