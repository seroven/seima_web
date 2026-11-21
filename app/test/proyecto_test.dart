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

  test('explica cuando el par no se puede comparar', () {
    final horizontal = _medio(id: 'a', ancho: 1600, alto: 900);
    final vertical = _medio(id: 'b', ancho: 900, alto: 1600);
    final video = _medio(id: 'c', tipo: 'video', ancho: 1600, alto: 900, duracionMs: 20000);

    expect(mensajeIncompatible(horizontal, vertical), 'Para compararlos, los dos deben ser fotos horizontales.');
    expect(mensajeIncompatible(horizontal, video), 'Para compararlos, los dos deben ser fotos o los dos videos.');
    expect(mensajeIncompatible(horizontal, _medio(id: 'd', ancho: 1000, alto: 1000)), isNull);
    expect(
      mensajeIncompatible(video, _medio(id: 'e', tipo: 'video', ancho: 1600, alto: 900, duracionMs: 10000)),
      'Los videos de la comparación duran como máximo 15 segundos.',
    );
  });
}

Medio _medio({required String id, String tipo = 'foto', int? ancho, int? alto, int? duracionMs}) {
  return Medio(
    id: id,
    etapa: 'antes',
    tipo: tipo,
    orden: 0,
    esPrincipal: false,
    esPortada: false,
    estado: 'listo',
    ancho: ancho,
    alto: alto,
    duracionMs: duracionMs,
  );
}
