import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../api/api_client.dart';
import '../api/api_error.dart';
import 'cotizacion.dart';

final cotizacionesApiProvider = Provider<CotizacionesApi>((ref) => CotizacionesApi(ref.watch(dioProvider)));

class CotizacionesApi {
  CotizacionesApi(this._dio);

  final Dio _dio;

  Future<List<CotizacionResumen>> listar() => _lista(() => _dio.get('quotes', queryParameters: {'limit': 100}));

  Future<Cotizacion> obtener(String id) => _una(() => _dio.get('quotes/$id'));

  Future<void> cambiarEstado(String id, String estado) async {
    try {
      await _dio.patch('quotes/$id/estado', data: {'estado': estado});
    } on DioException catch (error) {
      throw ApiException.de(error);
    }
  }

  Future<List<CotizacionResumen>> _lista(Future<Response<dynamic>> Function() llamada) async {
    try {
      return cotizacionesDesde((await llamada()).data);
    } on DioException catch (error) {
      throw ApiException.de(error);
    }
  }

  Future<Cotizacion> _una(Future<Response<dynamic>> Function() llamada) async {
    try {
      return cotizacionDesde((await llamada()).data);
    } on DioException catch (error) {
      throw ApiException.de(error);
    } on FormatException {
      throw ApiException('La cotización no se entiende.');
    }
  }
}
