import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../api/api_error.dart';
import '../projects/proyecto.dart';
import '../projects/proyectos_api.dart';
import '../projects/proyectos_controller.dart';
import '../theme/seima_colors.dart';
import '../theme/seima_theme.dart';
import '../widgets/seima_button.dart';

class DatosProyectoScreen extends ConsumerStatefulWidget {
  const DatosProyectoScreen({super.key, this.id});

  final String? id;

  @override
  ConsumerState<DatosProyectoScreen> createState() => _DatosProyectoScreenState();
}

class _DatosProyectoScreenState extends ConsumerState<DatosProyectoScreen> {
  final _titulo = TextEditingController();
  final _distrito = TextEditingController();
  final _area = TextEditingController();
  final _dias = TextEditingController();
  final _descripcion = TextEditingController();
  String? _categoria;
  String _cliente = 'persona';
  final _servicios = <String>{};
  var _listo = false;
  var _enviando = false;
  String? _error;

  bool get _editando => widget.id != null;

  @override
  void dispose() {
    _titulo.dispose();
    _distrito.dispose();
    _area.dispose();
    _dias.dispose();
    _descripcion.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final categorias = ref.watch(categoriasProvider);
    final servicios = ref.watch(serviciosProvider);
    if (_editando && !_listo) {
      ref.watch(proyectoProvider(widget.id!)).whenData(_rellenar);
    }

    return Scaffold(
      appBar: AppBar(title: Text(_editando ? 'Datos' : 'Nuevo proyecto')),
      body: ListView(
        padding: const EdgeInsets.fromLTRB(24, 8, 24, 32),
        children: [
          Text('¿Cómo se llama la obra?', style: archivo(22, 800, width: 118, height: 1.15)),
          const SizedBox(height: 12),
          TextField(controller: _titulo, style: archivo(18, 550), textCapitalization: TextCapitalization.sentences, decoration: const InputDecoration(hintText: 'Nombre')),
          const SizedBox(height: 28),
          Text('Tipo de trabajo', style: archivo(22, 800, width: 118, height: 1.15)),
          const SizedBox(height: 12),
          categorias.when(
            loading: () => const LinearProgressIndicator(color: SeimaColors.red),
            error: (error, _) => Text(error.toString(), style: archivo(16, 600, color: SeimaColors.redText)),
            data: (opciones) => Wrap(
              spacing: 8,
              runSpacing: 8,
              children: [
                for (final opcion in opciones)
                  _Eleccion(
                    texto: opcion.nombre,
                    activo: _categoria == opcion.slug,
                    onTap: () => setState(() => _categoria = opcion.slug),
                  ),
              ],
            ),
          ),
          const SizedBox(height: 28),
          Text('¿Dónde queda?', style: archivo(22, 800, width: 118, height: 1.15)),
          const SizedBox(height: 12),
          TextField(controller: _distrito, style: archivo(18, 550), textCapitalization: TextCapitalization.words, decoration: const InputDecoration(hintText: 'Distrito')),
          const SizedBox(height: 28),
          Text('¿Para quién es?', style: archivo(22, 800, width: 118, height: 1.15)),
          const SizedBox(height: 12),
          Row(
            children: [
              Expanded(child: _Eleccion(texto: 'Persona', activo: _cliente == 'persona', onTap: () => setState(() => _cliente = 'persona'))),
              const SizedBox(width: 8),
              Expanded(child: _Eleccion(texto: 'Empresa', activo: _cliente == 'empresa', onTap: () => setState(() => _cliente = 'empresa'))),
            ],
          ),
          const SizedBox(height: 28),
          Text('Medidas, si las tienes', style: archivo(22, 800, width: 118, height: 1.15)),
          const SizedBox(height: 12),
          Row(
            children: [
              Expanded(
                child: TextField(
                  controller: _area,
                  keyboardType: const TextInputType.numberWithOptions(decimal: true),
                  style: archivo(18, 550),
                  decoration: const InputDecoration(hintText: 'Área m²'),
                ),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: TextField(
                  controller: _dias,
                  keyboardType: TextInputType.number,
                  inputFormatters: [FilteringTextInputFormatter.digitsOnly],
                  style: archivo(18, 550),
                  decoration: const InputDecoration(hintText: 'Días'),
                ),
              ),
            ],
          ),
          const SizedBox(height: 28),
          Text('Servicios', style: archivo(22, 800, width: 118, height: 1.15)),
          const SizedBox(height: 12),
          servicios.when(
            loading: () => const SizedBox.shrink(),
            error: (_, _) => const SizedBox.shrink(),
            data: (opciones) => Wrap(
              spacing: 8,
              runSpacing: 8,
              children: [
                for (final opcion in opciones)
                  _Eleccion(
                    texto: opcion.nombre,
                    activo: _servicios.contains(opcion.nombre),
                    onTap: () => setState(() {
                      if (!_servicios.add(opcion.nombre)) _servicios.remove(opcion.nombre);
                    }),
                  ),
              ],
            ),
          ),
          const SizedBox(height: 28),
          Text('Cuéntala en pocas líneas', style: archivo(22, 800, width: 118, height: 1.15)),
          const SizedBox(height: 12),
          TextField(
            controller: _descripcion,
            minLines: 3,
            maxLines: 6,
            style: archivo(18, 500),
            textCapitalization: TextCapitalization.sentences,
            decoration: const InputDecoration(hintText: 'Descripción'),
          ),
          const SizedBox(height: 20),
          Aviso(_error),
          SeimaButton(label: _editando ? 'Guardar' : 'Crear borrador', busy: _enviando, onPressed: _enviar),
        ],
      ),
    );
  }

  void _rellenar(Proyecto proyecto) {
    if (_listo) return;
    _listo = true;
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!mounted) return;
      setState(() {
        _titulo.text = proyecto.titulo;
        _distrito.text = proyecto.distrito ?? '';
        _area.text = proyecto.areaM2 == null ? '' : _numero(proyecto.areaM2!);
        _dias.text = proyecto.dias?.toString() ?? '';
        _descripcion.text = proyecto.descripcion;
        _categoria = proyecto.categoriaSlug;
        _cliente = proyecto.cliente;
        _servicios
          ..clear()
          ..addAll(proyecto.servicios);
      });
    });
  }

  Future<void> _enviar() async {
    final titulo = _titulo.text.trim();
    if (titulo.length < 2) {
      setState(() => _error = 'Escribe el nombre de la obra');
      return;
    }
    if (_categoria == null) {
      setState(() => _error = 'Elige el tipo de trabajo');
      return;
    }
    final area = _leerArea();
    if (_area.text.trim().isNotEmpty && area == null) {
      setState(() => _error = 'El área tiene que ser un número');
      return;
    }
    final datos = <String, dynamic>{
      'titulo': titulo,
      'categoria': _categoria,
      'cliente': _cliente,
      'servicios': _servicios.toList(),
      'descripcion': _descripcion.text.trim(),
      'distrito': _distrito.text.trim(),
      'areaM2': area,
      'dias': int.tryParse(_dias.text.trim()),
    };
    setState(() {
      _enviando = true;
      _error = null;
    });
    try {
      final api = ref.read(proyectosApiProvider);
      final proyecto = _editando ? await api.actualizar(widget.id!, datos) : await api.crear(datos);
      ref.invalidate(proyectosListaProvider);
      if (_editando) ref.invalidate(proyectoProvider(widget.id!));
      if (!mounted) return;
      if (_editando) {
        context.pop();
      } else {
        context.go('/proyecto/${proyecto.id}');
      }
    } on ApiException catch (error) {
      if (mounted) setState(() => _error = error.message);
    } finally {
      if (mounted) setState(() => _enviando = false);
    }
  }

  double? _leerArea() {
    final texto = _area.text.trim().replaceAll(',', '.');
    if (texto.isEmpty) return null;
    final valor = double.tryParse(texto);
    if (valor == null || valor <= 0) return null;
    return valor;
  }

  String _numero(double valor) {
    if (valor == valor.roundToDouble()) return valor.toInt().toString();
    return valor.toString();
  }
}

class _Eleccion extends StatelessWidget {
  const _Eleccion({required this.texto, required this.activo, required this.onTap});

  final String texto;
  final bool activo;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: activo ? SeimaColors.ink : SeimaColors.paper2,
      borderRadius: BorderRadius.circular(14),
      child: InkWell(
        borderRadius: BorderRadius.circular(14),
        onTap: onTap,
        child: ConstrainedBox(
          constraints: const BoxConstraints(minHeight: 56),
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
            child: Text(texto, style: archivo(18, 650, color: activo ? Colors.white : SeimaColors.ink)),
          ),
        ),
      ),
    );
  }
}
