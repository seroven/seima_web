import 'package:flutter/material.dart';

import '../theme/seima_colors.dart';
import '../theme/seima_theme.dart';

class SeimaButton extends StatelessWidget {
  const SeimaButton({super.key, required this.label, required this.onPressed, this.busy = false, this.ink = false});

  final String label;
  final VoidCallback? onPressed;
  final bool busy;
  final bool ink;

  @override
  Widget build(BuildContext context) {
    return FilledButton(
      onPressed: busy ? null : onPressed,
      style: ink
          ? FilledButton.styleFrom(backgroundColor: SeimaColors.ink, foregroundColor: Colors.white)
          : null,
      child: busy
          ? const SizedBox(width: 22, height: 22, child: CircularProgressIndicator(strokeWidth: 2.5, color: Colors.white))
          : Text(label),
    );
  }
}

class Aviso extends StatelessWidget {
  const Aviso(this.texto, {super.key});

  final String? texto;

  @override
  Widget build(BuildContext context) {
    if (texto == null || texto!.isEmpty) return const SizedBox.shrink();
    return Padding(
      padding: const EdgeInsets.only(bottom: 16),
      child: Text(texto!, style: archivo(16, 650, color: SeimaColors.redText, height: 1.3)),
    );
  }
}
