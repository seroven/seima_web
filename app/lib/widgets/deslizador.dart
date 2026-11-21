import 'package:flutter/material.dart';

import '../theme/seima_theme.dart';
import 'foto_llena.dart';

/// El antes se descubre arrastrando, como en la web cuando el par es horizontal.
class Deslizador extends StatefulWidget {
  const Deslizador({super.key, required this.antes, required this.despues, this.proporcion = 16 / 9});

  final String antes;
  final String despues;
  final double proporcion;

  @override
  State<Deslizador> createState() => _DeslizadorState();
}

class _DeslizadorState extends State<Deslizador> {
  var _posicion = 0.5;

  @override
  Widget build(BuildContext context) {
    final porcentaje = '${(_posicion * 100).round()}%';
    return Semantics(
      slider: true,
      label: 'Comparación',
      value: porcentaje,
      child: AspectRatio(
        aspectRatio: widget.proporcion,
        child: LayoutBuilder(
          builder: (context, limites) {
            final ancho = limites.maxWidth;
            return GestureDetector(
              onHorizontalDragUpdate: (detalle) => _mover(detalle.globalPosition, context),
              onTapDown: (detalle) => _mover(detalle.globalPosition, context),
              child: ClipRRect(
                borderRadius: BorderRadius.circular(14),
                child: Stack(
                  fit: StackFit.expand,
                  children: [
                    FotoLlena(widget.despues),
                    ClipRect(clipper: _RecorteAntes(_posicion), child: FotoLlena(widget.antes)),
                    Positioned(
                      left: ancho * _posicion - 1.5,
                      top: 0,
                      bottom: 0,
                      child: const SizedBox(width: 3, child: ColoredBox(color: Colors.white)),
                    ),
                    Positioned(
                      left: ancho * _posicion - 22,
                      top: 0,
                      bottom: 0,
                      child: const Center(child: _Manija()),
                    ),
                    const Positioned(left: 12, bottom: 10, child: _Etiqueta('Antes')),
                    const Positioned(right: 12, bottom: 10, child: _Etiqueta('Después')),
                  ],
                ),
              ),
            );
          },
        ),
      ),
    );
  }

  void _mover(Offset global, BuildContext context) {
    final caja = context.findRenderObject() as RenderBox?;
    if (caja == null || caja.size.width <= 0) return;
    final local = caja.globalToLocal(global);
    setState(() => _posicion = (local.dx / caja.size.width).clamp(0.04, 0.96));
  }
}

class _RecorteAntes extends CustomClipper<Rect> {
  const _RecorteAntes(this.posicion);

  final double posicion;

  @override
  Rect getClip(Size size) => Rect.fromLTWH(0, 0, size.width * posicion, size.height);

  @override
  bool shouldReclip(_RecorteAntes anterior) => anterior.posicion != posicion;
}

class _Manija extends StatelessWidget {
  const _Manija();

  @override
  Widget build(BuildContext context) {
    return Container(
      width: 44,
      height: 44,
      decoration: const BoxDecoration(color: Colors.white, shape: BoxShape.circle),
      child: const Icon(Icons.swap_horiz, color: Color(0xFF0E0E0E)),
    );
  }
}

class _Etiqueta extends StatelessWidget {
  const _Etiqueta(this.texto);

  final String texto;

  @override
  Widget build(BuildContext context) {
    return DecoratedBox(
      decoration: BoxDecoration(color: const Color(0xCC0E0E0E), borderRadius: BorderRadius.circular(8)),
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
        child: Text(texto, style: archivo(16, 700, color: Colors.white)),
      ),
    );
  }
}
