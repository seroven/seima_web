sealed class AuthState {
  const AuthState();
}

class AuthSignedOut extends AuthState {
  const AuthSignedOut();
}

class AuthLocked extends AuthState {
  const AuthLocked();
}

class AuthSinConexion extends AuthState {
  const AuthSinConexion();
}

class AuthSignedIn extends AuthState {
  const AuthSignedIn({required this.nombre, required this.usuario});

  final String nombre;
  final String usuario;
}
