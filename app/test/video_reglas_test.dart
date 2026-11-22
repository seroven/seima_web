import 'package:flutter_test/flutter_test.dart';
import 'package:seima/projects/video_reglas.dart';

void main() {
  test('rechaza un video ilegible o pesado', () {
    expect(rechazoDeVideo(bytes: 1000, duracionMs: 0), 'No se pudo leer la duración del video.');
    expect(rechazoDeVideo(bytes: maxVideoBytes + 1, duracionMs: 10000), contains('50 MB'));
    expect(rechazoDeVideo(bytes: 1000, duracionMs: maxVideoGaleriaMs), isNull);
    expect(videoPideRecorte(maxVideoGaleriaMs), isFalse);
    expect(videoPideRecorte(maxVideoGaleriaMs + 1), isTrue);
  });

  test('el video espera Wi-Fi solo si el ajuste está activo', () {
    expect(videoEsperaWifi(soloWifi: true, hayWifi: false), isTrue);
    expect(videoEsperaWifi(soloWifi: true, hayWifi: true), isFalse);
    expect(videoEsperaWifi(soloWifi: false, hayWifi: false), isFalse);
  });

  test('escribe la duración en minutos y segundos', () {
    expect(textoDuracion(12500), '0:13');
    expect(textoDuracion(60000), '1:00');
  });
}
