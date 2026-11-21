import 'proyecto.dart';

/// En la app: un par horizontal se ve con deslizador; uno vertical, lado a lado.
String modoVista(int? ancho, int? alto) => ladoDe(ancho, alto) == 'horizontal' ? 'deslizador' : 'lado';

double proporcionDe(int? ancho, int? alto) {
  if (ancho == null || alto == null || ancho <= 0 || alto <= 0) return 16 / 9;
  final ratio = ancho / alto;
  if (ratio < 0.7) return 0.7;
  if (ratio > 1.9) return 1.9;
  return ratio;
}

String textoParaCompartir(String titulo) {
  final nombre = titulo.trim().isEmpty ? 'una obra' : titulo.trim();
  return 'Te comparto esta obra de SEIMA: $nombre.';
}

Uri enlaceWhatsapp(String texto) => Uri.https('wa.me', '/', {'text': texto});
