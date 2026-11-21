import '../api/api_error.dart';

class Credenciales {
  const Credenciales({
    required this.access,
    required this.refresh,
    required this.nombre,
    required this.usuario,
  });

  final String access;
  final String refresh;
  final String nombre;
  final String usuario;
}

Credenciales credencialesDesde(Object? body) {
  if (body is! Map || body['data'] is! Map) {
    throw ApiException('La respuesta del servidor no se entiende.');
  }
  final data = body['data'] as Map;
  final token = data['token'];
  final refresh = data['refreshToken'];
  final usuario = data['usuario'];
  if (token is! String || refresh is! String || usuario is! Map) {
    throw ApiException('La respuesta del servidor no se entiende.');
  }
  final nombre = usuario['nombre'];
  final user = usuario['usuario'];
  return Credenciales(
    access: token,
    refresh: refresh,
    nombre: nombre is String && nombre.trim().isNotEmpty ? nombre.trim() : (user is String ? user : ''),
    usuario: user is String ? user : '',
  );
}

/// Lo que la app le pide a la API para entrar y para el celular.
abstract class AuthApi {
  Future<Credenciales> entrar({required String usuario, required String password});
  Future<Credenciales> renovar(String refreshToken);
  Future<void> salir(String refreshToken);
  Future<void> cambiarContrasena({required String actual, required String nueva});
  Future<void> registrarDispositivo(String token);
  Future<void> olvidarDispositivo(String token);
}
