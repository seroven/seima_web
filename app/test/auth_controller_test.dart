import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:seima/api/api_client.dart';
import 'package:seima/api/api_error.dart';
import 'package:seima/auth/almacen_sesion.dart';
import 'package:seima/auth/auth_api.dart';
import 'package:seima/auth/auth_controller.dart';
import 'package:seima/auth/auth_state.dart';
import 'package:seima/auth/biometrics.dart';
import 'package:seima/auth/session_store.dart';
import 'package:seima/devices/push_service.dart';

void main() {
  test('al restaurar la sesión guarda el refresh nuevo', () async {
    final memoria = MemoriaSesion()..refresh = 'viejo';
    final api = ApiFalsa();
    final container = ProviderContainer(
      overrides: [
        sessionStoreProvider.overrideWithValue(memoria),
        authApiProvider.overrideWithValue(api),
        biometricsProvider.overrideWithValue(BiometriaFalsa()),
        pushProvider.overrideWithValue(PushFalso()),
      ],
    );
    addTearDown(container.dispose);

    final estado = await container.read(authProvider.future);

    expect(estado, isA<AuthSignedIn>());
    expect(memoria.refresh, 'nuevo');
    expect(api.renovaciones, 1);
  });

  test('sin conexión no borra el refresh guardado', () async {
    final memoria = MemoriaSesion()..refresh = 'viejo';
    final api = ApiFalsa()..fallaRed = true;
    final container = ProviderContainer(
      overrides: [
        sessionStoreProvider.overrideWithValue(memoria),
        authApiProvider.overrideWithValue(api),
        biometricsProvider.overrideWithValue(BiometriaFalsa()),
        pushProvider.overrideWithValue(PushFalso()),
      ],
    );
    addTearDown(container.dispose);

    final estado = await container.read(authProvider.future);

    expect(estado, isA<AuthSinConexion>());
    expect(memoria.refresh, 'viejo');
  });

  test('una sesión inválida obliga a entrar de nuevo', () async {
    final memoria = MemoriaSesion()..refresh = 'viejo';
    final api = ApiFalsa()..invalida = true;
    final container = ProviderContainer(
      overrides: [
        sessionStoreProvider.overrideWithValue(memoria),
        authApiProvider.overrideWithValue(api),
        biometricsProvider.overrideWithValue(BiometriaFalsa()),
        pushProvider.overrideWithValue(PushFalso()),
      ],
    );
    addTearDown(container.dispose);

    final estado = await container.read(authProvider.future);

    expect(estado, isA<AuthSignedOut>());
    expect(memoria.refresh, isNull);
  });

  test('con la huella activada no renueva hasta desbloquear', () async {
    final memoria = MemoriaSesion()
      ..refresh = 'viejo'
      ..huella = true;
    final api = ApiFalsa();
    final container = ProviderContainer(
      overrides: [
        sessionStoreProvider.overrideWithValue(memoria),
        authApiProvider.overrideWithValue(api),
        biometricsProvider.overrideWithValue(BiometriaFalsa()),
        pushProvider.overrideWithValue(PushFalso()),
      ],
    );
    addTearDown(container.dispose);

    final estado = await container.read(authProvider.future);

    expect(estado, isA<AuthLocked>());
    expect(api.renovaciones, 0);
    expect(memoria.refresh, 'viejo');
  });
}

class MemoriaSesion implements SessionStore {
  String? refresh;
  bool huella = false;
  bool preguntada = false;

  @override
  Future<String?> readRefresh() async => refresh;

  @override
  Future<void> writeRefresh(String token) async => refresh = token;

  @override
  Future<void> clearRefresh() async => refresh = null;

  @override
  Future<bool> biometricEnabled() async => huella;

  @override
  Future<void> setBiometric(bool on) async => huella = on;

  @override
  Future<bool> huellaPreguntada() async => preguntada;

  @override
  Future<void> marcarHuellaPreguntada() async => preguntada = true;
}

class ApiFalsa implements AuthApi {
  int renovaciones = 0;
  bool fallaRed = false;
  bool invalida = false;

  @override
  Future<Credenciales> renovar(String refreshToken) async {
    renovaciones++;
    if (fallaRed) {
      throw ApiException('No hay conexión. Revisa el Wi-Fi e inténtalo de nuevo.', sinConexion: true);
    }
    if (invalida) throw ApiException('La sesión ya no es válida. Entra de nuevo.');
    return const Credenciales(access: 'acceso', refresh: 'nuevo', nombre: 'Luis', usuario: 'luis');
  }

  @override
  Future<Credenciales> entrar({required String usuario, required String password}) async {
    throw UnimplementedError();
  }

  @override
  Future<void> salir(String refreshToken) async {}

  @override
  Future<void> cambiarContrasena({required String actual, required String nueva}) async {}

  @override
  Future<void> registrarDispositivo(String token) async {}

  @override
  Future<void> olvidarDispositivo(String token) async {}
}

class BiometriaFalsa implements Biometrics {
  @override
  Future<bool> get available async => false;

  @override
  Future<bool> unlock() async => true;
}

class PushFalso implements PushService {
  @override
  Future<String> registrar(AuthApi api) async => 'ok';

  @override
  Future<void> olvidar(AuthApi api) async {}

  @override
  Future<void> escucharAvisos({required void Function(String id) alAbrir, void Function()? alLlegar}) async {}
}
