import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../theme/seima_colors.dart';
import '../theme/seima_theme.dart';
import 'capas_marca.dart';

/// Encabezado oscuro de las pantallas principales (la «sección de impacto» de la web).
///
/// Se queda pegado arriba al hacer scroll: grande al inicio y, al bajar, se
/// contrae a una barra compacta con el título (y el `pie`, si lo hay).
class SliverCabeceraSeima extends StatelessWidget {
  const SliverCabeceraSeima({
    super.key,
    required this.titulo,
    required this.alturaExpandida,
    this.antetitulo,
    this.subtitulo,
    this.hijo,
    this.pie,
    this.alturaPie = 0,
    this.alVolver,
    this.acciones = const [],
  });

  final String titulo;
  final String? antetitulo;
  final String? subtitulo;

  /// Va debajo del título y se desvanece al bajar (cifras, avatar, etiquetas).
  final Widget? hijo;

  /// Se queda siempre visible, aun con la barra contraída (filtros).
  final Widget? pie;
  final double alturaPie;

  /// Alto del bloque de texto del encabezado grande (título, subtítulo y lo que lleve debajo), sin contar la barra de
  /// estado, el `pie` ni la fila del botón de volver: esas se suman solas.
  final double alturaExpandida;

  /// Si viene, se muestra el botón de volver.
  final VoidCallback? alVolver;
  final List<Widget> acciones;

  static const _barra = 64.0;
  static const _radio = BorderRadius.vertical(bottom: Radius.circular(28));

  @override
  Widget build(BuildContext context) {
    final conBotones = alVolver != null || acciones.isNotEmpty;
    // La fila de botones (volver, acciones) ocupa 64 dp arriba del título.
    final alto = alturaExpandida + (conBotones ? 64.0 : 0.0);
    return SliverAppBar(
      pinned: true,
      automaticallyImplyLeading: false,
      toolbarHeight: _barra,
      collapsedHeight: _barra + alturaPie,
      expandedHeight: alto + alturaPie,
      backgroundColor: SeimaColors.ink,
      surfaceTintColor: Colors.transparent,
      elevation: 0,
      scrolledUnderElevation: 0,
      systemOverlayStyle: SystemUiOverlayStyle.light,
      shape: const RoundedRectangleBorder(borderRadius: _radio),
      clipBehavior: Clip.antiAlias,
      flexibleSpace: LayoutBuilder(
        builder: (context, caja) {
          final top = MediaQuery.paddingOf(context).top;
          final maximo = alto + alturaPie + top;
          final minimo = _barra + alturaPie + top;
          // 0 = grande, 1 = contraído.
          final t = maximo <= minimo ? 1.0 : ((maximo - caja.maxHeight) / (maximo - minimo)).clamp(0.0, 1.0);
          final inicioTitulo = alVolver != null ? 76.0 : 24.0;
          final finTitulo = acciones.isNotEmpty ? 76.0 : 24.0;
          return Stack(
            clipBehavior: Clip.hardEdge,
            children: [
              // Con botones de acción arriba a la derecha las capas estorban: se omiten.
              if (acciones.isEmpty)
                Positioned(
                  right: -14,
                  top: top + 6,
                  child: Opacity(opacity: 1 - t, child: const CapasMarca(ancho: 112)),
                ),
              Positioned(
                left: 0,
                right: 0,
                top: 0,
                // Más alto que el encabezado a propósito: lo que sobre se recorta, no se desborda con franjas amarillas.
                height: maximo + 160,
                child: IgnorePointer(
                  ignoring: t > 0.5,
                  child: Opacity(
                    opacity: (1 - t * 1.8).clamp(0.0, 1.0),
                    child: Padding(
                      padding: EdgeInsets.fromLTRB(24, top + (conBotones ? 84 : 20), 24, 0),
                      child: Align(
                        alignment: Alignment.topLeft,
                        child: Column(
                          mainAxisSize: MainAxisSize.min,
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            if (antetitulo != null)
                              Padding(
                                padding: const EdgeInsets.only(bottom: 6),
                                child: Text(
                                  antetitulo!.toUpperCase(),
                                  style: archivo(14, 800, width: 112, height: 1.1, color: SeimaColors.red).copyWith(letterSpacing: 1.4),
                                ),
                              ),
                            Text(titulo, style: archivo(36, 850, width: 118, height: 1.02, color: Colors.white)),
                            if (subtitulo != null && subtitulo!.isNotEmpty) ...[
                              const SizedBox(height: 8),
                              Text(subtitulo!, style: archivo(18, 500, color: SeimaColors.onInkMuted)),
                            ],
                            if (hijo != null) ...[const SizedBox(height: 18), hijo!],
                          ],
                        ),
                      ),
                    ),
                  ),
                ),
              ),
              // Título compacto: aparece cuando la barra ya se contrajo.
              Positioned(
                left: inicioTitulo,
                right: finTitulo,
                top: top,
                height: _barra,
                child: IgnorePointer(
                  child: Opacity(
                    opacity: ((t - 0.55) / 0.45).clamp(0.0, 1.0),
                    child: Align(
                      alignment: Alignment.centerLeft,
                      child: Text(
                        titulo,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: archivo(22, 850, width: 114, height: 1.1, color: Colors.white),
                      ),
                    ),
                  ),
                ),
              ),
              if (conBotones)
                Positioned(
                  left: 16,
                  right: 16,
                  top: top + 8,
                  height: 48,
                  child: Row(
                    children: [
                      if (alVolver != null) BotonRedondo(icono: Icons.arrow_back, tooltip: 'Volver', onPressed: alVolver!),
                      const Spacer(),
                      ...acciones,
                    ],
                  ),
                ),
              if (pie != null) Positioned(left: 0, right: 0, bottom: 0, height: alturaPie, child: pie!),
            ],
          );
        },
      ),
    );
  }
}

/// Botón redondo sobre fondo oscuro (volver, menú). Mide 48 dp.
class BotonRedondo extends StatelessWidget {
  const BotonRedondo({super.key, required this.icono, required this.tooltip, required this.onPressed});

  final IconData icono;
  final String tooltip;
  final VoidCallback onPressed;

  @override
  Widget build(BuildContext context) {
    return Tooltip(
      message: tooltip,
      child: Material(
        color: SeimaColors.ink3,
        shape: const CircleBorder(),
        child: InkWell(
          customBorder: const CircleBorder(),
          onTap: onPressed,
          child: SizedBox(width: 48, height: 48, child: Icon(icono, color: Colors.white, size: 24)),
        ),
      ),
    );
  }
}

/// Un número grande con su rótulo (para el encabezado).
class CifraCabecera extends StatelessWidget {
  const CifraCabecera({super.key, required this.cifra, required this.rotulo, this.resalta = false});

  final int cifra;
  final String rotulo;
  final bool resalta;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text('$cifra', style: archivo(34, 850, width: 118, height: 1, color: resalta ? SeimaColors.red : Colors.white)),
        const SizedBox(height: 4),
        Text(rotulo, style: archivo(15, 600, height: 1.1, color: SeimaColors.onInkMuted)),
      ],
    );
  }
}
