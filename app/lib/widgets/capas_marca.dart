import 'package:flutter/material.dart';

import '../theme/seima_colors.dart';

/// El concepto de la marca, "capa por capa": tres losas apiladas
/// (estructura, placas y acabado en rojo). Es solo decoración.
class CapasMarca extends StatelessWidget {
  const CapasMarca({super.key, this.ancho = 180, this.claro = false});

  final double ancho;

  /// Sobre fondo claro las capas bajas van en gris suave.
  final bool claro;

  @override
  Widget build(BuildContext context) {
    return ExcludeSemantics(
      child: CustomPaint(
        size: Size(ancho, ancho * 0.72),
        painter: _CapasPainter(claro: claro),
      ),
    );
  }
}

class _CapasPainter extends CustomPainter {
  const _CapasPainter({required this.claro});

  final bool claro;

  @override
  void paint(Canvas canvas, Size size) {
    final grosor = size.height * 0.26;
    final sesgo = grosor * 1.1;
    final largo = size.width - sesgo;
    final colores = claro
        ? const [SeimaColors.tint2, SeimaColors.tint, SeimaColors.red]
        : const [SeimaColors.ink4, SeimaColors.ink3, SeimaColors.red];
    // De abajo hacia arriba: cada capa sube y se corre un poco.
    for (var i = 0; i < 3; i++) {
      final y = size.height - grosor - i * grosor * 1.28;
      final x = i * size.width * 0.035;
      final ancho = largo - i * size.width * 0.08;
      final capa = Path()
        ..moveTo(x + sesgo, y)
        ..lineTo(x + sesgo + ancho, y)
        ..lineTo(x + ancho, y + grosor)
        ..lineTo(x, y + grosor)
        ..close();
      canvas.drawPath(capa, Paint()..color = colores[i]);
    }
  }

  @override
  bool shouldRepaint(_CapasPainter viejo) => viejo.claro != claro;
}
