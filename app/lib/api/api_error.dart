import 'package:dio/dio.dart';

/// Error que ya se puede mostrar en pantalla.
class ApiException implements Exception {
  ApiException(this.message, {this.sinConexion = false});

  factory ApiException.de(DioException error) {
    final tipo = error.type;
    final sinRed =
        tipo == DioExceptionType.connectionError ||
        tipo == DioExceptionType.connectionTimeout ||
        tipo == DioExceptionType.receiveTimeout ||
        tipo == DioExceptionType.sendTimeout;
    if (sinRed) {
      return ApiException('No hay conexión. Revisa el Wi-Fi e inténtalo de nuevo.', sinConexion: true);
    }
    return ApiException(mensajeDesde(error.response?.data));
  }

  final String message;
  final bool sinConexion;

  @override
  String toString() => message;
}

/// Lee `{ error: { message, details } }`. Si hay un motivo concreto de validación («El nombre es muy corto»), lo usa;
/// si no, usa el mensaje, y si tampoco está, devuelve una frase genérica.
String mensajeDesde(Object? data) {
  if (data is Map) {
    final error = data['error'];
    if (error is Map) {
      final detalles = error['details'];
      if (detalles is List && detalles.isNotEmpty) {
        final primero = detalles.first;
        if (primero is Map) {
          final motivo = primero['mensaje'];
          if (motivo is String && motivo.trim().isNotEmpty) return motivo.trim();
        }
      }
      final message = error['message'];
      if (message is String && message.trim().isNotEmpty) return message.trim();
    }
  }
  return 'Algo salió mal. Inténtalo de nuevo.';
}
