import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'auth_api.dart';

/// El access vive en memoria. El refresh también está aquí para que el interceptor
/// lo rote sin preguntarle a la pantalla.
class TokenVault {
  String? access;
  String? refresh;
  void Function()? onDead;

  void adopt(Credenciales cred) {
    access = cred.access;
    refresh = cred.refresh;
  }

  void clear() {
    access = null;
    refresh = null;
  }
}

final tokenVaultProvider = Provider<TokenVault>((ref) => TokenVault());
