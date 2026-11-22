const maxVideoGaleriaMs = 60000;
const maxVideoBytes = 50 * 1024 * 1024;

/// null si el archivo cabe. Si dura más de 1 minuto, primero se recorta.
String? rechazoDeVideo({required int bytes, required int duracionMs}) {
  if (duracionMs <= 0) return 'No se pudo leer la duración del video.';
  if (bytes > maxVideoBytes) return 'El video pesa más de 50 MB. Elige uno más corto.';
  return null;
}

bool videoPideRecorte(int duracionMs) => duracionMs > maxVideoGaleriaMs;

bool videoEsperaWifi({required bool soloWifi, required bool hayWifi}) => soloWifi && !hayWifi;

String textoDuracion(int ms) {
  final total = (ms / 1000).round().clamp(0, 36000);
  final minutos = total ~/ 60;
  final segundos = (total % 60).toString().padLeft(2, '0');
  return '$minutos:$segundos';
}
