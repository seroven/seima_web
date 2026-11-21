import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../api/api_client.dart';
import '../api/api_error.dart';
import 'proyecto.dart';

final proyectosApiProvider = Provider<ProyectosApi>((ref) => ProyectosApi(ref.watch(dioProvider)));

class ProyectosApi {
  ProyectosApi(this._dio);

  final Dio _dio;

  Future<List<Proyecto>> listar() => _lista(() => _dio.get('projects/gestion', queryParameters: {'limit': 100}));

  Future<Proyecto> obtener(String id) => _uno(() => _dio.get('projects/gestion/$id'));

  Future<Proyecto> crear(Map<String, dynamic> datos) => _uno(() => _dio.post('projects', data: datos));

  Future<Proyecto> actualizar(String id, Map<String, dynamic> datos) => _uno(() => _dio.patch('projects/$id', data: datos));

  Future<void> eliminar(String id) => _vacio(() => _dio.delete('projects/$id'));

  Future<Proyecto> cambiarEstado(String id, String estado) => _uno(() => _dio.patch('projects/$id/estado', data: {'estado': estado}));

  Future<Proyecto> guardarComparador(String id, String antesId, String despuesId) {
    return _uno(() => _dio.put('projects/$id/comparador', data: {'antesId': antesId, 'despuesId': despuesId}));
  }

  Future<Proyecto> guardarPortada(String id, String antesId, String despuesId) {
    return _uno(() => _dio.put('projects/$id/portada', data: {'antesId': antesId, 'despuesId': despuesId}));
  }

  Future<List<OpcionCatalogo>> categorias() => _catalogo(() => _dio.get('categories'), categoriasDesde);

  Future<List<OpcionCatalogo>> servicios() => _catalogo(() => _dio.get('quote-form'), serviciosDesde);

  Future<Proyecto> subirFoto({
    required String projectId,
    required String etapa,
    required List<int> bytes,
    required String nombre,
  }) async {
    final creado = await _data(() => _dio.post('projects/$projectId/medios', data: {'etapa': etapa, 'tipo': 'foto'}));
    final medio = _mapa(creado['medio']);
    final medioId = medio?['id'];
    final firma = firmaDesde(creado['firma']);
    if (medioId is! String || firma.uploadUrl.isEmpty) {
      throw ApiException('No se pudo preparar la foto.');
    }
    try {
      final nube = Dio();
      final subida = await nube.post<Map<String, dynamic>>(
        firma.uploadUrl,
        data: FormData.fromMap({
          'file': MultipartFile.fromBytes(bytes, filename: nombre),
          'api_key': firma.apiKey,
          'timestamp': firma.timestamp.toString(),
          'signature': firma.signature,
          'public_id': firma.publicId,
          'allowed_formats': firma.allowedFormats,
        }),
      );
      final cuerpo = subida.data ?? const {};
      final publicId = cuerpo['public_id'];
      final ancho = cuerpo['width'];
      final alto = cuerpo['height'];
      if (publicId is! String || ancho is! num || alto is! num) {
        throw ApiException('La foto se subió, pero no llegaron sus medidas.');
      }
      return _uno(
        () => _dio.post(
          'projects/$projectId/medios/$medioId/confirmar',
          data: {'cloudinaryId': publicId, 'ancho': ancho.toInt(), 'alto': alto.toInt()},
        ),
      );
    } catch (error) {
      try {
        await _dio.delete('projects/$projectId/medios/$medioId');
      } catch (_) {}
      if (error is ApiException) rethrow;
      if (error is DioException) throw ApiException.de(error);
      throw ApiException('No se pudo subir la foto.');
    }
  }

  Future<Proyecto> quitarMedio(String projectId, String medioId) => _uno(() => _dio.delete('projects/$projectId/medios/$medioId'));

  Future<Proyecto> reordenar(String projectId, String etapa, List<String> ids) {
    return _uno(() => _dio.patch('projects/$projectId/medios/orden', data: {'etapa': etapa, 'ids': ids}));
  }

  Future<List<Proyecto>> _lista(Future<Response<dynamic>> Function() llamada) async {
    try {
      return proyectosDesde((await llamada()).data);
    } on DioException catch (error) {
      throw ApiException.de(error);
    }
  }

  Future<Proyecto> _uno(Future<Response<dynamic>> Function() llamada) async {
    try {
      return proyectoDesde((await llamada()).data);
    } on DioException catch (error) {
      throw ApiException.de(error);
    }
  }

  Future<Map<String, dynamic>> _data(Future<Response<dynamic>> Function() llamada) async {
    try {
      final cuerpo = (await llamada()).data;
      final data = cuerpo is Map ? cuerpo['data'] : null;
      if (data is Map) return Map<String, dynamic>.from(data);
      throw ApiException('La respuesta del servidor no se entiende.');
    } on DioException catch (error) {
      throw ApiException.de(error);
    }
  }

  Future<List<OpcionCatalogo>> _catalogo(
    Future<Response<dynamic>> Function() llamada,
    List<OpcionCatalogo> Function(Object? body) leer,
  ) async {
    try {
      return leer((await llamada()).data);
    } on DioException catch (error) {
      throw ApiException.de(error);
    }
  }

  Future<void> _vacio(Future<Response<dynamic>> Function() llamada) async {
    try {
      await llamada();
    } on DioException catch (error) {
      throw ApiException.de(error);
    }
  }
}

Map<String, dynamic>? _mapa(Object? valor) => valor is Map ? Map<String, dynamic>.from(valor) : null;
