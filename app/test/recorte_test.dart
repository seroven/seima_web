import 'package:flutter_test/flutter_test.dart';
import 'package:seima/projects/recorte.dart';
import 'package:seima/projects/video_reglas.dart';

void main() {
  test('el tramo inicial cabe en un minuto', () {
    final corto = ventanaInicial(duracionMs: 20000, topeMs: maxVideoGaleriaMs);
    expect(corto.inicioMs, 0);
    expect(corto.finMs, 20000);

    final largo = ventanaInicial(duracionMs: 90000, topeMs: maxVideoGaleriaMs);
    expect(largo.duracionMs, maxVideoGaleriaMs);
  });

  test('mover una manija no deja pasar el tope', () {
    final total = 90000;
    final inicial = ventanaInicial(duracionMs: total, topeMs: maxVideoGaleriaMs);
    final movido = moverInicio(inicial, 20000, duracionMs: total, topeMs: maxVideoGaleriaMs);
    expect(movido.inicioMs, 20000);
    expect(movido.duracionMs, maxVideoGaleriaMs);

    final alFinal = moverInicio(inicial, 80000, duracionMs: total, topeMs: maxVideoGaleriaMs);
    expect(alFinal.finMs, total);
    expect(alFinal.duracionMs <= maxVideoGaleriaMs, isTrue);
    expect(alFinal.duracionMs >= minTramoMs, isTrue);
  });

  test('el final no se pasa del tope y el tramo corto se desliza', () {
    final inicial = ventanaInicial(duracionMs: 90000, topeMs: maxVideoGaleriaMs);
    final tope = moverFin(inicial, 90000, duracionMs: 90000, topeMs: maxVideoGaleriaMs);
    expect(tope.inicioMs, 0);
    expect(tope.finMs, maxVideoGaleriaMs);

    final corto = moverFin(inicial, 15000, duracionMs: 90000, topeMs: maxVideoGaleriaMs);
    expect(corto.duracionMs, 15000);

    final deslizado = moverInicio(corto, 30000, duracionMs: 90000, topeMs: maxVideoGaleriaMs);
    expect(deslizado.inicioMs, 30000);
    expect(deslizado.duracionMs, 15000);
  });
}