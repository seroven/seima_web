import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../auth/almacen_sesion.dart';
import '../auth/auth_controller.dart';
import '../auth/biometrics.dart';
import '../theme/seima_colors.dart';
import '../theme/seima_theme.dart';
import '../widgets/seima_button.dart';

class ShellScreen extends ConsumerStatefulWidget {
  const ShellScreen({super.key, required this.shell});

  final StatefulNavigationShell shell;

  @override
  ConsumerState<ShellScreen> createState() => _ShellScreenState();
}

class _ShellScreenState extends ConsumerState<ShellScreen> {
  var _preguntaHecha = false;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) => _preguntarHuella());
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: widget.shell,
      bottomNavigationBar: NavigationBar(
        selectedIndex: widget.shell.currentIndex,
        labelBehavior: NavigationDestinationLabelBehavior.alwaysShow,
        onDestinationSelected: (index) => widget.shell.goBranch(index, initialLocation: index == widget.shell.currentIndex),
        destinations: const [
          NavigationDestination(icon: Icon(Icons.home_outlined), selectedIcon: Icon(Icons.home), label: 'Proyectos'),
          NavigationDestination(
            icon: Icon(Icons.inbox_outlined),
            selectedIcon: Icon(Icons.inbox),
            label: 'Cotizaciones',
          ),
          NavigationDestination(
            icon: Icon(Icons.settings_outlined),
            selectedIcon: Icon(Icons.settings),
            label: 'Ajustes',
          ),
        ],
      ),
    );
  }

  Future<void> _preguntarHuella() async {
    if (_preguntaHecha || !mounted) return;
    _preguntaHecha = true;
    final store = ref.read(sessionStoreProvider);
    if (await store.biometricEnabled() || await store.huellaPreguntada()) return;
    if (!await ref.read(biometricsProvider).available) return;
    if (!mounted) return;
    final si = await showDialog<bool>(
      context: context,
      builder: (context) => const _PreguntaHuella(),
    );
    if (si == true) {
      await ref.read(authProvider.notifier).aceptarHuella();
    } else {
      await ref.read(authProvider.notifier).rechazarHuella();
    }
  }
}

class _PreguntaHuella extends StatelessWidget {
  const _PreguntaHuella();

  @override
  Widget build(BuildContext context) {
    return Dialog(
      backgroundColor: SeimaColors.paper,
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Text('¿Usas tu huella la próxima vez?', style: archivo(24, 800, width: 118, height: 1.1)),
            const SizedBox(height: 12),
            Text('Así entras sin escribir la contraseña.', style: archivo(18, 500)),
            const SizedBox(height: 24),
            SeimaButton(label: 'Sí, usar huella', onPressed: () => Navigator.pop(context, true)),
            TextButton(
              onPressed: () => Navigator.pop(context, false),
              child: Text('Ahora no', style: archivo(18, 650)),
            ),
          ],
        ),
      ),
    );
  }
}
