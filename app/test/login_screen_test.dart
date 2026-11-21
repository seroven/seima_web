import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:seima/auth/auth_controller.dart';
import 'package:seima/auth/auth_state.dart';
import 'package:seima/screens/login_screen.dart';
import 'package:seima/theme/seima_theme.dart';

void main() {
  testWidgets('no envía el formulario vacío', (tester) async {
    final auth = AuthQuieto(const AuthSignedOut());
    await tester.pumpWidget(_app(auth));
    await tester.pumpAndSettle();

    await tester.tap(find.text('Entrar'));
    await tester.pump();

    expect(find.text('Escribe tu usuario'), findsOneWidget);
    expect(auth.entradas, 0);
  });

  testWidgets('con usuario y contraseña llama a entrar', (tester) async {
    final auth = AuthQuieto(const AuthSignedOut());
    await tester.pumpWidget(_app(auth));
    await tester.pumpAndSettle();

    await tester.enterText(find.byType(TextField).at(0), 'luis');
    await tester.enterText(find.byType(TextField).at(1), '123456');
    await tester.tap(find.text('Entrar'));
    await tester.pump();

    expect(auth.entradas, 1);
    expect(auth.ultimoUsuario, 'luis');
  });

  testWidgets('con la sesión bloqueada ofrece la huella', (tester) async {
    final auth = AuthQuieto(const AuthLocked());
    await tester.pumpWidget(_app(auth));
    await tester.pumpAndSettle();

    expect(find.text('Usa tu huella'), findsOneWidget);
    expect(find.text('Entrar con contraseña'), findsOneWidget);
    expect(auth.desbloqueos, 0);
  });
}

Widget _app(AuthQuieto auth) {
  return ProviderScope(
    overrides: [authProvider.overrideWith(() => auth)],
    child: MaterialApp(
      theme: seimaTheme(),
      home: const LoginScreen(),
    ),
  );
}

class AuthQuieto extends AuthController {
  AuthQuieto(this.estado);

  final AuthState estado;
  int entradas = 0;
  int desbloqueos = 0;
  String? ultimoUsuario;

  @override
  Future<AuthState> build() async => estado;

  @override
  Future<String?> entrar({required String usuario, required String password}) async {
    entradas++;
    ultimoUsuario = usuario;
    return null;
  }

  @override
  Future<String?> desbloquear() async {
    desbloqueos++;
    return null;
  }
}
