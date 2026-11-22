import 'package:flutter/services.dart';

const canalVideo = MethodChannel('pe.seima.app/video');

class TramoElegido {
  const TramoElegido({required this.ruta, required this.duracionMs});

  final String ruta;
  final int duracionMs;
}

/// Recorta y comprime en el celular. Devuelve null si Android no pudo hacerlo.
Future<TramoElegido?> recortarEnElCelular({
  required String ruta,
  required int inicioMs,
  required int finMs,
  MethodChannel? canal,
}) async {
  try {
    final mapa = await (canal ?? canalVideo).invokeMapMethod<String, dynamic>('recortar', {
      'ruta': ruta,
      'inicioMs': inicioMs,
      'finMs': finMs,
    });
    final salida = mapa?['ruta'];
    final duracion = mapa?['duracionMs'];
    if (salida is! String || salida.isEmpty || duracion is! int || duracion <= 0) return null;
    return TramoElegido(ruta: salida, duracionMs: duracion);
  } on PlatformException {
    return null;
  }
}
