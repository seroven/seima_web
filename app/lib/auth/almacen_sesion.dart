import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:shared_preferences/shared_preferences.dart';

import 'session_store.dart';

class AlmacenSesion implements SessionStore {
  AlmacenSesion({FlutterSecureStorage? secure}) : _secure = secure ?? const FlutterSecureStorage();

  final FlutterSecureStorage _secure;
  static const _refresh = 'refresh_token';
  static const _huella = 'seima_huella';
  static const _preguntada = 'seima_huella_preguntada';

  @override
  Future<String?> readRefresh() => _secure.read(key: _refresh);

  @override
  Future<void> writeRefresh(String token) => _secure.write(key: _refresh, value: token);

  @override
  Future<void> clearRefresh() => _secure.delete(key: _refresh);

  @override
  Future<bool> biometricEnabled() async => (await SharedPreferences.getInstance()).getBool(_huella) ?? false;

  @override
  Future<void> setBiometric(bool on) async {
    await (await SharedPreferences.getInstance()).setBool(_huella, on);
  }

  @override
  Future<bool> huellaPreguntada() async => (await SharedPreferences.getInstance()).getBool(_preguntada) ?? false;

  @override
  Future<void> marcarHuellaPreguntada() async {
    await (await SharedPreferences.getInstance()).setBool(_preguntada, true);
  }
}

final sessionStoreProvider = Provider<SessionStore>((ref) => AlmacenSesion());
