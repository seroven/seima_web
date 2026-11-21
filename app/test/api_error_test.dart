import 'package:flutter_test/flutter_test.dart';
import 'package:seima/api/api_error.dart';

void main() {
  test('lee el mensaje de error de la API', () {
    expect(
      mensajeDesde({
        'error': {'code': 'UNAUTHORIZED', 'message': 'Usuario o contraseña incorrectos'},
      }),
      'Usuario o contraseña incorrectos',
    );
  });

  test('si la respuesta no trae mensaje, usa una frase genérica', () {
    expect(mensajeDesde(null), 'Algo salió mal. Inténtalo de nuevo.');
    expect(mensajeDesde({'ok': true}), 'Algo salió mal. Inténtalo de nuevo.');
  });
}
