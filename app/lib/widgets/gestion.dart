import 'package:flutter/material.dart';

import '../theme/seima_colors.dart';
import '../theme/seima_theme.dart';
import 'seima_button.dart';
import 'toque.dart';

/// Una fila de una lista que se gestiona: título, detalle, y a la derecha flechas para ordenar y un interruptor
/// para activar o desactivar. Lo desactivado se ve atenuado. Sin bordes: solo tono de fondo.
class FilaGestion extends StatelessWidget {
  const FilaGestion({
    super.key,
    required this.titulo,
    this.detalle,
    this.aviso,
    this.icono,
    this.activo,
    this.onActivo,
    this.onTap,
    this.indiceArrastre,
  });

  final String titulo;
  final String? detalle;

  /// Línea roja corta (algo que falta, p. ej. «Sin opciones: no se muestra»).
  final String? aviso;
  final IconData? icono;

  /// Si es false, la fila se atenúa y dice «Desactivado».
  final bool? activo;
  final ValueChanged<bool>? onActivo;
  final VoidCallback? onTap;

  /// Si viene, la fila muestra el asa «≡» para arrastrarla y cambiarla de lugar. Es la posición de la fila en la
  /// lista, y la fila tiene que estar dentro de una `SliverReorderableList`.
  final int? indiceArrastre;

  @override
  Widget build(BuildContext context) {
    final apagada = activo == false;
    final contenido = DecoratedBox(
      decoration: BoxDecoration(color: SeimaColors.paper2, borderRadius: BorderRadius.circular(18)),
      child: ConstrainedBox(
        constraints: const BoxConstraints(minHeight: 72),
        child: Padding(
          padding: const EdgeInsets.fromLTRB(14, 10, 10, 10),
          child: Row(
            children: [
              if (icono != null) ...[
                DecoratedBox(
                  decoration: BoxDecoration(color: SeimaColors.ink, borderRadius: BorderRadius.circular(14)),
                  child: SizedBox(width: 44, height: 44, child: Icon(icono, color: Colors.white, size: 24)),
                ),
                const SizedBox(width: 12),
              ],
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(titulo, style: archivo(17, 800, width: 106, height: 1.2)),
                    if (detalle != null && detalle!.isNotEmpty) Text(detalle!, style: archivo(14, 550, height: 1.25, color: SeimaColors.muted)),
                    if (apagada) Text('Desactivado', style: archivo(13, 750, height: 1.25, color: SeimaColors.muted)),
                    if (aviso != null && aviso!.isNotEmpty) Text(aviso!, style: archivo(13, 700, height: 1.25, color: SeimaColors.redText)),
                  ],
                ),
              ),
              if (indiceArrastre != null) ...[
                const SizedBox(width: 2),
                // Se arrastra desde el asa (no desde toda la fila), así la lista se puede seguir deslizando con el dedo.
                ReorderableDragStartListener(
                  index: indiceArrastre!,
                  child: Semantics(
                    label: 'Arrastra para cambiar de lugar',
                    child: const SizedBox(width: 44, height: 48, child: Icon(Icons.drag_indicator, size: 28, color: SeimaColors.muted)),
                  ),
                ),
              ],
              if (onActivo != null) ...[
                const SizedBox(width: 4),
                Semantics(label: activo == false ? 'Activar $titulo' : 'Desactivar $titulo', child: Switch(value: activo ?? true, onChanged: onActivo)),
              ],
              if (onTap != null && onActivo == null) const Padding(padding: EdgeInsets.only(left: 4), child: Icon(Icons.chevron_right, color: SeimaColors.muted)),
            ],
          ),
        ),
      ),
    );
    final fila = Opacity(opacity: apagada ? 0.6 : 1, child: contenido);
    return onTap == null ? fila : TarjetaToque(onTap: onTap, semantica: titulo, child: fila);
  }
}

/// Cómo se ve una fila mientras se arrastra: crece un poco y levanta sombra.
Widget arrastrandoFila(Widget hijo, int indice, Animation<double> animacion) {
  return AnimatedBuilder(
    animation: animacion,
    builder: (context, child) {
      final t = Curves.easeOut.transform(animacion.value);
      return Transform.scale(
        scale: 1 + 0.03 * t,
        child: DecoratedBox(
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(18),
            boxShadow: [BoxShadow(color: const Color(0x38000000), blurRadius: 18 * t, offset: Offset(0, 6 * t))],
          ),
          child: child,
        ),
      );
    },
    child: hijo,
  );
}

/// Pide un texto en una hoja que sube desde abajo. Devuelve el texto (sin espacios de más) o null si se cancela.
Future<String?> pedirTexto(
  BuildContext context, {
  required String titulo,
  String? valorInicial,
  String? ayuda,
  String hint = '',
  int maxLength = 80,
  int maxLines = 1,
  String boton = 'Guardar',
}) {
  return showModalBottomSheet<String>(
    context: context,
    isScrollControlled: true,
    backgroundColor: SeimaColors.paper,
    showDragHandle: true,
    shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(28))),
    builder: (contexto) => _HojaTexto(titulo: titulo, valorInicial: valorInicial, ayuda: ayuda, hint: hint, maxLength: maxLength, maxLines: maxLines, boton: boton),
  );
}

class _HojaTexto extends StatefulWidget {
  const _HojaTexto({required this.titulo, required this.valorInicial, required this.ayuda, required this.hint, required this.maxLength, required this.maxLines, required this.boton});

  final String titulo;
  final String? valorInicial;
  final String? ayuda;
  final String hint;
  final int maxLength;
  final int maxLines;
  final String boton;

  @override
  State<_HojaTexto> createState() => _HojaTextoState();
}

class _HojaTextoState extends State<_HojaTexto> {
  late final _texto = TextEditingController(text: widget.valorInicial ?? '');

  @override
  void dispose() {
    _texto.dispose();
    super.dispose();
  }

  void _listo() {
    final limpio = _texto.text.trim();
    if (limpio.isEmpty) return;
    Navigator.pop(context, limpio);
  }

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: EdgeInsets.fromLTRB(24, 0, 24, 20 + MediaQuery.viewInsetsOf(context).bottom),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Text(widget.titulo, style: archivo(22, 850, width: 118, height: 1.12)),
          if (widget.ayuda != null) ...[
            const SizedBox(height: 6),
            Text(widget.ayuda!, style: archivo(15, 500, height: 1.3, color: SeimaColors.muted)),
          ],
          const SizedBox(height: 16),
          TextField(
            controller: _texto,
            autofocus: true,
            maxLength: widget.maxLength,
            maxLines: widget.maxLines,
            minLines: 1,
            textCapitalization: TextCapitalization.sentences,
            textInputAction: widget.maxLines == 1 ? TextInputAction.done : TextInputAction.newline,
            onSubmitted: widget.maxLines == 1 ? (_) => _listo() : null,
            style: archivo(18, 550),
            decoration: InputDecoration(hintText: widget.hint, counterText: ''),
          ),
          const SizedBox(height: 16),
          SeimaButton(label: widget.boton, onPressed: _listo),
        ],
      ),
    );
  }
}

/// «¿Seguro?» con dos botones claros. Devuelve true si se confirma.
Future<bool> confirmar(BuildContext context, {required String titulo, required String texto, required String boton, bool peligro = true}) async {
  final si = await showDialog<bool>(
    context: context,
    builder: (contexto) => AlertDialog(
      title: Text(titulo, style: archivo(22, 850, width: 112, height: 1.15)),
      content: Text(texto, style: archivo(17, 500, height: 1.35)),
      actions: [
        TextButton(onPressed: () => Navigator.pop(contexto, false), child: Text('Cancelar', style: archivo(17, 700))),
        TextButton(onPressed: () => Navigator.pop(contexto, true), child: Text(boton, style: archivo(17, 800, color: peligro ? SeimaColors.redText : SeimaColors.ink))),
      ],
    ),
  );
  return si == true;
}

/// Mensaje corto abajo de la pantalla.
void avisar(BuildContext context, String mensaje) {
  ScaffoldMessenger.of(context)
    ..hideCurrentSnackBar()
    ..showSnackBar(SnackBar(content: Text(mensaje)));
}
