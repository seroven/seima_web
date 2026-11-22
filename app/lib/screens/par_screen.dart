import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../projects/proyecto.dart';
import '../projects/proyectos_controller.dart';
import '../projects/vista_reglas.dart';
import '../theme/seima_colors.dart';
import '../router/volver.dart';
import '../theme/seima_theme.dart';
import '../widgets/deslizador.dart';
import '../widgets/seima_button.dart';
import '../widgets/tarjeta_portada.dart';

class ParScreen extends ConsumerStatefulWidget {
  const ParScreen.comparacion({super.key, required this.id}) : portada = false;
  const ParScreen.portada({super.key, required this.id}) : portada = true;

  final String id;
  final bool portada;

  @override
  ConsumerState<ParScreen> createState() => _ParScreenState();
}

class _ParScreenState extends ConsumerState<ParScreen> {
  String? _antes;
  String? _despues;
  var _inicio = false;
  var _guardando = false;
  String? _error;

  bool get _esPortada => widget.portada;

  String get _proyectoId => widget.id;

  @override
  Widget build(BuildContext context) {
    final proyecto = ref.watch(proyectoProvider(_proyectoId));
    return Scaffold(
      appBar: AppBar(leading: BackButton(onPressed: () => context.volver('/proyectos')), title: Text(_esPortada ? 'Portada' : 'Comparación')),
      body: proyecto.when(
        loading: () => const Center(child: CircularProgressIndicator(color: SeimaColors.red)),
        error: (error, _) => ListView(
          padding: const EdgeInsets.all(24),
          children: [Text(error.toString(), style: archivo(18, 500))],
        ),
        data: (dato) {
          _iniciar(dato);
          final antes = _elegibles(dato, 'antes');
          final despues = _elegibles(dato, 'despues');
          final elegidoAntes = _buscar(dato, 'antes', _antes);
          final elegidoDespues = _buscar(dato, 'despues', _despues);
          final porque = !_esPortada && elegidoAntes != null && elegidoDespues != null
              ? mensajeIncompatible(elegidoAntes, elegidoDespues)
              : null;
          return ListView(
            padding: const EdgeInsets.fromLTRB(16, 4, 16, 24),
            children: [
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 8),
                child: Text(
                  _esPortada ? 'La foto que se ve en el catálogo' : 'Elige uno de Antes y uno de Después',
                  style: archivo(26, 850, width: 118, height: 1.08),
                ),
              ),
              if (_esPortada && _propuesta(dato)) ...[
                const SizedBox(height: 10),
                DecoratedBox(
                  decoration: BoxDecoration(color: SeimaColors.paper2, borderRadius: BorderRadius.circular(16)),
                  child: Padding(
                    padding: const EdgeInsets.all(14),
                    child: Row(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Icon(Icons.lightbulb_outline),
                        const SizedBox(width: 12),
                        Expanded(child: Text('Te proponemos las mismas fotos de la comparación. Cámbialas si quieres.', style: archivo(16, 550, height: 1.3))),
                      ],
                    ),
                  ),
                ),
              ],
              const SizedBox(height: 20),
              if (elegidoAntes != null && elegidoDespues != null)
                _esPortada
                    ? TarjetaPortada(
                        antes: elegidoAntes.vista,
                        despues: elegidoDespues.vista,
                        proporcion: proporcionDe(elegidoDespues.ancho, elegidoDespues.alto),
                      )
                    : modoVista(elegidoAntes.ancho, elegidoAntes.alto) == 'deslizador' && porque == null
                    ? Deslizador(
                        antes: elegidoAntes.vista,
                        despues: elegidoDespues.vista,
                        proporcion: proporcionDe(elegidoDespues.ancho, elegidoDespues.alto),
                      )
                    : _Vista(antes: elegidoAntes, despues: elegidoDespues),
              if (porque != null) ...[
                const SizedBox(height: 12),
                Text(porque, style: archivo(18, 650, color: SeimaColors.redText, height: 1.3)),
              ],
              const SizedBox(height: 20),
              _Grupo(
                titulo: 'Antes',
                medios: antes,
                elegido: _antes,
                vacio: _esPortada ? 'No hay fotos listas en Antes.' : 'Primero sube algo en Antes.',
                onElegir: (id) => setState(() => _antes = id),
              ),
              const SizedBox(height: 20),
              _Grupo(
                titulo: 'Después',
                medios: despues,
                elegido: _despues,
                vacio: _esPortada ? 'No hay fotos listas en Después.' : 'Primero sube algo en Después.',
                onElegir: (id) => setState(() => _despues = id),
              ),
            ],
          );
        },
      ),
      bottomNavigationBar: proyecto.hasValue
          ? SafeArea(
              child: Padding(
                padding: const EdgeInsets.fromLTRB(16, 8, 16, 12),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    Aviso(_error),
                    SeimaButton(
                      label: _esPortada ? 'Guardar portada' : 'Guardar comparación',
                      icono: Icons.check,
                      busy: _guardando,
                      onPressed: _antes == null || _despues == null || _incompatible(proyecto.value!) ? null : _guardar,
                    ),
                  ],
                ),
              ),
            )
          : null,
    );
  }

  bool _incompatible(Proyecto dato) {
    if (_esPortada) return false;
    final a = _buscar(dato, 'antes', _antes);
    final d = _buscar(dato, 'despues', _despues);
    return a != null && d != null && mensajeIncompatible(a, d) != null;
  }

  void _iniciar(Proyecto dato) {
    if (_inicio) return;
    _inicio = true;
    if (_esPortada) {
      _antes = _idPortada(dato, 'antes');
      _despues = _idPortada(dato, 'despues');
      if (_antes == null && _despues == null) {
        final antes = _buscar(dato, 'antes', dato.comparadorAntes);
        final despues = _buscar(dato, 'despues', dato.comparadorDespues);
        if (antes?.tipo == 'foto' && despues?.tipo == 'foto' && antes!.listo && despues!.listo) {
          _antes = antes.id;
          _despues = despues.id;
        }
      }
      return;
    }
    _antes = dato.comparadorAntes;
    _despues = dato.comparadorDespues;
  }

  bool _propuesta(Proyecto dato) {
    if (!_esPortada) return false;
    if (_idPortada(dato, 'antes') != null || _idPortada(dato, 'despues') != null) return false;
    return _antes != null && _antes == dato.comparadorAntes && _despues == dato.comparadorDespues;
  }

  List<Medio> _elegibles(Proyecto dato, String etapa) {
    return dato.de(etapa).where((medio) {
      if (!medio.listo) return false;
      if (_esPortada && medio.tipo != 'foto') return false;
      return true;
    }).toList();
  }

  Future<void> _guardar() async {
    final antes = _antes;
    final despues = _despues;
    if (antes == null || despues == null) return;
    setState(() {
      _guardando = true;
      _error = null;
    });
    final notifier = ref.read(proyectoProvider(_proyectoId).notifier);
    final mensaje = _esPortada ? await notifier.guardarPortada(antes, despues) : await notifier.guardarComparador(antes, despues);
    if (!mounted) return;
    if (mensaje == null) {
      context.volver('/proyectos');
      return;
    }
    setState(() {
      _guardando = false;
      _error = mensaje;
    });
  }
}

class _Grupo extends StatelessWidget {
  const _Grupo({
    required this.titulo,
    required this.medios,
    required this.elegido,
    required this.vacio,
    required this.onElegir,
  });

  final String titulo;
  final List<Medio> medios;
  final String? elegido;
  final String vacio;
  final ValueChanged<String> onElegir;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Padding(
          padding: const EdgeInsets.only(left: 8, bottom: 10),
          child: Text(titulo.toUpperCase(), style: archivo(14, 800, width: 112, height: 1.1, color: SeimaColors.muted).copyWith(letterSpacing: 1.2)),
        ),
        if (medios.isEmpty)
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 8),
            child: Text(vacio, style: archivo(17, 550, height: 1.3, color: SeimaColors.muted)),
          )
        else
          LayoutBuilder(
            builder: (context, caja) {
              final lado = (caja.maxWidth - 20) / 3;
              return Wrap(
                spacing: 10,
                runSpacing: 10,
                children: [
                  for (final medio in medios)
                    _Mini(
                      lado: lado,
                      medio: medio,
                      activo: medio.id == elegido,
                      onTap: () => onElegir(medio.id),
                    ),
                ],
              );
            },
          ),
      ],
    );
  }
}

class _Mini extends StatelessWidget {
  const _Mini({required this.lado, required this.medio, required this.activo, required this.onTap});

  final double lado;
  final Medio medio;
  final bool activo;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Semantics(
      button: true,
      selected: activo,
      label: medio.tipo == 'video' ? 'Video' : 'Foto',
      child: GestureDetector(
        onTap: onTap,
        child: AnimatedContainer(
          duration: const Duration(milliseconds: 160),
          width: lado,
          height: lado,
          // El marco rojo solo aparece en la elegida.
          padding: EdgeInsets.all(activo ? 4 : 0),
          decoration: BoxDecoration(color: activo ? SeimaColors.red : Colors.transparent, borderRadius: BorderRadius.circular(18)),
          child: ClipRRect(
            borderRadius: BorderRadius.circular(activo ? 14 : 18),
            child: Stack(
              fit: StackFit.expand,
              children: [
                medio.vista.isEmpty
                    ? const ColoredBox(color: SeimaColors.ink3)
                    : Image.network(medio.vista, fit: BoxFit.cover, errorBuilder: (_, _, _) => const ColoredBox(color: SeimaColors.ink3)),
                if (medio.tipo == 'video')
                  const Align(
                    alignment: Alignment.bottomLeft,
                    child: Padding(
                      padding: EdgeInsets.all(6),
                      child: DecoratedBox(
                        decoration: BoxDecoration(color: Color(0x990E0E0E), shape: BoxShape.circle),
                        child: Padding(padding: EdgeInsets.all(3), child: Icon(Icons.play_arrow, color: Colors.white, size: 22)),
                      ),
                    ),
                  ),
                if (activo)
                  const Align(
                    alignment: Alignment.topRight,
                    child: Padding(
                      padding: EdgeInsets.all(6),
                      child: DecoratedBox(
                        decoration: BoxDecoration(color: SeimaColors.red, shape: BoxShape.circle),
                        child: Padding(padding: EdgeInsets.all(3), child: Icon(Icons.check, color: Colors.white, size: 20)),
                      ),
                    ),
                  ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class _Vista extends StatelessWidget {
  const _Vista({required this.antes, required this.despues});

  final Medio antes;
  final Medio despues;

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Expanded(child: _Lado(titulo: 'Antes', medio: antes)),
        const SizedBox(width: 8),
        Expanded(child: _Lado(titulo: 'Después', medio: despues)),
      ],
    );
  }
}

class _Lado extends StatelessWidget {
  const _Lado({required this.titulo, required this.medio});

  final String titulo;
  final Medio medio;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(titulo, style: archivo(16, 700)),
        const SizedBox(height: 6),
        ClipRRect(
          borderRadius: BorderRadius.circular(14),
          child: AspectRatio(
            aspectRatio: 1,
            child: medio.vista.isEmpty
                ? const ColoredBox(color: SeimaColors.paper2)
                : Image.network(medio.vista, fit: BoxFit.cover, errorBuilder: (_, _, _) => const ColoredBox(color: SeimaColors.paper2)),
          ),
        ),
      ],
    );
  }
}

Medio? _buscar(Proyecto proyecto, String etapa, String? id) {
  if (id == null) return null;
  for (final medio in proyecto.de(etapa)) {
    if (medio.id == id) return medio;
  }
  return null;
}

String? _idPortada(Proyecto proyecto, String etapa) {
  for (final medio in proyecto.de(etapa)) {
    if (medio.esPortada && medio.tipo == 'foto' && medio.listo) return medio.id;
  }
  return null;
}
