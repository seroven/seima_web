import 'package:flutter_test/flutter_test.dart';
import 'package:seima/projects/proyecto.dart';

void main() {
  test('lee un proyecto de gestión', () {
    final proyecto = proyectoDesde({
      'data': {
        'id': 'p1',
        'titulo': 'Cocina de Miraflores',
        'estado': 'borrador',
        'categoria': {'slug': 'cocinas', 'nombre': 'Cocinas'},
        'distrito': 'Miraflores',
        'areaM2': 18.5,
        'dias': 12,
        'servicios': ['Drywall'],
        'descripcion': 'Una cocina',
        'cliente': 'persona',
        'portada': {
          'antes': null,
          'despues': {'url': 'https://ejemplo/despues.jpg'},
        },
        'comparador': {'antes': null, 'despues': null},
        'medios': {
          'antes': [
            {'id': 'm1', 'etapa': 'antes', 'tipo': 'foto', 'orden': 0, 'esPrincipal': false, 'esPortada': false, 'estado': 'listo', 'url': 'https://ejemplo/a.jpg'},
          ],
          'durante': [],
          'despues': [],
        },
      },
    });

    expect(proyecto.titulo, 'Cocina de Miraflores');
    expect(proyecto.categoriaNombre, 'Cocinas');
    expect(proyecto.portadaLista, 'https://ejemplo/despues.jpg');
    expect(proyecto.de('antes'), hasLength(1));
    expect(proyecto.etiquetaEstado, 'Borrador');
  });

  test('dice qué falta para publicar', () {
    const vacio = Proyecto(
      id: 'p',
      titulo: 'Obra',
      estado: 'borrador',
      categoriaSlug: 'cocinas',
      categoriaNombre: 'Cocinas',
      distrito: null,
      areaM2: null,
      dias: null,
      servicios: [],
      descripcion: '',
      cliente: 'persona',
      portadaAntes: null,
      portadaDespues: null,
      medios: {},
      comparadorAntes: null,
      comparadorDespues: null,
    );

    expect(faltantesParaPublicar(vacio), [
      'Falta algo en Antes.',
      'Falta algo en Durante.',
      'Falta algo en Después.',
      'Falta la comparación.',
      'Falta la portada.',
    ]);
  });
}
