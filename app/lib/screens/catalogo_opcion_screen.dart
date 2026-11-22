import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../catalogo/catalogo_controller.dart';
import '../theme/seima_colors.dart';
import '../theme/seima_theme.dart';
import '../widgets/elecciones.dart';
import '../widgets/seima_button.dart';

/// Crear o editar una opción de una pregunta: su texto, una descripción y si pide un dato más.
class OpcionScreen extends ConsumerStatefulWidget {
  const OpcionScreen({super.key, required this.preguntaId, this.opcionId});

  final String preguntaId;
  final String? opcionId;

  @override
  ConsumerState<OpcionScreen> createState() => _OpcionScreenState();
}

class _OpcionScreenState extends ConsumerState<OpcionScreen> {
  final _etiqueta = TextEditingController();
  final _descripcion = TextEditingController();
  final _ayuda = TextEditingController();
  var _entrada = 'ninguna';
  var _enviando = false;
  String? _error;

  bool get _editando => widget.opcionId != null;

  @override
  void initState() {
    super.initState();
    final pregunta = ref.read(preguntasCotProvider).value?.where((p) => p.id == widget.preguntaId).firstOrNull;
    final opcion = pregunta?.opciones.where((o) => o.id == widget.opcionId).firstOrNull;
    if (opcion != null) {
      _etiqueta.text = opcion.etiqueta;
      _descripcion.text = opcion.descripcion ?? '';
      _ayuda.text = opcion.entradaAyuda ?? '';
      _entrada = opcion.tipoEntrada;
    }
  }

  @override
  void dispose() {
    _etiqueta.dispose();
    _descripcion.dispose();
    _ayuda.dispose();
    super.dispose();
  }

  Future<void> _guardar() async {
    final etiqueta = _etiqueta.text.trim();
    if (etiqueta.isEmpty) {
      setState(() => _error = 'Escribe la opción');
      return;
    }
    setState(() {
      _enviando = true;
      _error = null;
    });
    final notifier = ref.read(preguntasCotProvider.notifier);
    final descripcion = _descripcion.text.trim();
    final ayuda = _entrada == 'ninguna' ? '' : _ayuda.text.trim();
    final error = _editando
        ? await notifier.cambiarOpcion(widget.opcionId!, etiqueta: etiqueta, descripcion: descripcion, tipoEntrada: _entrada, entradaAyuda: ayuda)
        : await notifier.crearOpcion(widget.preguntaId, etiqueta: etiqueta, descripcion: descripcion, tipoEntrada: _entrada, entradaAyuda: ayuda);
    if (!mounted) return;
    if (error == null) {
      context.pop();
      return;
    }
    setState(() {
      _enviando = false;
      _error = error;
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: Text(_editando ? 'Editar opción' : 'Nueva opción')),
      body: ListView(
        padding: const EdgeInsets.fromLTRB(24, 8, 24, 24),
        children: [
          SeccionForm(
            titulo: 'La opción',
            ayuda: 'Lo que el cliente toca. Ej: Granito o formato grande',
            hijo: TextField(
              controller: _etiqueta,
              autofocus: !_editando,
              maxLength: 80,
              textCapitalization: TextCapitalization.sentences,
              style: archivo(18, 550),
              decoration: const InputDecoration(hintText: 'Opción', counterText: ''),
            ),
          ),
          SeccionForm(
            titulo: 'Una explicación (opcional)',
            ayuda: 'Si TODAS las opciones de la pregunta llevan explicación, se ven como tarjetas en vez de botones.',
            hijo: TextField(
              controller: _descripcion,
              maxLength: 160,
              minLines: 1,
              maxLines: 3,
              textCapitalization: TextCapitalization.sentences,
              style: archivo(18, 550),
              decoration: const InputDecoration(hintText: 'Ej: Piezas grandes, más premium', counterText: ''),
            ),
          ),
          SeccionForm(
            titulo: '¿Pide un dato más?',
            ayuda: 'Por ejemplo «Otro» pide escribir cuál, y «Sé el área» pide los m².',
            hijo: Column(
              children: [
                Row(
                  children: [
                    Expanded(child: TarjetaEleccion(texto: 'No', icono: Icons.block, activo: _entrada == 'ninguna', onTap: () => setState(() => _entrada = 'ninguna'))),
                    const SizedBox(width: 10),
                    Expanded(child: TarjetaEleccion(texto: 'Un texto', icono: Icons.text_fields, activo: _entrada == 'texto', onTap: () => setState(() => _entrada = 'texto'))),
                    const SizedBox(width: 10),
                    Expanded(child: TarjetaEleccion(texto: 'Un número', icono: Icons.pin_outlined, activo: _entrada == 'numero', onTap: () => setState(() => _entrada = 'numero'))),
                  ],
                ),
                if (_entrada != 'ninguna') ...[
                  const SizedBox(height: 12),
                  TextField(
                    controller: _ayuda,
                    maxLength: 60,
                    style: archivo(18, 550),
                    decoration: InputDecoration(hintText: _entrada == 'texto' ? 'Texto de ayuda. Ej: ¿Cuál?' : 'Unidad. Ej: m²', counterText: ''),
                  ),
                ],
              ],
            ),
          ),
          if (_error != null) Padding(padding: const EdgeInsets.only(bottom: 14), child: Text(_error!, style: archivo(16, 650, height: 1.3, color: SeimaColors.redText))),
          SeimaButton(label: _editando ? 'Guardar' : 'Agregar opción', busy: _enviando, onPressed: _guardar),
        ],
      ),
    );
  }
}
