import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../auth/auth_controller.dart';
import '../theme/seima_theme.dart';
import '../widgets/seima_button.dart';

class ContrasenaScreen extends ConsumerStatefulWidget {
  const ContrasenaScreen({super.key});

  @override
  ConsumerState<ContrasenaScreen> createState() => _ContrasenaScreenState();
}

class _ContrasenaScreenState extends ConsumerState<ContrasenaScreen> {
  final _actual = TextEditingController();
  final _nueva = TextEditingController();
  final _repite = TextEditingController();
  var _enviando = false;
  String? _error;

  @override
  void dispose() {
    _actual.dispose();
    _nueva.dispose();
    _repite.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Contraseña')),
      body: ListView(
        padding: const EdgeInsets.all(24),
        children: [
          Text('Elige una contraseña distinta.', style: archivo(18, 500)),
          const SizedBox(height: 24),
          Aviso(_error),
          TextField(
            controller: _actual,
            obscureText: true,
            style: archivo(18, 550),
            decoration: const InputDecoration(hintText: 'Contraseña actual'),
          ),
          const SizedBox(height: 12),
          TextField(
            controller: _nueva,
            obscureText: true,
            style: archivo(18, 550),
            decoration: const InputDecoration(hintText: 'Contraseña nueva'),
          ),
          const SizedBox(height: 12),
          TextField(
            controller: _repite,
            obscureText: true,
            style: archivo(18, 550),
            decoration: const InputDecoration(hintText: 'Repite la contraseña nueva'),
          ),
          const SizedBox(height: 20),
          SeimaButton(label: 'Guardar', busy: _enviando, onPressed: _guardar),
        ],
      ),
    );
  }

  Future<void> _guardar() async {
    final actual = _actual.text;
    final nueva = _nueva.text;
    String? error;
    if (actual.isEmpty) {
      error = 'Escribe tu contraseña actual';
    } else if (nueva.length < 6) {
      error = 'Usa al menos 6 caracteres';
    } else if (nueva == actual) {
      error = 'Elige una contraseña distinta';
    } else if (_repite.text != nueva) {
      error = 'La repetición no coincide';
    }
    if (error != null) {
      setState(() => _error = error);
      return;
    }
    setState(() {
      _enviando = true;
      _error = null;
    });
    final mensaje = await ref.read(authProvider.notifier).cambiarContrasena(actual: actual, nueva: nueva);
    if (!mounted) return;
    setState(() {
      _enviando = false;
      _error = mensaje;
    });
  }
}
