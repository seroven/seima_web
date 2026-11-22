import 'dart:convert';
import 'dart:io';

import 'video_reglas.dart';

const pulsoVivoMs = 20000;
const claveVideosWifi = 'seima_videos_wifi';
const claveColaVideos = 'seima_cola_videos';
const clavePulsoApp = 'seima_app_pulso';

class PendienteVideo {
  const PendienteVideo({
    required this.id,
    required this.projectId,
    required this.etapa,
    required this.ruta,
    required this.nombre,
    required this.duracionMs,
    required this.estado,
    required this.intentoEnMs,
  });

  final String id;
  final String projectId;
  final String etapa;
  final String ruta;
  final String nombre;
  final int duracionMs;
  final String estado;
  final int intentoEnMs;

  PendienteVideo con({String? estado, int? intentoEnMs}) {
    return PendienteVideo(
      id: id,
      projectId: projectId,
      etapa: etapa,
      ruta: ruta,
      nombre: nombre,
      duracionMs: duracionMs,
      estado: estado ?? this.estado,
      intentoEnMs: intentoEnMs ?? this.intentoEnMs,
    );
  }

  Map<String, dynamic> toJson() => {
    'id': id,
    'projectId': projectId,
    'etapa': etapa,
    'ruta': ruta,
    'nombre': nombre,
    'duracionMs': duracionMs,
    'estado': estado,
    'intentoEnMs': intentoEnMs,
  };

  static PendienteVideo? desde(Object? valor) {
    if (valor is! Map) return null;
    final id = valor['id'];
    final projectId = valor['projectId'];
    final etapa = valor['etapa'];
    final ruta = valor['ruta'];
    final nombre = valor['nombre'];
    final duracion = valor['duracionMs'];
    final estado = valor['estado'];
    final intento = valor['intentoEnMs'];
    if (id is! String || projectId is! String || etapa is! String || ruta is! String || nombre is! String) return null;
    if (duracion is! int || estado is! String || intento is! int) return null;
    return PendienteVideo(
      id: id,
      projectId: projectId,
      etapa: etapa,
      ruta: ruta,
      nombre: nombre,
      duracionMs: duracion,
      estado: estado,
      intentoEnMs: intento,
    );
  }
}

bool appSigueAbierta({required int pulsoMs, required int ahoraMs}) => pulsoMs > 0 && ahoraMs - pulsoMs < pulsoVivoMs;

String textoPendiente(PendienteVideo item, {required bool hayWifi, required bool soloWifi}) {
  if (item.estado == 'fallo') return 'No se pudo';
  if (item.estado == 'subiendo') return 'Subiendo';
  if (videoEsperaWifi(soloWifi: soloWifi, hayWifi: hayWifi)) return 'Esperando Wi-Fi';
  return 'En espera';
}

String? textoProgreso(List<PendienteVideo> items) {
  final vivos = items.where((item) => item.estado != 'listo').toList();
  final subiendo = vivos.where((item) => item.estado == 'subiendo').length;
  if (subiendo == 0) return null;
  return 'Subiendo $subiendo de ${vivos.length}';
}

PendienteVideo? siguientePendiente(
  List<PendienteVideo> cola, {
  required bool hayWifi,
  required bool soloWifi,
  Set<String> ya = const {},
}) {
  if (videoEsperaWifi(soloWifi: soloWifi, hayWifi: hayWifi)) return null;
  for (final item in cola) {
    if (ya.contains(item.id)) continue;
    if (item.estado == 'esperando' || item.estado == 'subiendo') return item;
  }
  return null;
}

List<PendienteVideo> marcarPendiente(List<PendienteVideo> cola, String id, String estado, {int? intentoEnMs}) {
  return [for (final item in cola) if (item.id == id) item.con(estado: estado, intentoEnMs: intentoEnMs) else item];
}

String codificarCola(List<PendienteVideo> cola) => jsonEncode(cola.map((item) => item.toJson()).toList());

List<PendienteVideo> decodificarCola(String? texto) {
  if (texto == null || texto.isEmpty) return const [];
  try {
    final lista = jsonDecode(texto);
    if (lista is! List) return const [];
    return [for (final item in lista) PendienteVideo.desde(item)].whereType<PendienteVideo>().toList();
  } catch (_) {
    return const [];
  }
}

Future<List<PendienteVideo>> drenarCola({
  required List<PendienteVideo> cola,
  required int ahoraMs,
  required bool hayWifi,
  required bool soloWifi,
  required Future<void> Function(PendienteVideo item) subir,
  required Future<void> Function(List<PendienteVideo> cola) guardar,
}) async {
  var actual = cola;
  final ya = <String>{};
  while (true) {
    final item = siguientePendiente(actual, hayWifi: hayWifi, soloWifi: soloWifi, ya: ya);
    if (item == null) break;
    ya.add(item.id);
    actual = marcarPendiente(actual, item.id, 'subiendo', intentoEnMs: ahoraMs);
    await guardar(actual);
    try {
      await subir(item);
      actual = actual.where((pendiente) => pendiente.id != item.id).toList();
    } catch (_) {
      actual = marcarPendiente(actual, item.id, 'fallo');
    }
    await guardar(actual);
  }
  return actual;
}

Future<String> apartarVideo(String origen, Directory carpeta) async {
  await carpeta.create(recursive: true);
  final destino = File('${carpeta.path}${Platform.pathSeparator}${DateTime.now().microsecondsSinceEpoch}.mp4');
  await File(origen).copy(destino.path);
  return destino.path;
}
