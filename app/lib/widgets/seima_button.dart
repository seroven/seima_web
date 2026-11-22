import 'package:flutter/material.dart';

import '../theme/seima_colors.dart';
import '../theme/seima_theme.dart';

class SeimaButton extends StatelessWidget {
  const SeimaButton({super.key, required this.label, required this.onPressed, this.busy = false, this.ink = false, this.icono});

  final String label;
  final VoidCallback? onPressed;
  final bool busy;
  final bool ink;
  final IconData? icono;

  @override
  Widget build(BuildContext context) {
    return FilledButton(
      onPressed: busy ? null : onPressed,
      style: ink
          ? FilledButton.styleFrom(backgroundColor: SeimaColors.ink, foregroundColor: Colors.white)
          : null,
      child: busy
          ? const SizedBox(width: 22, height: 22, child: CircularProgressIndicator(strokeWidth: 2.5, color: Colors.white))
          : icono == null
          ? Text(label)
          : Row(
              mainAxisSize: MainAxisSize.min,
              children: [Icon(icono, size: 24), const SizedBox(width: 10), Flexible(child: Text(label))],
            ),
    );
  }
}

/// Botón secundario grande: ícono arriba y texto abajo. Sin borde, solo tono de fondo.
class BotonSuave extends StatelessWidget {
  const BotonSuave({super.key, required this.icono, required this.label, required this.onPressed});

  final IconData icono;
  final String label;
  final VoidCallback? onPressed;

  @override
  Widget build(BuildContext context) {
    final activo = onPressed != null;
    return Opacity(
      opacity: activo ? 1 : 0.45,
      child: Material(
        color: SeimaColors.paper2,
        borderRadius: BorderRadius.circular(18),
        child: InkWell(
          borderRadius: BorderRadius.circular(18),
          onTap: onPressed,
          child: ConstrainedBox(
            constraints: const BoxConstraints(minHeight: 88),
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 12),
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Icon(icono, size: 30, color: SeimaColors.ink),
                  const SizedBox(height: 6),
                  Text(label, textAlign: TextAlign.center, style: archivo(16, 750, height: 1.15)),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}

class Aviso extends StatelessWidget {
  const Aviso(this.texto, {super.key, this.sobreOscuro = false});

  final String? texto;

  /// Sobre fondo oscuro el rojo de texto no contrasta; va en un recuadro rojo suave.
  final bool sobreOscuro;

  @override
  Widget build(BuildContext context) {
    if (texto == null || texto!.isEmpty) return const SizedBox.shrink();
    return Padding(
      padding: const EdgeInsets.only(bottom: 16),
      child: sobreOscuro
          ? DecoratedBox(
              decoration: BoxDecoration(color: SeimaColors.redSoft, borderRadius: BorderRadius.circular(14)),
              child: Padding(
                padding: const EdgeInsets.all(14),
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Icon(Icons.error_outline, color: Colors.white, size: 22),
                    const SizedBox(width: 10),
                    Expanded(child: Text(texto!, style: archivo(16, 650, color: Colors.white, height: 1.3))),
                  ],
                ),
              ),
            )
          : Text(texto!, style: archivo(16, 650, color: SeimaColors.redText, height: 1.3)),
    );
  }
}
