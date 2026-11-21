import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shared_preferences/shared_preferences.dart';

class AjustesLocales extends AsyncNotifier<bool> {
  static const _clave = 'seima_videos_wifi';

  @override
  Future<bool> build() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getBool(_clave) ?? true;
  }

  Future<void> setVideosSoloWifi(bool on) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setBool(_clave, on);
    state = AsyncData(on);
  }
}

/// Videos solo con Wi-Fi. Arranca activado; la subida lo va a usar en la fase 3.
final videosWifiProvider = AsyncNotifierProvider<AjustesLocales, bool>(AjustesLocales.new);
