import 'dart:async';

import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../api/api_client.dart';
import '../api/api_error.dart';
import '../config/app_env.dart';
import '../devices/push_service.dart';
import 'almacen_sesion.dart';
import 'auth_api.dart';
import 'auth_state.dart';
import 'biometrics.dart';
import 'token_vault.dart';

final biometriaDisponibleProvider = FutureProvider<bool>((ref) => ref.read(biometricsProvider).available);

final huellaActivaProvider = FutureProvider<bool>((ref) => ref.read(sessionStoreProvider).biometricEnabled());

final authProvider = AsyncNotifierProvider<AuthController, AuthState>(AuthController.new);

class AvisoEntrada extends Notifier<String?> {
  @override
  String? build() => null;

  void mostrar(String texto) => state = texto;

  void limpiar() => state = null;
}

final avisoEntradaProvider = NotifierProvider<AvisoEntrada, String?>(AvisoEntrada.new);

class AvisoPush extends Notifier<String> {
  @override
  String build() => '';

  void mostrar(String texto) => state = texto;
}

final avisoPushProvider = NotifierProvider<AvisoPush, String>(AvisoPush.new);

class AuthController extends AsyncNotifier<AuthState> {
  @override
  Future<AuthState> build() async {
    final vault = ref.read(tokenVaultProvider);
    vault.onDead = () {
      unawaited(sesionVencida());
    };
    final store = ref.read(sessionStoreProvider);
    final refresh = await store.readRefresh();
    if (refresh == null || refresh.isEmpty) return const AuthSignedOut();
    if (await store.biometricEnabled()) return const AuthLocked();
    return _abrir(refresh);
  }

  Future<String?> entrar({required String usuario, required String password}) async {
    if (!AppEnv.tieneApi) return 'Falta la dirección de la API. Revisa app/.env.';
    try {
      final cred = await ref.read(authApiProvider).entrar(usuario: usuario, password: password);
      state = AsyncData(await _adoptar(cred));
      return null;
    } on ApiException catch (error) {
      return error.message;
    }
  }

  Future<String?> desbloquear() async {
    final ok = await ref.read(biometricsProvider).unlock();
    if (!ok) return 'No se pudo confirmar tu huella';
    final refresh = await ref.read(sessionStoreProvider).readRefresh();
    if (refresh == null || refresh.isEmpty) {
      state = const AsyncData(AuthSignedOut());
      return 'Entra con tu usuario';
    }
    final siguiente = await _abrir(refresh);
    state = AsyncData(siguiente);
    return _mensaje(siguiente);
  }

  Future<String?> usarHuella(bool on) async {
    if (on) {
      final ok = await ref.read(biometricsProvider).unlock();
      if (!ok) return 'No se pudo usar la huella';
    }
    await ref.read(sessionStoreProvider).setBiometric(on);
    ref.invalidate(huellaActivaProvider);
    return null;
  }

  Future<void> aceptarHuella() async {
    final store = ref.read(sessionStoreProvider);
    await store.setBiometric(true);
    await store.marcarHuellaPreguntada();
    ref.invalidate(huellaActivaProvider);
  }

  Future<void> rechazarHuella() => ref.read(sessionStoreProvider).marcarHuellaPreguntada();

  Future<String?> cambiarContrasena({required String actual, required String nueva}) async {
    try {
      await ref.read(authApiProvider).cambiarContrasena(actual: actual, nueva: nueva);
      await _cerrarLocal();
      ref.read(avisoEntradaProvider.notifier).mostrar('Contraseña actualizada. Entra de nuevo.');
      state = const AsyncData(AuthSignedOut());
      return null;
    } on ApiException catch (error) {
      return error.message;
    }
  }

  Future<void> salir() async {
    final refresh = ref.read(tokenVaultProvider).refresh;
    final api = ref.read(authApiProvider);
    await ref.read(pushProvider).olvidar(api);
    if (refresh != null && refresh.isNotEmpty) {
      try {
        await api.salir(refresh);
      } on ApiException {
        // La sesión local se cierra igual.
      }
    }
    await _cerrarLocal();
    state = const AsyncData(AuthSignedOut());
  }

  Future<void> sesionVencida() async {
    if (state.value is AuthSignedOut) return;
    await _cerrarLocal();
    ref.read(avisoEntradaProvider.notifier).mostrar('La sesión venció. Entra de nuevo.');
    state = const AsyncData(AuthSignedOut());
  }

  Future<AuthState> _abrir(String refresh) async {
    try {
      final cred = await ref.read(authApiProvider).renovar(refresh);
      return _adoptar(cred);
    } on ApiException catch (error) {
      if (error.sinConexion) return const AuthSinConexion();
      await _cerrarLocal();
      return const AuthSignedOut();
    }
  }

  Future<AuthState> _adoptar(Credenciales cred) async {
    ref.read(tokenVaultProvider).adopt(cred);
    await ref.read(sessionStoreProvider).writeRefresh(cred.refresh);
    unawaited(_registrarPush());
    return AuthSignedIn(nombre: cred.nombre, usuario: cred.usuario);
  }

  Future<void> _registrarPush() async {
    try {
      final texto = await ref.read(pushProvider).registrar(ref.read(authApiProvider));
      if (!ref.mounted) return;
      ref.read(avisoPushProvider.notifier).mostrar(texto);
    } catch (_) {
      if (!ref.mounted) return;
      ref.read(avisoPushProvider.notifier).mostrar('No se pudo registrar este celular para los avisos.');
    }
  }

  Future<void> _cerrarLocal() async {
    await ref.read(sessionStoreProvider).clearRefresh();
    ref.read(tokenVaultProvider).clear();
  }

  String? _mensaje(AuthState estado) {
    if (estado is AuthSignedOut) return 'La sesión venció. Entra de nuevo.';
    if (estado is AuthSinConexion) return 'No hay conexión. Revisa el Wi-Fi e inténtalo de nuevo.';
    return null;
  }
}
