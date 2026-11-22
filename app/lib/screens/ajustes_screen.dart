import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../auth/auth_controller.dart';
import '../auth/auth_state.dart';
import '../settings/ajustes_locales.dart';
import '../theme/seima_colors.dart';
import '../theme/seima_theme.dart';
import '../widgets/cabecera_seima.dart';
import '../widgets/seima_button.dart';
import '../widgets/toque.dart';
import 'listas_screen.dart';
import 'proyectos_screen.dart';

class AjustesScreen extends ConsumerWidget {
  const AjustesScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final auth = ref.watch(authProvider).value;
    final nombre = auth is AuthSignedIn ? primerNombre(auth.nombre) : '';
    final huella = ref.watch(huellaActivaProvider);
    final disponible = ref.watch(biometriaDisponibleProvider);
    final wifi = ref.watch(videosWifiProvider);
    final aviso = ref.watch(avisoPushProvider);
    final hayHuella = disponible.value ?? false;

    return Scaffold(
      body: CustomScrollView(
        slivers: [
          SliverCabeceraSeima(
            titulo: 'Ajustes',
            alturaExpandida: 160,
            hijo: nombre.isEmpty
                ? null
                : Row(
                    children: [
                      InicialCircular(nombre: nombre, resaltada: true, tamano: 48),
                      const SizedBox(width: 14),
                      Text(nombre, style: archivo(20, 750, height: 1.1, color: Colors.white)),
                    ],
                  ),
          ),
          SliverToBoxAdapter(
            child: Padding(
            padding: const EdgeInsets.fromLTRB(16, 24, 16, 40),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const _Grupo('Lo que ofreces'),
                _FilaToque(
                  icono: Icons.category_outlined,
                  titulo: 'Tipos de trabajo',
                  detalle: 'Cocinas, Baños… lo que eliges al crear una obra',
                  onTap: () => context.push('/catalogo/tipos'),
                ),
                const SizedBox(height: 10),
                _FilaToque(
                  icono: Icons.checklist,
                  titulo: 'Servicios y preguntas del cotizador',
                  detalle: 'Lo que el cliente elige y responde al cotizar',
                  onTap: () => context.push('/catalogo/servicios'),
                ),
                const SizedBox(height: 24),
                const _Grupo('Seguridad'),
                if (hayHuella) ...[
                  _FilaInterruptor(
                    icono: Icons.fingerprint,
                    titulo: 'Huella',
                    detalle: 'Entra sin escribir la contraseña',
                    valor: huella.value ?? false,
                    onChanged: huella.isLoading
                        ? null
                        : (on) async {
                            final mensaje = await ref.read(authProvider.notifier).usarHuella(on);
                            if (mensaje != null && context.mounted) {
                              ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(mensaje)));
                            }
                          },
                  ),
                  const SizedBox(height: 10),
                ],
                _FilaToque(
                  icono: Icons.lock_outline,
                  titulo: 'Cambiar contraseña',
                  onTap: () => context.push('/contrasena'),
                ),
                const SizedBox(height: 24),
                const _Grupo('Subidas'),
                _FilaInterruptor(
                  icono: Icons.wifi,
                  titulo: 'Subir videos solo con Wi-Fi',
                  detalle: 'Las fotos se suben con cualquier conexión',
                  valor: wifi.value ?? true,
                  onChanged: wifi.isLoading ? null : (on) => ref.read(videosWifiProvider.notifier).setVideosSoloWifi(on),
                ),
                const SizedBox(height: 24),
                const _Grupo('Avisos'),
                _Fila(
                  icono: Icons.notifications_none,
                  titulo: 'Notificaciones',
                  detalle: aviso.isEmpty ? 'Se preparan al entrar.' : aviso,
                ),
                const SizedBox(height: 32),
                SeimaButton(label: 'Cerrar sesión', ink: true, onPressed: () => ref.read(authProvider.notifier).salir()),
              ],
            ),
            ),
          ),
        ],
      ),
    );
  }
}

class _Grupo extends StatelessWidget {
  const _Grupo(this.texto);

  final String texto;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(left: 4, bottom: 10),
      child: Text(texto.toUpperCase(), style: archivo(14, 800, width: 112, height: 1.1, color: SeimaColors.muted).copyWith(letterSpacing: 1.2)),
    );
  }
}

class _Fila extends StatelessWidget {
  const _Fila({required this.icono, required this.titulo, this.detalle, this.extremo});

  final IconData icono;
  final String titulo;
  final String? detalle;
  final Widget? extremo;

  @override
  Widget build(BuildContext context) {
    return DecoratedBox(
      decoration: BoxDecoration(color: SeimaColors.paper2, borderRadius: BorderRadius.circular(18)),
      child: ConstrainedBox(
        constraints: const BoxConstraints(minHeight: 76),
        child: Padding(
          padding: const EdgeInsets.fromLTRB(14, 12, 14, 12),
          child: Row(
            children: [
              DecoratedBox(
                decoration: BoxDecoration(color: SeimaColors.ink, borderRadius: BorderRadius.circular(14)),
                child: SizedBox(width: 48, height: 48, child: Icon(icono, color: Colors.white, size: 26)),
              ),
              const SizedBox(width: 14),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(titulo, style: archivo(18, 750, height: 1.15)),
                    if (detalle != null) Text(detalle!, style: archivo(15, 500, height: 1.25, color: SeimaColors.muted)),
                  ],
                ),
              ),
              if (extremo != null) ...[const SizedBox(width: 8), extremo!],
            ],
          ),
        ),
      ),
    );
  }
}

class _FilaInterruptor extends StatelessWidget {
  const _FilaInterruptor({required this.icono, required this.titulo, required this.detalle, required this.valor, required this.onChanged});

  final IconData icono;
  final String titulo;
  final String detalle;
  final bool valor;
  final ValueChanged<bool>? onChanged;

  @override
  Widget build(BuildContext context) {
    return TarjetaToque(
      onTap: onChanged == null ? null : () => onChanged!(!valor),
      child: _Fila(
        icono: icono,
        titulo: titulo,
        detalle: detalle,
        extremo: Switch(value: valor, onChanged: onChanged),
      ),
    );
  }
}

class _FilaToque extends StatelessWidget {
  const _FilaToque({required this.icono, required this.titulo, required this.onTap, this.detalle});

  final IconData icono;
  final String titulo;
  final String? detalle;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return TarjetaToque(
      onTap: onTap,
      child: _Fila(icono: icono, titulo: titulo, detalle: detalle, extremo: const Icon(Icons.chevron_right, color: SeimaColors.muted)),
    );
  }
}
