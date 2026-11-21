import 'dart:async';

import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../auth/almacen_sesion.dart';
import '../auth/auth_api.dart';
import '../auth/session_store.dart';
import '../auth/token_vault.dart';
import '../config/app_env.dart';
import 'api_error.dart';

final dioProvider = Provider<Dio>((ref) {
  final base = AppEnv.apiUrl;
  final dio = Dio(
    BaseOptions(
      baseUrl: base,
      connectTimeout: const Duration(seconds: 15),
      receiveTimeout: const Duration(seconds: 20),
      headers: {'Accept': 'application/json', 'Content-Type': 'application/json'},
    ),
  );
  final bare = Dio(dio.options);
  dio.interceptors.add(
    RefreshInterceptor(
      dio: dio,
      bare: bare,
      vault: ref.read(tokenVaultProvider),
      store: ref.read(sessionStoreProvider),
    ),
  );
  return dio;
});

final authApiProvider = Provider<AuthApi>((ref) => DioAuthApi(ref.watch(dioProvider)));

class DioAuthApi implements AuthApi {
  DioAuthApi(this._dio);

  final Dio _dio;

  @override
  Future<Credenciales> entrar({required String usuario, required String password}) {
    return _credenciales(
      () => _dio.post(
        'auth/login',
        data: {'usuario': usuario, 'password': password, 'dispositivo': 'SEIMA Android'},
        options: Options(extra: const {'skipAuth': true, 'skipRefresh': true}),
      ),
    );
  }

  @override
  Future<Credenciales> renovar(String refreshToken) {
    return _credenciales(
      () => _dio.post(
        'auth/refresh',
        data: {'refreshToken': refreshToken},
        options: Options(extra: const {'skipAuth': true, 'skipRefresh': true}),
      ),
    );
  }

  @override
  Future<void> salir(String refreshToken) {
    return _vacio(
      () => _dio.post(
        'auth/logout',
        data: {'refreshToken': refreshToken},
        options: Options(extra: const {'skipAuth': true, 'skipRefresh': true}),
      ),
    );
  }

  @override
  Future<void> cambiarContrasena({required String actual, required String nueva}) {
    return _vacio(() => _dio.patch('auth/password', data: {'passwordActual': actual, 'passwordNueva': nueva}));
  }

  @override
  Future<void> registrarDispositivo(String token) {
    return _vacio(() => _dio.post('devices', data: {'token': token}));
  }

  @override
  Future<void> olvidarDispositivo(String token) {
    return _vacio(() => _dio.delete('devices/${Uri.encodeComponent(token)}'));
  }

  Future<Credenciales> _credenciales(Future<Response<dynamic>> Function() llamada) async {
    try {
      final respuesta = await llamada();
      return credencialesDesde(respuesta.data);
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

/// Si el acceso venció, pide un par nuevo una sola vez y reintenta.
///
/// El refresh rota: hay que guardar el nuevo antes de que otra petición use el viejo,
/// porque reusarlo cierra toda la familia de sesiones.
class RefreshInterceptor extends Interceptor {
  RefreshInterceptor({required this.dio, required this.bare, required this.vault, required this.store});

  final Dio dio;
  final Dio bare;
  final TokenVault vault;
  final SessionStore store;
  Future<void>? _renovando;

  @override
  void onRequest(RequestOptions options, RequestInterceptorHandler handler) {
    if (options.extra['skipAuth'] != true) {
      final access = vault.access;
      if (access != null) options.headers['Authorization'] = 'Bearer $access';
    }
    handler.next(options);
  }

  @override
  void onError(DioException err, ErrorInterceptorHandler handler) {
    unawaited(_manejar(err, handler));
  }

  Future<void> _manejar(DioException err, ErrorInterceptorHandler handler) async {
    final options = err.requestOptions;
    final status = err.response?.statusCode;
    if (status != 401 || options.extra['skipRefresh'] == true || options.extra['reintento'] == true) {
      return handler.next(err);
    }
    final refresh = vault.refresh;
    if (refresh == null || refresh.isEmpty) {
      vault.onDead?.call();
      return handler.next(err);
    }
    try {
      await _renovar(refresh);
      options.extra['reintento'] = true;
      options.headers['Authorization'] = 'Bearer ${vault.access}';
      final respuesta = await dio.fetch<dynamic>(options);
      return handler.resolve(respuesta);
    } on ApiException catch (error) {
      if (!error.sinConexion) vault.onDead?.call();
      return handler.next(err);
    } catch (_) {
      return handler.next(err);
    }
  }

  Future<void> _renovar(String refresh) {
    final enCurso = _renovando;
    if (enCurso != null) return enCurso;
    final futuro = _hacer(refresh);
    _renovando = futuro;
    return futuro.whenComplete(() => _renovando = null);
  }

  Future<void> _hacer(String refresh) async {
    try {
      final respuesta = await bare.post<dynamic>('auth/refresh', data: {'refreshToken': refresh});
      final cred = credencialesDesde(respuesta.data);
      vault.adopt(cred);
      await store.writeRefresh(cred.refresh);
    } on DioException catch (error) {
      throw ApiException.de(error);
    }
  }
}
