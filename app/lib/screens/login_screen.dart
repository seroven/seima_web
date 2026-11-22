import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../auth/auth_controller.dart';
import '../auth/auth_state.dart';
import '../theme/seima_colors.dart';
import '../theme/seima_theme.dart';
import '../widgets/capas_marca.dart';
import '../widgets/seima_button.dart';

class LoginScreen extends ConsumerStatefulWidget {
  const LoginScreen({super.key});

  @override
  ConsumerState<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends ConsumerState<LoginScreen> {
  final _usuario = TextEditingController();
  final _password = TextEditingController();
  var _verPassword = false;
  var _enviando = false;
  var _conContrasena = false;
  String? _error;

  @override
  void dispose() {
    _usuario.dispose();
    _password.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final auth = ref.watch(authProvider);
    final aviso = ref.watch(avisoEntradaProvider);
    final estado = auth.value;
    final bloqueado = estado is AuthLocked && !_conContrasena;
    final sinRed = estado is AuthSinConexion;

    return Theme(
      data: seimaThemeOscuro(),
      child: AnnotatedRegion<SystemUiOverlayStyle>(
        value: SystemUiOverlayStyle.light,
        child: Scaffold(
          body: SafeArea(
            child: ListView(
              padding: const EdgeInsets.fromLTRB(28, 40, 28, 32),
              children: [
                const Align(alignment: Alignment.centerLeft, child: CapasMarca(ancho: 150)),
                const SizedBox(height: 28),
                Text('SEIMA', style: archivo(56, 850, width: 118, height: 1, color: Colors.white)),
                const SizedBox(height: 14),
                Text(
                  'Construimos tu espacio, capa por capa.',
                  style: archivo(18, 500, color: SeimaColors.onInkMuted),
                ),
                const SizedBox(height: 40),
                Text(
                  bloqueado ? 'Confirma que eres tú.' : 'Entra para ver tus obras y cotizaciones.',
                  style: archivo(20, 700, height: 1.25, color: Colors.white),
                ),
                const SizedBox(height: 20),
                ..._formulario(aviso, estado, bloqueado, sinRed),
              ],
            ),
          ),
        ),
      ),
    );
  }

  List<Widget> _formulario(String? aviso, AuthState? estado, bool bloqueado, bool sinRed) {
    return [
      Aviso(aviso ?? _error, sobreOscuro: true),
      if (sinRed)
        SeimaButton(label: 'Reintentar', onPressed: () => ref.invalidate(authProvider))
      else if (bloqueado) ...[
        SeimaButton(label: 'Usa tu huella', busy: _enviando, onPressed: _desbloquear),
        const SizedBox(height: 12),
        TextButton(
          onPressed: () => setState(() => _conContrasena = true),
          child: Text('Entrar con contraseña', style: archivo(18, 650, color: Colors.white)),
        ),
      ] else ...[
        TextField(
          controller: _usuario,
          autofillHints: const [AutofillHints.username],
          textInputAction: TextInputAction.next,
          autocorrect: false,
          enableSuggestions: false,
          style: archivo(18, 550, color: Colors.white),
          decoration: const InputDecoration(hintText: 'Usuario', prefixIcon: Icon(Icons.person_outline)),
        ),
        const SizedBox(height: 12),
        TextField(
          controller: _password,
          autofillHints: const [AutofillHints.password],
          obscureText: !_verPassword,
          textInputAction: TextInputAction.done,
          onSubmitted: (_) => _entrar(),
          style: archivo(18, 550, color: Colors.white),
          decoration: InputDecoration(
            hintText: 'Contraseña',
            prefixIcon: const Icon(Icons.lock_outline),
            suffixIcon: IconButton(
              tooltip: _verPassword ? 'Ocultar contraseña' : 'Mostrar contraseña',
              onPressed: () => setState(() => _verPassword = !_verPassword),
              icon: Icon(_verPassword ? Icons.visibility_off : Icons.visibility),
            ),
          ),
        ),
        const SizedBox(height: 24),
        SeimaButton(label: 'Entrar', busy: _enviando, onPressed: _entrar),
        if (estado is AuthLocked)
          TextButton(
            onPressed: () => setState(() => _conContrasena = false),
            child: Text('Usar huella', style: archivo(18, 650, color: Colors.white)),
          ),
      ],
    ];
  }

  Future<void> _entrar() async {
    final usuario = _usuario.text.trim();
    final password = _password.text;
    String? error;
    if (usuario.isEmpty) {
      error = 'Escribe tu usuario';
    } else if (usuario.length < 3) {
      error = 'El usuario es muy corto';
    } else if (password.isEmpty) {
      error = 'Escribe tu contraseña';
    }
    if (error != null) {
      setState(() => _error = error);
      return;
    }
    setState(() {
      _enviando = true;
      _error = null;
    });
    ref.read(avisoEntradaProvider.notifier).limpiar();
    final mensaje = await ref.read(authProvider.notifier).entrar(usuario: usuario, password: password);
    if (!mounted) return;
    setState(() {
      _enviando = false;
      _error = mensaje;
    });
  }

  Future<void> _desbloquear() async {
    setState(() {
      _enviando = true;
      _error = null;
    });
    final mensaje = await ref.read(authProvider.notifier).desbloquear();
    if (!mounted) return;
    setState(() {
      _enviando = false;
      _error = mensaje;
    });
  }
}
