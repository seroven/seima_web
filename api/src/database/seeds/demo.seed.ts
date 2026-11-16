import type { DataSource } from 'typeorm';
import { Category } from '../../modules/categories/category.entity';
import { ProjectPhoto } from '../../modules/projects/project-photo.entity';
import { Project } from '../../modules/projects/project.entity';
import { ETAPAS, type Etapa, type TipoCliente } from '../../modules/projects/projects.types';

/**
 * PROYECTOS DE PRUEBA (los mismos 7 de web/src/data/projects.ts). NADA de esto es real:
 * los datos faltantes quedan en null y las fotos usan ids "demo/..." (la API devuelve url null para ellas).
 * Sirve para probar los endpoints y la web hasta que Luis cargue sus proyectos reales.
 */
interface Demo {
  slug: string;
  titulo: string;
  categoria: string;
  servicios: string[];
  descripcion: string;
  destacado: boolean;
  cliente: TipoCliente;
  fotos: Record<Etapa, number>;
}

const PENDIENTE = ' [DESCRIPCIÓN REAL: qué se hizo, materiales y reto de la obra.]';

const DEMOS: Demo[] = [
  { slug: 'cocina-drywall-porcelanato', titulo: 'Cocina en drywall y porcelanato', categoria: 'cocinas', servicios: ['Drywall', 'Enchapado'], descripcion: 'Estructura en drywall, enchape en porcelanato con cortes a 45° y acabado fino.' + PENDIENTE, destacado: true, cliente: 'persona', fotos: { antes: 4, durante: 6, despues: 9 } },
  { slug: 'bano-enchape-completo', titulo: 'Baño con enchape completo', categoria: 'banos', servicios: ['Enchapado', 'Electricidad'], descripcion: 'Enchapado de piso a techo, nichos y luces LED.' + PENDIENTE, destacado: true, cliente: 'persona', fotos: { antes: 3, durante: 5, despues: 7 } },
  { slug: 'mini-departamento-drywall', titulo: 'Mini departamento en drywall', categoria: 'departamentos', servicios: ['Drywall', 'Electricidad', 'Pintura'], descripcion: 'Del tabique a la entrega: estructura, cuartos, instalaciones y pintura.' + PENDIENTE, destacado: true, cliente: 'persona', fotos: { antes: 5, durante: 8, despues: 10 } },
  { slug: 'cochera-fachada-porcelanato', titulo: 'Cochera y fachada en porcelanato', categoria: 'cocheras-fachadas', servicios: ['Enchapado'], descripcion: 'Enchape de cochera y entrada de casa.' + PENDIENTE, destacado: false, cliente: 'persona', fotos: { antes: 3, durante: 4, despues: 6 } },
  { slug: 'falso-techo-drywall', titulo: 'Falso techo en drywall', categoria: 'techos', servicios: ['Drywall', 'Electricidad'], descripcion: 'Falso techo con iluminación integrada.' + PENDIENTE, destacado: false, cliente: 'persona', fotos: { antes: 3, durante: 0, despues: 5 } },
  { slug: 'closet-melamina', titulo: 'Closet y muebles en melamina', categoria: 'melamina', servicios: ['Melamina'], descripcion: 'Muebles a medida en melamina.' + PENDIENTE, destacado: false, cliente: 'persona', fotos: { antes: 2, durante: 3, despues: 6 } },
  { slug: 'local-comercial-acabados', titulo: 'Local comercial, acabados completos', categoria: 'locales', servicios: ['Drywall', 'Pintura', 'Electricidad'], descripcion: 'Divisiones, techos y pintura para un local comercial.' + PENDIENTE, destacado: false, cliente: 'empresa', fotos: { antes: 4, durante: 7, despues: 10 } },
];

export async function seedDemo(ds: DataSource): Promise<number> {
  const categorias = await ds.getRepository(Category).find();
  const porSlug = new Map(categorias.map((c) => [c.slug, c.id]));

  await ds.transaction(async (tx) => {
    const projects = tx.getRepository(Project);
    const photos = tx.getRepository(ProjectPhoto);

    for (const d of DEMOS) {
      const categoriaId = porSlug.get(d.categoria);
      if (!categoriaId) throw new Error(`Falta la categoría "${d.categoria}": corre primero "npm run seed:categories".`);

      await projects.upsert(
        { slug: d.slug, titulo: d.titulo, descripcion: d.descripcion, categoriaId, distrito: null, areaM2: null, dias: null, servicios: d.servicios, destacado: d.destacado, cliente: d.cliente, publicado: true },
        ['slug'],
      );
      const { id } = await projects.findOneByOrFail({ slug: d.slug });

      // Se regeneran las fotos de prueba de este proyecto (la primera de cada etapa es la principal)
      await photos.delete({ projectId: id });
      const filas = ETAPAS.flatMap((etapa) =>
        Array.from({ length: d.fotos[etapa] }, (_, i) => ({
          projectId: id,
          etapa,
          cloudinaryId: `demo/${d.slug}-${etapa}-${i + 1}`,
          orden: i,
          esPrincipal: i === 0,
          pie: null,
          ancho: null,
          alto: null,
        })),
      );
      if (filas.length) await photos.insert(filas);
    }
  });
  return DEMOS.length;
}
