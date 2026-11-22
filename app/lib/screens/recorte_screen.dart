import 'dart:io';

import 'package:flutter/material.dart';
import 'package:video_player/video_player.dart';

import '../projects/recorte.dart';
import '../projects/video_nativo.dart';
import '../projects/video_reglas.dart';
import '../theme/seima_colors.dart';
import '../theme/seima_theme.dart';
import '../widgets/seima_button.dart';

class RecorteScreen extends StatefulWidget {
  const RecorteScreen({super.key, required this.ruta, required this.duracionMs, required this.topeMs, this.recortar});

  final String ruta;
  final int duracionMs;
  final int topeMs;
  final Future<TramoElegido?> Function({required String ruta, required int inicioMs, required int finMs})? recortar;

  @override
  State<RecorteScreen> createState() => _RecorteScreenState();
}

class _RecorteScreenState extends State<RecorteScreen> {
  VideoPlayerController? _control;
  late VentanaRecorte _ventana;
  var _listo = false;
  var _ocupado = false;
  var _probando = false;
  String? _error;

  @override
  void initState() {
    super.initState();
    _ventana = ventanaInicial(duracionMs: widget.duracionMs, topeMs: widget.topeMs);
    final control = VideoPlayerController.file(File(widget.ruta));
    _control = control;
    control.initialize().then((_) {
      if (!mounted) return;
      control.addListener(_alAvanzar);
      setState(() => _listo = true);
    }).catchError((_) {
      if (mounted) setState(() => _error = 'No se pudo abrir el video.');
    });
  }

  @override
  void dispose() {
    _control?.removeListener(_alAvanzar);
    _control?.dispose();
    super.dispose();
  }

  void _alAvanzar() {
    final control = _control;
    if (control == null || !_probando) return;
    if (control.value.position.inMilliseconds >= _ventana.finMs) {
      control.pause();
      _probando = false;
    }
  }

  Future<void> _probar() async {
    final control = _control;
    if (control == null || !_listo) return;
    _probando = true;
    await control.seekTo(Duration(milliseconds: _ventana.inicioMs));
    await control.play();
  }

  Future<void> _usar() async {
    setState(() {
      _ocupado = true;
      _error = null;
    });
    await _control?.pause();
    final recortar = widget.recortar ?? recortarEnElCelular;
    final hecho = await recortar(ruta: widget.ruta, inicioMs: _ventana.inicioMs, finMs: _ventana.finMs);
    if (!mounted) return;
    if (hecho == null) {
      setState(() {
        _ocupado = false;
        _error = 'No se pudo recortar el video. Prueba con otro.';
      });
      return;
    }
    Navigator.of(context).pop(hecho);
  }

  @override
  Widget build(BuildContext context) {
    final control = _control;
    return Scaffold(
      appBar: AppBar(title: const Text('Elige el tramo')),
      body: ListView(
        padding: const EdgeInsets.fromLTRB(24, 8, 24, 32),
        children: [
          Text('El video puede durar hasta ${textoDuracion(widget.topeMs)}.', style: archivo(28, 800, width: 118, height: 1.05)),
          const SizedBox(height: 8),
          Text('Mueve las manijas. El tramo queda en ${textoDuracion(_ventana.duracionMs)}.', style: archivo(16, 500, color: SeimaColors.muted)),
          const SizedBox(height: 16),
          ClipRRect(
            borderRadius: BorderRadius.circular(16),
            child: ColoredBox(
              color: Colors.black,
              child: AspectRatio(
                aspectRatio: control != null && control.value.isInitialized && control.value.aspectRatio > 0 ? control.value.aspectRatio : 16 / 9,
                child: _listo && control != null ? VideoPlayer(control) : const Center(child: CircularProgressIndicator(color: Colors.white)),
              ),
            ),
          ),
          const SizedBox(height: 20),
          _Barra(
            duracionMs: widget.duracionMs,
            ventana: _ventana,
            onInicio: (ms) => setState(() {
              _probando = false;
              _ventana = moverInicio(_ventana, ms, duracionMs: widget.duracionMs, topeMs: widget.topeMs);
            }),
            onFin: (ms) => setState(() {
              _probando = false;
              _ventana = moverFin(_ventana, ms, duracionMs: widget.duracionMs, topeMs: widget.topeMs);
            }),
          ),
          const SizedBox(height: 8),
          Text('${textoDuracion(_ventana.inicioMs)} – ${textoDuracion(_ventana.finMs)}', style: archivo(18, 700)),
          const SizedBox(height: 16),
          Aviso(_error),
          SeimaButton(label: 'Probar', ink: true, onPressed: _listo && !_ocupado ? _probar : null),
          const SizedBox(height: 10),
          SeimaButton(label: 'Usar este tramo', busy: _ocupado, onPressed: _listo && !_ocupado ? _usar : null),
        ],
      ),
    );
  }
}

class _Barra extends StatelessWidget {
  const _Barra({required this.duracionMs, required this.ventana, required this.onInicio, required this.onFin});

  final int duracionMs;
  final VentanaRecorte ventana;
  final ValueChanged<int> onInicio;
  final ValueChanged<int> onFin;

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      height: 56,
      child: LayoutBuilder(
        builder: (context, caja) {
          final ancho = caja.maxWidth;
          final inicio = ancho * ventana.inicioMs / duracionMs;
          final fin = ancho * ventana.finMs / duracionMs;
          return Stack(
            children: [
              Positioned(left: 0, right: 0, top: 24, child: Container(height: 8, decoration: BoxDecoration(color: SeimaColors.paper2, borderRadius: BorderRadius.circular(4)))),
              Positioned(left: inicio, width: (fin - inicio).clamp(8, ancho), top: 24, child: Container(height: 8, decoration: BoxDecoration(color: SeimaColors.red, borderRadius: BorderRadius.circular(4)))),
              Positioned(left: (inicio - 22).clamp(0, ancho - 44), top: 6, child: _Manija(etiqueta: 'Inicio', onMs: (dx) => onInicio(_ms(dx, ancho)))),
              Positioned(left: (fin - 22).clamp(0, ancho - 44), top: 6, child: _Manija(etiqueta: 'Fin', onMs: (dx) => onFin(_ms(dx, ancho)))),
            ],
          );
        },
      ),
    );
  }

  int _ms(double x, double ancho) => (x / ancho * duracionMs).round();
}

class _Manija extends StatelessWidget {
  const _Manija({required this.etiqueta, required this.onMs});

  final String etiqueta;
  final ValueChanged<double> onMs;

  @override
  Widget build(BuildContext context) {
    return Semantics(
      label: etiqueta,
      slider: true,
      child: GestureDetector(
        onHorizontalDragUpdate: (detalle) {
          final caja = context.findAncestorRenderObjectOfType<RenderBox>();
          if (caja == null || !caja.hasSize) return;
          onMs(caja.globalToLocal(detalle.globalPosition).dx);
        },
        child: const SizedBox(width: 44, height: 44, child: DecoratedBox(decoration: BoxDecoration(color: SeimaColors.ink, shape: BoxShape.circle))),
      ),
    );
  }
}
