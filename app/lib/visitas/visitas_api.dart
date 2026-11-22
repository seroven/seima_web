import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../api/api_client.dart';
import '../api/api_error.dart';
import 'visitas.dart';

final visitasApiProvider = Provider<VisitasApi>((ref) => VisitasApi(ref.watch(dioProvider)));

/// Lo que la app le pide a la API para ver las visitas de la web. La app nunca toca la base de datos.
class VisitasApi {
  VisitasApi(this._dio);

  final Dio _dio;

  Future<ResumenVisitas> resumen(String periodo) async {
    try {
      final res = await _dio.get('analytics/summary', queryParameters: {'periodo': periodo});
      return resumenVisitasDesde(res.data);
    } on DioException catch (error) {
      throw ApiException.de(error);
    }
  }
}
