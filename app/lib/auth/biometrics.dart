import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:local_auth/local_auth.dart';
import 'package:local_auth_android/local_auth_android.dart';

abstract class Biometrics {
  Future<bool> get available;
  Future<bool> unlock();
}

class HuellaLocal implements Biometrics {
  HuellaLocal() : _auth = LocalAuthentication();

  final LocalAuthentication _auth;

  @override
  Future<bool> get available async {
    try {
      return await _auth.canCheckBiometrics;
    } on PlatformException {
      return false;
    }
  }

  @override
  Future<bool> unlock() async {
    try {
      return await _auth.authenticate(
        localizedReason: 'Confirma que eres tú para entrar a SEIMA',
        authMessages: const [
          AndroidAuthMessages(signInTitle: 'Entra a SEIMA', signInHint: 'Usa tu huella', cancelButton: 'Cancelar'),
        ],
        biometricOnly: true,
        persistAcrossBackgrounding: true,
      );
    } catch (_) {
      return false;
    }
  }
}

final biometricsProvider = Provider<Biometrics>((ref) => HuellaLocal());
