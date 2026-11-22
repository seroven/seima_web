import 'dart:math' as math;

import 'package:flutter/material.dart';

/// Tarjeta que se hunde un poco al tocarla, para que se sienta que responde.
class TarjetaToque extends StatefulWidget {
  const TarjetaToque({super.key, required this.child, required this.onTap, this.semantica});

  final Widget child;
  final VoidCallback? onTap;
  final String? semantica;

  @override
  State<TarjetaToque> createState() => _TarjetaToqueState();
}

class _TarjetaToqueState extends State<TarjetaToque> {
  var _hundida = false;

  void _mover(bool hundida) {
    if (_hundida != hundida) setState(() => _hundida = hundida);
  }

  @override
  Widget build(BuildContext context) {
    final quieta = MediaQuery.of(context).disableAnimations;
    return Semantics(
      button: true,
      label: widget.semantica,
      child: GestureDetector(
        behavior: HitTestBehavior.opaque,
        onTapDown: (_) => _mover(true),
        onTapUp: (_) => _mover(false),
        onTapCancel: () => _mover(false),
        onTap: widget.onTap,
        child: AnimatedScale(
          scale: _hundida && !quieta ? 0.975 : 1,
          duration: const Duration(milliseconds: 120),
          curve: Curves.easeOut,
          child: widget.child,
        ),
      ),
    );
  }
}

/// Entrada suave (aparece y sube un poco). Solo anima las primeras tarjetas.
class Aparece extends StatelessWidget {
  const Aparece({super.key, required this.child, this.indice = 0});

  final Widget child;
  final int indice;

  @override
  Widget build(BuildContext context) {
    if (MediaQuery.of(context).disableAnimations || indice > 5) return child;
    final retraso = math.min(indice, 5) * 70;
    final total = 420 + retraso;
    return TweenAnimationBuilder<double>(
      tween: Tween(begin: 0, end: 1),
      duration: Duration(milliseconds: total),
      curve: Interval(retraso / total, 1, curve: Curves.easeOutCubic),
      builder: (context, valor, hijo) => Opacity(
        opacity: valor,
        child: Transform.translate(offset: Offset(0, (1 - valor) * 18), child: hijo),
      ),
      child: child,
    );
  }
}
