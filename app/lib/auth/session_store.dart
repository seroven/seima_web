/// Dónde queda la sesión. El refresh va al almacén seguro; la huella, no.
abstract class SessionStore {
  Future<String?> readRefresh();
  Future<void> writeRefresh(String token);
  Future<void> clearRefresh();
  Future<bool> biometricEnabled();
  Future<void> setBiometric(bool on);
  Future<bool> huellaPreguntada();
  Future<void> marcarHuellaPreguntada();
}
