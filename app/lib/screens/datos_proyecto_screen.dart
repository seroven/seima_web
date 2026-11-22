import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../api/api_error.dart';
import '../projects/proyecto.dart';
import '../projects/proyectos_api.dart';
import '../projects/proyectos_controller.dart';
import '../theme/seima_colors.dart';
import '../router/volver.dart';
import '../theme/seima_theme.dart';
import '../widgets/elecciones.dart';
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
  // En el orden en que se fueron marcando; la API las ordena según el catálogo.
  final _categorias = <String>{};
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
      appBar: AppBar(leading: BackButton(onPressed: () => context.volver('/proyectos')), title: Text(_editando ? 'Datos del proyecto' : 'Nuevo proyecto')),
      body: ListView(
        padding: const EdgeInsets.fromLTRB(24, 8, 24, 24),
        children: [
          SeccionForm(
            titulo: '¿Cómo se llama la obra?',
            ayuda: 'Por ejemplo: Cocina en Miraflores',
            hijo: TextField(
              controller: _titulo,
              style: archivo(18, 550),
              textCapitalization: TextCapitalization.sentences,
              decoration: const InputDecoration(hintText: 'Nombre de la obra', prefixIcon: Icon(Icons.edit_outlined)),
            ),
          ),
          SeccionForm(
            titulo: 'Tipo de trabajo',
            ayuda: 'Elige uno o más (hasta $maxCategorias). Por ejemplo: cocina y melamina.',
            hijo: categorias.when(
              loading: () => const LinearProgressIndicator(color: SeimaColors.red),
              error: (error, _) => Text(error.toString(), style: archivo(16, 600, color: SeimaColors.redText)),
              data: (opciones) => opciones.isEmpty
                  ? Text('Todavía no hay tipos de trabajo cargados.', style: archivo(17, 600, color: SeimaColors.redText))
                  : LayoutBuilder(
                      builder: (context, caja) {
                        final ancho = (caja.maxWidth - 10) / 2;
                        return Wrap(
                          spacing: 10,
                          runSpacing: 10,
                          children: [
                            for (final opcion in opciones)
                              SizedBox(
                                width: ancho,
                                child: TarjetaEleccion(
                                  texto: opcion.nombre,
                                  icono: iconoDeCategoria(opcion.slug),
                                  activo: _categorias.contains(opcion.slug),
                                  onTap: () => _marcarCategoria(opcion.slug),
                                ),
                              ),
                          ],
                        );
                      },
                    ),
            ),
          ),
          SeccionForm(
            titulo: '¿Dónde queda?',
            hijo: TextField(
              controller: _distrito,
              style: archivo(18, 550),
              textCapitalization: TextCapitalization.words,
              decoration: const InputDecoration(hintText: 'Distrito', prefixIcon: Icon(Icons.place_outlined)),
            ),
          ),
          SeccionForm(
            titulo: '¿Para quién es?',
            hijo: Row(
              children: [
                Expanded(
                  child: TarjetaEleccion(
                    texto: 'Persona',
                    icono: Icons.person_outline,
                    activo: _cliente == 'persona',
                    onTap: () => setState(() => _cliente = 'persona'),
                  ),
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: TarjetaEleccion(
                    texto: 'Empresa',
                    icono: Icons.business,
                    activo: _cliente == 'empresa',
                    onTap: () => setState(() => _cliente = 'empresa'),
                  ),
                ),
              ],
            ),
          ),
          SeccionForm(
            titulo: 'Medidas',
            ayuda: 'Si las tienes. Puedes dejarlo en blanco.',
            hijo: Row(
              children: [
                Expanded(
                  child: TextField(
                    controller: _area,
                    keyboardType: const TextInputType.numberWithOptions(decimal: true),
                    style: archivo(18, 550),
                    decoration: const InputDecoration(hintText: 'Área m²'),
                  ),
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: TextField(
                    controller: _dias,
                    keyboardType: TextInputType.number,
                    inputFormatters: [FilteringTextInputFormatter.digitsOnly],
                    style: archivo(18, 550),
                    decoration: const InputDecoration(hintText: 'Días de obra'),
                  ),
                ),
              ],
            ),
          ),
          servicios.maybeWhen(
            data: (opciones) => opciones.isEmpty
                ? const SizedBox.shrink()
                : SeccionForm(
                    titulo: 'Servicios',
                    ayuda: 'Marca todos los que hiciste',
                    hijo: Wrap(
                      spacing: 8,
                      runSpacing: 8,
                      children: [
                        for (final opcion in opciones)
                          ChipEleccion(
                            texto: opcion.nombre,
                            activo: _servicios.contains(opcion.nombre),
                            onTap: () => setState(() {
                              if (!_servicios.add(opcion.nombre)) _servicios.remove(opcion.nombre);
                            }),
                          ),
                      ],
                    ),
                  ),
            orElse: () => const SizedBox.shrink(),
          ),
          SeccionForm(
            titulo: 'Cuéntala en pocas líneas',
            ayuda: 'Qué se hizo y cómo quedó. Puedes dictarlo con el micrófono del teclado.',
            hijo: TextField(
              controller: _descripcion,
              minLines: 4,
              maxLines: 8,
              style: archivo(18, 500),
              textCapitalization: TextCapitalization.sentences,
              decoration: const InputDecoration(hintText: 'Descripción'),
            ),
          ),
        ],
      ),
      // El botón siempre a la vista: no hay que bajar hasta el final para guardar.
      bottomNavigationBar: SafeArea(
        child: Padding(
          padding: const EdgeInsets.fromLTRB(16, 8, 16, 12),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Aviso(_error),
              SeimaButton(label: _editando ? 'Guardar' : 'Crear borrador', busy: _enviando, onPressed: _enviar),
            ],
          ),
        ),
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
        _categorias
          ..clear()
          ..addAll(proyecto.categoriaSlugs);
        _cliente = proyecto.cliente;
        _servicios
          ..clear()
          ..addAll(proyecto.servicios);
      });
    });
  }

  /// Marca o desmarca un tipo de trabajo. Si ya hay [maxCategorias], avisa en vez de dejar pasar uno más.
  void _marcarCategoria(String slug) {
    setState(() {
      if (_categorias.remove(slug)) {
        _error = null;
        return;
      }
      if (_categorias.length >= maxCategorias) {
        _error = 'Máximo $maxCategorias tipos de trabajo. Quita uno para elegir otro.';
        return;
      }
      _categorias.add(slug);
      _error = null;
    });
  }

  Future<void> _enviar() async {
    final titulo = _titulo.text.trim();
    if (titulo.length < 2) {
      setState(() => _error = 'Escribe el nombre de la obra');
      return;
    }
    if (_categorias.isEmpty) {
      setState(() => _error = 'Elige al menos un tipo de trabajo');
      return;
    }
    final area = _leerArea();
    if (_area.text.trim().isNotEmpty && area == null) {
      setState(() => _error = 'El área tiene que ser un número');
      return;
    }
    final datos = <String, dynamic>{
      'titulo': titulo,
      'categorias': _categorias.toList(),
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
        context.volver('/proyecto/${widget.id}');
      } else {
        // Reemplaza esta pantalla por la ficha de la obra: la lista de proyectos queda debajo y «volver» regresa a ella.
        context.pushReplacement('/proyecto/${proyecto.id}');
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

