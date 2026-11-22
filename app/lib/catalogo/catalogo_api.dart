import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../api/api_client.dart';
import '../api/api_error.dart';
import 'catalogo.dart';

final catalogoApiProvider = Provider<CatalogoApi>((ref) => CatalogoApi(ref.watch(dioProvider)));

/// Todo lo que la app le pide a la API para gestionar tipos de trabajo, servicios, preguntas y opciones.
class CatalogoApi {
  CatalogoApi(this._dio);

  final Dio _dio;

  // ---- Tipos de trabajo ----
  Future<List<TipoTrabajo>> tipos() => _pedir(() => _dio.get('categories/gestion'), tiposDesde);

  Future<TipoTrabajo> crearTipo(String nombre) => _pedir(() => _dio.post('categories', data: {'nombre': nombre}), tipoDesde);

  Future<TipoTrabajo> cambiarTipo(String id, {String? nombre, bool? activo}) {
    return _pedir(() => _dio.patch('categories/$id', data: {'nombre': ?nombre, 'activo': ?activo}), tipoDesde);
  }

  Future<List<TipoTrabajo>> ordenarTipos(List<String> ids) => _pedir(() => _dio.put('categories/orden', data: {'ids': ids}), tiposDesde);

  // ---- Servicios ----
  Future<List<ServicioCot>> servicios() => _pedir(() => _dio.get('catalog/services'), serviciosCotDesde);

  Future<ServicioCot> crearServicio({required String nombre, required String icono}) {
    return _pedir(() => _dio.post('catalog/services', data: {'nombre': nombre, 'icono': icono}), servicioCotDesde);
  }

  Future<ServicioCot> cambiarServicio(String id, {String? nombre, String? icono, bool? activo}) {
    return _pedir(() => _dio.patch('catalog/services/$id', data: {'nombre': ?nombre, 'icono': ?icono, 'activo': ?activo}), servicioCotDesde);
  }

  Future<List<ServicioCot>> ordenarServicios(List<String> ids) => _pedir(() => _dio.put('catalog/services/orden', data: {'ids': ids}), serviciosCotDesde);

  // ---- Preguntas ----
  Future<List<PreguntaCot>> preguntas() => _pedir(() => _dio.get('catalog/questions'), preguntasCotDesde);

  Future<PreguntaCot> crearPregunta({required String texto, required String etiqueta, required String tipo, required List<String> servicios}) {
    return _pedir(
      () => _dio.post('catalog/questions', data: {'texto': texto, 'etiqueta': etiqueta, 'tipo': tipo, 'servicios': servicios}),
      preguntaCotDesde,
    );
  }

  Future<PreguntaCot> cambiarPregunta(String id, {String? texto, String? etiqueta, String? tipo, bool? activo, List<String>? servicios}) {
    return _pedir(
      () => _dio.patch(
        'catalog/questions/$id',
        data: {'texto': ?texto, 'etiqueta': ?etiqueta, 'tipo': ?tipo, 'activo': ?activo, 'servicios': ?servicios},
      ),
      preguntaCotDesde,
    );
  }

  Future<List<PreguntaCot>> ordenarPreguntas(List<String> ids) => _pedir(() => _dio.put('catalog/questions/orden', data: {'ids': ids}), preguntasCotDesde);

  // ---- Opciones (cada llamada devuelve la pregunta completa, ya con el cambio) ----
  Future<PreguntaCot> crearOpcion(String preguntaId, {required String etiqueta, String? descripcion, required String tipoEntrada, String? entradaAyuda}) {
    return _pedir(
      () => _dio.post(
        'catalog/questions/$preguntaId/options',
        data: {'etiqueta': etiqueta, 'descripcion': descripcion ?? '', 'tipoEntrada': tipoEntrada, 'entradaAyuda': entradaAyuda ?? ''},
      ),
      preguntaCotDesde,
    );
  }

  Future<PreguntaCot> cambiarOpcion(String id, {String? etiqueta, String? descripcion, String? tipoEntrada, String? entradaAyuda, bool? activo}) {
    return _pedir(
      () => _dio.patch(
        'catalog/options/$id',
        data: {'etiqueta': ?etiqueta, 'descripcion': ?descripcion, 'tipoEntrada': ?tipoEntrada, 'entradaAyuda': ?entradaAyuda, 'activo': ?activo},
      ),
      preguntaCotDesde,
    );
  }

  Future<PreguntaCot> ordenarOpciones(String preguntaId, List<String> ids) {
    return _pedir(() => _dio.put('catalog/questions/$preguntaId/options/orden', data: {'ids': ids}), preguntaCotDesde);
  }

  Future<T> _pedir<T>(Future<Response<dynamic>> Function() llamada, T Function(Object?) leer) async {
    try {
      return leer((await llamada()).data);
    } on DioException catch (error) {
      throw ApiException.de(error);
    }
  }
}
