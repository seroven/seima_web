import 'package:flutter/material.dart';

import '../theme/seima_colors.dart';
import '../theme/seima_theme.dart';

/// Píldora con ícono y texto. Los estados se distinguen por tono, sin bordes.
class Etiqueta extends StatelessWidget {
  const Etiqueta({super.key, required this.texto, required this.fondo, required this.color, this.icono});

  final String texto;
  final Color fondo;
  final Color color;
  final IconData? icono;

  /// Estado de una obra: Publicado, Borrador u Oculto.
  factory Etiqueta.obra(String estado, {bool sobreFoto = false}) {
    return switch (estado) {
      'publicado' => const Etiqueta(texto: 'Publicado', fondo: SeimaColors.red, color: Colors.white, icono: Icons.check_circle),
      'oculto' => const Etiqueta(texto: 'Oculto', fondo: SeimaColors.ink, color: Colors.white, icono: Icons.visibility_off),
      _ => Etiqueta(
        texto: 'Borrador',
        fondo: sobreFoto ? Colors.white : SeimaColors.tint2,
        color: SeimaColors.ink,
        icono: Icons.edit_note,
      ),
    };
  }

  /// Estado de una cotización.
  factory Etiqueta.cotizacion(String estado, String texto) {
    return switch (estado) {
      'nueva' => Etiqueta(texto: texto, fondo: SeimaColors.red, color: Colors.white, icono: Icons.fiber_manual_record),
      'contactada' => Etiqueta(texto: texto, fondo: SeimaColors.ink, color: Colors.white, icono: Icons.reply),
      'cerrada' => Etiqueta(texto: texto, fondo: SeimaColors.tint2, color: SeimaColors.ink, icono: Icons.check),
      _ => Etiqueta(texto: texto, fondo: SeimaColors.tint, color: SeimaColors.muted, icono: Icons.block),
    };
  }

  @override
  Widget build(BuildContext context) {
    return DecoratedBox(
      decoration: BoxDecoration(color: fondo, borderRadius: BorderRadius.circular(999)),
      child: Padding(
        padding: const EdgeInsets.fromLTRB(10, 6, 12, 6),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            if (icono != null) ...[Icon(icono, size: 16, color: color), const SizedBox(width: 5)],
            Text(texto, style: archivo(14, 750, height: 1.1, color: color)),
          ],
        ),
      ),
    );
  }
}
