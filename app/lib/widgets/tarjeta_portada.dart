import 'package:flutter/material.dart';

import '../theme/seima_colors.dart';
import '../theme/seima_theme.dart';
import 'foto_llena.dart';

/// La tarjeta del catálogo: se ve el después y, al mantener presionado, el antes.
class TarjetaPortada extends StatefulWidget {
  const TarjetaPortada({super.key, required this.antes, required this.despues, this.proporcion = 4 / 3});

  final String antes;
  final String despues;
  final double proporcion;

  @override
  State<TarjetaPortada> createState() => _TarjetaPortadaState();
}

class _TarjetaPortadaState extends State<TarjetaPortada> {
  var _muestraAntes = false;

  @override
  Widget build(BuildContext context) {
    return Column(
      mainAxisSize: MainAxisSize.min,
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Semantics(
          label: _muestraAntes ? 'Mostrando el antes' : 'Mostrando el después',
          child: GestureDetector(
            onTapDown: (_) => setState(() => _muestraAntes = true),
            onTapUp: (_) => setState(() => _muestraAntes = false),
            onTapCancel: () => setState(() => _muestraAntes = false),
            child: ClipRRect(
              borderRadius: BorderRadius.circular(14),
              child: AspectRatio(
                aspectRatio: widget.proporcion,
                child: FotoLlena(_muestraAntes ? widget.antes : widget.despues),
              ),
            ),
          ),
        ),
        const SizedBox(height: 8),
        Text('Mantén presionado para ver el antes.', style: archivo(16, 500, color: SeimaColors.muted)),
      ],
    );
  }
}
