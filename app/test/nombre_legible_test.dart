import 'package:flutter_test/flutter_test.dart';
import 'package:seima/quotes/cotizacion.dart';

void main() {
  test('pasa un nombre en mayúsculas a mayúscula inicial', () {
    expect(nombreLegible('RODRIGUEZ VENTURA SEBASTIAN'), 'Rodriguez Ventura Sebastian');
    expect(nombreLegible('  MARÍA   ÁLVAREZ '), 'María Álvarez');
  });

  test('respeta lo que ya trae minúsculas y no falla con vacíos', () {
    expect(nombreLegible('PRUEBA Claude (borrar)'), 'PRUEBA Claude (borrar)');
    expect(nombreLegible('Luis Rodríguez'), 'Luis Rodríguez');
    expect(nombreLegible('   '), '');
  });
}
