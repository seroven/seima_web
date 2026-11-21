import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../auth/auth_controller.dart';
import '../auth/auth_state.dart';
import '../settings/ajustes_locales.dart';
import '../theme/seima_colors.dart';
import '../theme/seima_theme.dart';
import '../widgets/seima_button.dart';

class AjustesScreen extends ConsumerWidget {
  const AjustesScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final auth = ref.watch(authProvider).value;
    final nombre = auth is AuthSignedIn ? auth.nombre : '';
    final huella = ref.watch(huellaActivaProvider);
    final disponible = ref.watch(biometriaDisponibleProvider);
    final wifi = ref.watch(videosWifiProvider);
    final aviso = ref.watch(avisoPushProvider);
    final hayHuella = disponible.value ?? false;

    return Scaffold(
      appBar: AppBar(title: const Text('Ajustes')),
      body: ListView(
        padding: const EdgeInsets.fromLTRB(8, 8, 8, 32),
        children: [
          if (nombre.isNotEmpty)
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 8, 16, 16),
              child: Text(nombre, style: archivo(28, 800, width: 118, height: 1.1)),
            ),
          if (hayHuella)
            SwitchListTile(
              contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
              title: Text('Huella', style: archivo(18, 650)),
              subtitle: Text('Entra sin escribir la contraseña', style: archivo(16, 500, color: SeimaColors.muted)),
              value: huella.value ?? false,
              activeTrackColor: SeimaColors.red,
              onChanged: huella.isLoading
                  ? null
                  : (on) async {
                      final mensaje = await ref.read(authProvider.notifier).usarHuella(on);
                      if (mensaje != null && context.mounted) {
                        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(mensaje)));
                      }
                    },
            ),
          SwitchListTile(
            contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
            title: Text('Subir videos solo con Wi-Fi', style: archivo(18, 650)),
            subtitle: Text(
              'Las fotos se suben con cualquier conexión',
              style: archivo(16, 500, color: SeimaColors.muted),
            ),
            value: wifi.value ?? true,
            activeTrackColor: SeimaColors.red,
            onChanged: wifi.isLoading ? null : (on) => ref.read(videosWifiProvider.notifier).setVideosSoloWifi(on),
          ),
          ListTile(
            contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
            title: Text('Notificaciones', style: archivo(18, 650)),
            subtitle: Text(
              aviso.isEmpty ? 'Se preparan al entrar.' : aviso,
              style: archivo(16, 500, color: SeimaColors.muted),
            ),
            minVerticalPadding: 16,
          ),
          ListTile(
            contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
            title: Text('Cambiar contraseña', style: archivo(18, 650)),
            minVerticalPadding: 20,
            onTap: () => context.push('/contrasena'),
          ),
          const SizedBox(height: 24),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16),
            child: SeimaButton(label: 'Cerrar sesión', ink: true, onPressed: () => ref.read(authProvider.notifier).salir()),
          ),
        ],
      ),
    );
  }
}
