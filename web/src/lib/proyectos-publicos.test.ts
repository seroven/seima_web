import assert from 'node:assert/strict';
import { detalleAProyecto, tarjetaAProyecto } from './proyectos-publicos.ts';

const tarjeta = tarjetaAProyecto({
  slug: 'cocina-surco',
  titulo: 'Cocina en Surco',
  categoria: { slug: 'cocinas', nombre: 'Cocinas' },
  distrito: 'Surco',
  areaM2: 12,
  dias: 8,
  servicios: ['Drywall'],
  destacado: true,
  cliente: 'persona',
  portada: {
    despues: { tipo: 'foto', orden: 0, esPrincipal: true, url: 'https://img.test/despues.jpg', pie: null },
    antes: { tipo: 'foto', orden: 0, esPrincipal: true, url: 'https://img.test/antes.jpg', pie: null },
  },
});

assert.equal(tarjeta?.slug, 'cocina-surco');
assert.equal(tarjeta?.categoria, 'cocinas');
assert.equal(tarjeta?.fotos.length, 2);
assert.equal(tarjeta?.fotos.find((f) => f.etapa === 'despues')?.src, 'https://img.test/despues.jpg');

const detalle = detalleAProyecto({
  slug: 'bano',
  titulo: 'Baño',
  categoria: { slug: 'banos', nombre: 'Baños' },
  cliente: 'empresa',
  descripcion: 'Enchape de piso a techo.',
  portada: { antes: null, despues: null },
  medios: {
    antes: [{ tipo: 'foto', orden: 0, esPrincipal: true, url: 'https://img.test/a.jpg' }],
    durante: [],
    despues: [{ tipo: 'video', orden: 1, esPrincipal: true, url: 'https://img.test/v.mp4', poster: 'https://img.test/poster.jpg' }],
  },
});

assert.equal(detalle?.descripcion, 'Enchape de piso a techo.');
assert.equal(detalle?.cliente, 'empresa');
assert.equal(detalle?.fotos.find((f) => f.etapa === 'despues')?.src, 'https://img.test/poster.jpg');
assert.equal(tarjetaAProyecto({ titulo: 'sin slug' }), null);

console.log('ok');
