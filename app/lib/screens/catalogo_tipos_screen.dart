import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../catalogo/catalogo.dart';
import '../catalogo/catalogo_controller.dart';
import '../theme/seima_colors.dart';
import '../theme/seima_theme.dart';
import '../widgets/cabecera_seima.dart';
import '../widgets/capas_marca.dart';
import '../widgets/gestion.dart';
import '../widgets/seima_button.dart';
import '../widgets/elecciones.dart';

/// Tipos de trabajo: lo que se elige al crear una obra (Cocinas, Baños…). Crear, renombrar, ordenar y desactivar.
class TiposTrabajoScreen extends ConsumerWidget {
  const TiposTrabajoScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final lista = ref.watch(tiposProvider);
    return Scaffold(
      floatingActionButtonLocation: FloatingActionButtonLocation.centerFloat,
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () => _nuevo(context, ref),
        backgroundColor: SeimaColors.red,
        foregroundColor: Colors.white,
        elevation: 0,
        focusElevation: 0,
        hoverElevation: 0,
        highlightElevation: 0,
        extendedPadding: const EdgeInsets.symmetric(horizontal: 28),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(18)),
        icon: const Icon(Icons.add, size: 28),
        label: Text('Nuevo tipo', style: archivo(18, 800, height: 1.1, color: Colors.white)),
      ),
      body: RefreshIndicator(
        color: SeimaColors.red,
        onRefresh: () async => ref.invalidate(tiposProvider),
        child: CustomScrollView(
          physics: const AlwaysScrollableScrollPhysics(),
          slivers: [
            SliverCabeceraSeima(
              titulo: 'Tipos de trabajo',
              subtitulo: 'Lo que eliges al crear una obra',
              alturaExpandida: 130,
              alVolver: () => context.pop(),
            ),
            ...lista.when(
              loading: () => [const SliverFillRemaining(hasScrollBody: false, child: Center(child: CircularProgressIndicator(color: SeimaColors.red)))],
              error: (error, _) => [
                SliverFillRemaining(
                  hasScrollBody: false,
                  child: _Mensaje(titulo: 'No se pudieron cargar', detalle: error.toString(), accion: 'Reintentar', onPressed: () => ref.invalidate(tiposProvider)),
                ),
              ],
              data: (tipos) => [
                SliverPadding(
                  padding: const EdgeInsets.fromLTRB(16, 20, 16, 112),
                  sliver: SliverList.separated(
                    itemCount: tipos.length + 1,
                    separatorBuilder: (_, _) => const SizedBox(height: 10),
                    itemBuilder: (context, i) {
                      if (i == 0) return const _Ayuda('Los tipos desactivados no se pueden elegir en obras nuevas.');
                      final tipo = tipos[i - 1];
                      return FilaGestion(
                        titulo: tipo.nombre,
                        icono: iconoDeCategoria(tipo.slug),
                        detalle: _obras(tipo.obras),
                        activo: tipo.activo,
                        onActivo: (on) => _activar(context, ref, tipo, on),
                        ordenable: true,
                        onSubir: i > 1 ? () => _mover(context, ref, tipo, -1) : null,
                        onBajar: i < tipos.length ? () => _mover(context, ref, tipo, 1) : null,
                        onTap: () => _renombrar(context, ref, tipo),
                      );
                    },
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  static String _obras(int n) => n == 0 ? 'Sin obras' : (n == 1 ? '1 obra' : '$n obras');

  Future<void> _nuevo(BuildContext context, WidgetRef ref) async {
    final nombre = await pedirTexto(context, titulo: 'Nuevo tipo de trabajo', ayuda: 'Por ejemplo: Pisos o Fachadas.', hint: 'Nombre', boton: 'Crear');
    if (nombre == null || !context.mounted) return;
    final error = await ref.read(tiposProvider.notifier).crear(nombre);
    if (context.mounted && error != null) avisar(context, error);
  }

  Future<void> _renombrar(BuildContext context, WidgetRef ref, TipoTrabajo tipo) async {
    final nombre = await pedirTexto(context, titulo: 'Nombre del tipo de trabajo', valorInicial: tipo.nombre, hint: 'Nombre');
    if (nombre == null || nombre == tipo.nombre || !context.mounted) return;
    final error = await ref.read(tiposProvider.notifier).renombrar(tipo.id, nombre);
    if (context.mounted && error != null) avisar(context, error);
  }

  Future<void> _activar(BuildContext context, WidgetRef ref, TipoTrabajo tipo, bool on) async {
    if (!on && tipo.obras > 0) {
      final seguro = await confirmar(
        context,
        titulo: '¿Desactivar «${tipo.nombre}»?',
        texto: '${_obras(tipo.obras)} ${tipo.obras == 1 ? 'lo usa' : 'lo usan'}. Ya no se podrá elegir en obras nuevas, y las obras que solo tengan este tipo dejarán de verse en la web.',
        boton: 'Desactivar',
      );
      if (!seguro || !context.mounted) return;
    }
    final error = await ref.read(tiposProvider.notifier).activar(tipo.id, on);
    if (context.mounted && error != null) avisar(context, error);
  }

  Future<void> _mover(BuildContext context, WidgetRef ref, TipoTrabajo tipo, int delta) async {
    final error = await ref.read(tiposProvider.notifier).mover(tipo.id, delta);
    if (context.mounted && error != null) avisar(context, error);
  }
}

class _Ayuda extends StatelessWidget {
  const _Ayuda(this.texto);

  final String texto;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(6, 0, 6, 4),
      child: Text(texto, style: archivo(15, 500, height: 1.3, color: SeimaColors.muted)),
    );
  }
}

class _Mensaje extends StatelessWidget {
  const _Mensaje({required this.titulo, required this.detalle, this.accion, this.onPressed});

  final String titulo;
  final String detalle;
  final String? accion;
  final VoidCallback? onPressed;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(28, 24, 28, 24),
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const CapasMarca(ancho: 120, claro: true),
          const SizedBox(height: 24),
          Text(titulo, style: archivo(26, 850, width: 118, height: 1.1)),
          const SizedBox(height: 10),
          Text(detalle, style: archivo(17, 500, color: SeimaColors.muted)),
          if (accion != null) ...[const SizedBox(height: 20), SeimaButton(label: accion!, onPressed: onPressed)],
        ],
      ),
    );
  }
}
