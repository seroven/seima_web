import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:seima/api/api_error.dart';
import 'package:seima/catalogo/catalogo.dart';
import 'package:seima/catalogo/catalogo_api.dart';
import 'package:seima/catalogo/catalogo_controller.dart';

/// La API de la app, simulada: guarda lo que se le pide y puede fallar al guardar el orden.
class _ApiFalsa extends CatalogoApi {
  _ApiFalsa({this.listaTipos = const [], this.listaPreguntas = const [], this.falla = false}) : super(Dio());

  final List<TipoTrabajo> listaTipos;
  final List<PreguntaCot> listaPreguntas;
  final bool falla;
  List<String>? ordenTipos;
  List<String>? ordenPreguntas;
  List<String>? ordenOpciones;

  ApiException get _sinRed => ApiException('No hay conexión. Revisa el Wi-Fi e inténtalo de nuevo.', sinConexion: true);

  @override
  Future<List<TipoTrabajo>> tipos() async => listaTipos;

  @override
  Future<List<PreguntaCot>> preguntas() async => listaPreguntas;

  @override
  Future<List<TipoTrabajo>> ordenarTipos(List<String> ids) async {
    if (falla) throw _sinRed;
    ordenTipos = ids;
    return listaTipos;
  }

  @override
  Future<List<PreguntaCot>> ordenarPreguntas(List<String> ids) async {
    if (falla) throw _sinRed;
    ordenPreguntas = ids;
    return listaPreguntas;
  }

  @override
  Future<PreguntaCot> ordenarOpciones(String preguntaId, List<String> ids) async {
    if (falla) throw _sinRed;
    ordenOpciones = ids;
    return listaPreguntas.firstWhere((p) => p.id == preguntaId);
  }
}

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

  test('reordenado deja el elemento en su posición final y no toca la lista original', () {
    const lista = ['a', 'b', 'c', 'd'];
    // Arrastrar «a» al final: su posición final es 3.
    expect(reordenado(lista, 0, 3), ['b', 'c', 'd', 'a']);
    // Arrastrar «d» al principio.
    expect(reordenado(lista, 3, 0), ['d', 'a', 'b', 'c']);
    // Arrastrar «b» una posición hacia abajo.
    expect(reordenado(lista, 1, 2), ['a', 'c', 'b', 'd']);
    // Soltarlo donde estaba: no cambia.
    expect(reordenado(lista, 2, 2), lista);
    // Fuera de rango no rompe.
    expect(reordenado(lista, 9, 0), lista);
    expect(reordenado(lista, 0, 99), ['b', 'c', 'd', 'a']);
    expect(lista, ['a', 'b', 'c', 'd']);
  });

  group('arrastrar para reordenar', () {
    TipoTrabajo tipo(String id) => TipoTrabajo(id: id, slug: id, nombre: id, orden: 0, activo: true, obras: 0);
    OpcionCot opcion(String id, int orden) =>
        OpcionCot(id: id, slug: id, etiqueta: id, descripcion: null, tipoEntrada: 'ninguna', entradaAyuda: null, orden: orden, activo: true);
    PreguntaCot pregunta(String id, int orden, List<String> servicios, [List<OpcionCot> opciones = const []]) => PreguntaCot(
      id: id,
      slug: id,
      texto: id,
      etiqueta: id,
      tipo: 'unica',
      orden: orden,
      activo: true,
      servicios: [for (final s in servicios) RefServicio(id: s, slug: s, nombre: s)],
      opciones: opciones,
      visible: true,
    );

    test('los tipos cambian de lugar al instante y se guarda el nuevo orden', () async {
      final api = _ApiFalsa(listaTipos: [tipo('a'), tipo('b'), tipo('c')]);
      final c = ProviderContainer(overrides: [catalogoApiProvider.overrideWithValue(api)]);
      addTearDown(c.dispose);
      await c.read(tiposProvider.future);

      final error = await c.read(tiposProvider.notifier).reordenar(0, 2);

      expect(error, isNull);
      expect([for (final t in c.read(tiposProvider).value!) t.id], ['b', 'c', 'a']);
      expect(api.ordenTipos, ['b', 'c', 'a']);
    });

    test('si no se puede guardar, la lista vuelve a lo que hay en el servidor y avisa', () async {
      final api = _ApiFalsa(listaTipos: [tipo('a'), tipo('b'), tipo('c')], falla: true);
      final c = ProviderContainer(overrides: [catalogoApiProvider.overrideWithValue(api)]);
      addTearDown(c.dispose);
      await c.read(tiposProvider.future);

      final error = await c.read(tiposProvider.notifier).reordenar(0, 2);

      expect(error, 'No hay conexión. Revisa el Wi-Fi e inténtalo de nuevo.');
      expect([for (final t in c.read(tiposProvider).value!) t.id], ['a', 'b', 'c']);
    });

    test('las preguntas de un servicio se acomodan entre sí sin mover las de otros servicios', () async {
      final api = _ApiFalsa(
        listaPreguntas: [
          pregunta('p1', 0, ['x']),
          pregunta('p2', 1, ['y']),
          pregunta('p3', 2, ['x']),
          pregunta('p4', 3, ['y']),
        ],
      );
      final c = ProviderContainer(overrides: [catalogoApiProvider.overrideWithValue(api)]);
      addTearDown(c.dispose);
      final todas = await c.read(preguntasCotProvider.future);
      final deX = todas.where((p) => p.aplicaA('x')).toList();

      // Se arrastra «p3» antes de «p1».
      final error = await c.read(preguntasCotProvider.notifier).reordenarDeServicio(deX, 1, 0);

      expect(error, isNull);
      expect(api.ordenPreguntas, ['p3', 'p1']);
      final orden = {for (final p in c.read(preguntasCotProvider).value!) p.id: p.orden};
      expect(orden, {'p3': 0, 'p2': 1, 'p1': 2, 'p4': 3}, reason: 'p2 y p4 (del otro servicio) conservan su número');
    });

    test('las opciones se renumeran y se guarda el orden', () async {
      final api = _ApiFalsa(listaPreguntas: [pregunta('q', 0, ['x'], [opcion('o1', 0), opcion('o2', 1), opcion('o3', 2)])]);
      final c = ProviderContainer(overrides: [catalogoApiProvider.overrideWithValue(api)]);
      addTearDown(c.dispose);
      await c.read(preguntasCotProvider.future);

      final error = await c.read(preguntasCotProvider.notifier).reordenarOpciones('q', 2, 0);

      expect(error, isNull);
      final opciones = c.read(preguntasCotProvider).value!.single.opciones;
      expect([for (final o in opciones) '${o.id}:${o.orden}'], ['o3:0', 'o1:1', 'o2:2']);
      expect(api.ordenOpciones, ['o3', 'o1', 'o2']);
    });
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
