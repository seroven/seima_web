import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:seima/api/api_error.dart';
import 'package:seima/catalogo/catalogo.dart';
import 'package:seima/catalogo/catalogo_controller.dart';

void main() {
  test('lee los tipos de trabajo con cuántas obras usa cada uno', () {
    final tipos = tiposDesde({
      'data': [
        {'id': 'a', 'slug': 'cocinas', 'nombre': 'Cocinas', 'orden': 0, 'activo': true, 'obras': 3},
        {'id': 'b', 'slug': 'pisos', 'nombre': 'Pisos', 'orden': 1, 'activo': false, 'obras': 0},
      ],
    });
    expect(tipos, hasLength(2));
    expect(tipos.first.obras, 3);
    expect(tipos.last.activo, isFalse);
  });

  test('lee un servicio y usa el ícono genérico si no viene', () {
    final servicio = servicioCotDesde({
      'data': {'id': 's1', 'slug': 'pisos', 'nombre': 'Pisos', 'orden': 4, 'activo': true, 'preguntas': 2},
    });
    expect(servicio.icono, 'generico');
    expect(servicio.preguntas, 2);
    expect(iconoDeServicio('cocinas'), Icons.kitchen);
    expect(iconoDeServicio('algo-nuevo'), Icons.layers_outlined);
  });

  test('lee una pregunta con sus opciones, servicios y lo que pide cada opción', () {
    final pregunta = preguntaCotDesde({
      'data': {
        'id': 'q1',
        'slug': 'area',
        'texto': '¿Cuántos m²?',
        'etiqueta': 'Área',
        'tipo': 'multiple',
        'orden': 2,
        'activo': true,
        'visible': true,
        'servicios': [
          {'id': 's1', 'slug': 'cocina', 'nombre': 'Cocina'},
          {'id': 's2', 'slug': 'bano', 'nombre': 'Baño'},
        ],
        'opciones': [
          {'id': 'o1', 'slug': 'sabe', 'etiqueta': 'Sé el área', 'descripcion': '', 'tipoEntrada': 'numero', 'entradaAyuda': 'm²', 'orden': 0, 'activo': true},
          {'id': 'o2', 'slug': 'otro', 'etiqueta': 'Otro', 'descripcion': 'Algo distinto', 'tipoEntrada': 'texto', 'entradaAyuda': null, 'orden': 1, 'activo': false},
          {'id': 'o3', 'slug': 'nose', 'etiqueta': 'No sé', 'tipoEntrada': 'raro', 'orden': 2, 'activo': true},
        ],
      },
    });
    expect(pregunta.variasRespuestas, isTrue);
    expect(pregunta.resumenTipo, 'Elige varias');
    expect(pregunta.aplicaA('s2'), isTrue);
    expect(pregunta.aplicaA('s9'), isFalse);
    expect(pregunta.opcionesActivas, 2);
    expect(pregunta.opciones[0].resumenEntrada, 'Pide un número (m²)');
    expect(pregunta.opciones[0].descripcion, isNull);
    expect(pregunta.opciones[1].resumenEntrada, 'Pide un texto');
    expect(pregunta.opciones[2].tipoEntrada, 'ninguna');
    expect(pregunta.opciones[2].resumenEntrada, '');
  });

  test('una respuesta rara no rompe la lectura', () {
    expect(tiposDesde(null), isEmpty);
    expect(preguntasCotDesde({'data': 'nada'}), isEmpty);
    final vacia = preguntaCotDesde({'data': {}});
    expect(vacia.opciones, isEmpty);
    expect(vacia.tipo, 'unica');
  });

  test('mover cambia de lugar con el vecino y no se sale de la lista', () {
    const ids = ['a', 'b', 'c'];
    expect(movido(ids, 'b', -1), ['b', 'a', 'c']);
    expect(movido(ids, 'b', 1), ['a', 'c', 'b']);
    expect(movido(ids, 'a', -1), isNull);
    expect(movido(ids, 'c', 1), isNull);
    expect(movido(ids, 'z', 1), isNull);
    expect(ids, ['a', 'b', 'c'], reason: 'no modifica la lista original');
  });

  test('el error de validación muestra el motivo concreto', () {
    expect(
      mensajeDesde({
        'error': {
          'message': 'Hay datos inválidos',
          'details': [
            {'campo': 'nombre', 'mensaje': 'El nombre es muy corto'},
          ],
        },
      }),
      'El nombre es muy corto',
    );
    expect(mensajeDesde({'error': {'message': 'Ya existe un servicio con ese nombre.'}}), 'Ya existe un servicio con ese nombre.');
    expect(mensajeDesde(null), 'Algo salió mal. Inténtalo de nuevo.');
  });
}
