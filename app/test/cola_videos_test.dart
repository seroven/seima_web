import 'dart:io';

import 'package:flutter_test/flutter_test.dart';
import 'package:seima/projects/cola_videos.dart';

PendienteVideo _item(String id, String estado) {
  return PendienteVideo(
    id: id,
    projectId: 'p',
    etapa: 'antes',
    ruta: '/tmp/$id.mp4',
    nombre: 'video.mp4',
    duracionMs: 1000,
    estado: estado,
    intentoEnMs: 0,
  );
}

void main() {
  test('sin Wi-Fi no elige un video y lo dice', () {
    final cola = [_item('a', 'esperando')];
    expect(siguientePendiente(cola, hayWifi: false, soloWifi: true), isNull);
    expect(textoPendiente(cola.first, hayWifi: false, soloWifi: true), 'Esperando Wi-Fi');
    expect(siguientePendiente(cola, hayWifi: false, soloWifi: false)?.id, 'a');
  });

  test('un fallo espera a Reintentar y un corte se retoma una vez', () async {
    final subidos = <String>[];
    final cola = await drenarCola(
      cola: [_item('a', 'subiendo'), _item('b', 'fallo')],
      ahoraMs: 0,
      hayWifi: true,
      soloWifi: true,
      guardar: (_) async {},
      subir: (item) async => subidos.add(item.id),
    );
    expect(subidos, ['a']);
    expect(cola.single.id, 'b');
    expect(textoProgreso([_item('a', 'subiendo'), _item('b', 'esperando')]), 'Subiendo 1 de 2');
  });

  test('si la subida falla, el video queda para reintentar', () async {
    final cola = await drenarCola(
      cola: [_item('a', 'esperando')],
      ahoraMs: 0,
      hayWifi: true,
      soloWifi: false,
      guardar: (_) async {},
      subir: (_) async => throw Exception('red'),
    );
    expect(cola.single.estado, 'fallo');
    expect(textoPendiente(cola.single, hayWifi: true, soloWifi: false), 'No se pudo');
  });

  test('la cola se guarda y se lee', () {
    final texto = codificarCola([_item('a', 'esperando')]);
    final leida = decodificarCola(texto);
    expect(leida.single.id, 'a');
    expect(decodificarCola('basura'), isEmpty);
  });

  test('el pulso dice si la app sigue abierta', () {
    expect(appSigueAbierta(pulsoMs: 1000, ahoraMs: 5000), isTrue);
    expect(appSigueAbierta(pulsoMs: 1000, ahoraMs: 30000), isFalse);
    expect(appSigueAbierta(pulsoMs: 0, ahoraMs: 1000), isFalse);
  });

  test('aparta una copia del video', () async {
    final carpeta = await Directory.systemTemp.createTemp('seima-cola');
    final origen = File('${carpeta.path}${Platform.pathSeparator}origen.mp4');
    await origen.writeAsString('video');
    final copia = await apartarVideo(origen.path, Directory('${carpeta.path}${Platform.pathSeparator}videos'));
    expect(await File(copia).readAsString(), 'video');
    expect(copia.contains('videos'), isTrue);
    await carpeta.delete(recursive: true);
  });
}