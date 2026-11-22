import type { DataSource } from 'typeorm';
import { OpcionPregunta } from '../../modules/catalog/opcion-pregunta.entity';
import { Pregunta } from '../../modules/catalog/pregunta.entity';
import { Servicio } from '../../modules/catalog/servicio.entity';
import { PREGUNTAS, SERVICIOS } from './catalog.data';

/** Una fila que nadie ha editado: `updated_at` sigue siendo igual a `created_at` (la dejó una migración). */
const sinTocar = (fila: { createdAt: Date; updatedAt: Date }) => fila.createdAt.getTime() === fila.updatedAt.getTime();

/**
 * Carga el catálogo base del cotizador (catalog.data.ts) sin pisar lo que se haya editado.
 *
 * Desde que el catálogo se gestiona en la app de Luis, la base es la fuente de verdad. Por eso:
 *  - **agrega** lo que falta (servicios, preguntas y opciones), por `slug`;
 *  - **nunca borra** (hay respuestas guardadas que apuntan a estas filas);
 *  - **no modifica** lo que ya existe, SALVO las filas que nadie ha tocado desde que las creó una migración
 *    (`updated_at = created_at`): esas se completan con el catálogo base, que es lo que hacía falta en una base nueva
 *    (las migraciones crean unas pocas preguntas con textos y orden provisionales). Una vez editada o refrescada una
 *    fila, ya no se vuelve a tocar.
 * Devuelve cuántos servicios, preguntas y opciones NUEVOS agregó.
 */
export async function seedCatalog(ds: DataSource): Promise<{ servicios: number; preguntas: number; opciones: number }> {
  const servicios = ds.getRepository(Servicio);
  const preguntas = ds.getRepository(Pregunta);
  const opciones = ds.getRepository(OpcionPregunta);

  // ---- Servicios ----
  let nuevosServicios = 0;
  const actuales = new Map((await servicios.find()).map((s) => [s.slug, s]));
  for (const [i, s] of SERVICIOS.entries()) {
    const existente = actuales.get(s.slug);
    if (!existente) {
      await servicios.insert({ ...s, orden: i, activo: true });
      nuevosServicios++;
    } else if (sinTocar(existente)) {
      await servicios.update(existente.id, { nombre: s.nombre, icono: s.icono, orden: i, activo: true });
    }
  }
  const porSlug = new Map((await servicios.find()).map((s) => [s.slug, s]));

  // ---- Preguntas y opciones ----
  let nuevasPreguntas = 0;
  let nuevasOpciones = 0;
  for (const [i, p] of PREGUNTAS.entries()) {
    const aplica = p.servicios.map((slug) => {
      const s = porSlug.get(slug);
      if (!s) throw new Error(`catalog.data.ts: la pregunta "${p.slug}" apunta a un servicio que no existe: "${slug}"`);
      return s;
    });
    let pregunta = await preguntas.findOne({ where: { slug: p.slug }, relations: { servicios: true } });
    if (!pregunta) {
      pregunta = await preguntas.save(preguntas.create({ slug: p.slug, texto: p.texto, etiqueta: p.etiqueta, tipo: p.tipo, orden: i, activo: true, servicios: aplica }));
      nuevasPreguntas++;
    } else if (sinTocar(pregunta)) {
      await preguntas.save({ id: pregunta.id, texto: p.texto, etiqueta: p.etiqueta, tipo: p.tipo, orden: i, activo: true, servicios: aplica });
      pregunta = (await preguntas.findOne({ where: { id: pregunta.id }, relations: { servicios: true } }))!;
    }

    const tiene = new Map((await opciones.find({ where: { questionId: pregunta.id } })).map((o) => [o.slug, o]));
    for (const [j, o] of p.opciones.entries()) {
      const datos = {
        etiqueta: o.etiqueta,
        descripcion: o.descripcion ?? null,
        tipoEntrada: o.entrada ?? ('ninguna' as const),
        entradaAyuda: o.ayuda ?? null,
        orden: j,
        activo: true,
      };
      const existente = tiene.get(o.slug);
      if (!existente) {
        await opciones.insert({ questionId: pregunta.id, slug: o.slug, ...datos });
        nuevasOpciones++;
      } else if (sinTocar(existente)) {
        await opciones.update(existente.id, datos);
      }
    }
  }
  return { servicios: nuevosServicios, preguntas: nuevasPreguntas, opciones: nuevasOpciones };
}
