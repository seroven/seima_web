import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../projects/proyecto.dart';
import '../projects/proyectos_controller.dart';
import '../theme/seima_colors.dart';
import '../theme/seima_theme.dart';
import '../widgets/seima_button.dart';

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
      appBar: AppBar(title: Text(_esPortada ? 'Portada' : 'Comparación')),
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
            padding: const EdgeInsets.fromLTRB(24, 8, 24, 32),
            children: [
              Text(
                _esPortada ? 'La foto que se ve en el catálogo.' : 'Elige uno de Antes y uno de Después.',
                style: archivo(22, 800, width: 118, height: 1.15),
              ),
              if (_esPortada && _propuesta(dato)) ...[
                const SizedBox(height: 8),
                Text('Te proponemos las fotos de la comparación.', style: archivo(16, 500, color: SeimaColors.muted)),
              ],
              const SizedBox(height: 20),
              if (elegidoAntes != null && elegidoDespues != null) _Vista(antes: elegidoAntes, despues: elegidoDespues),
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
              const SizedBox(height: 20),
              Aviso(_error),
              SeimaButton(
                label: _esPortada ? 'Guardar portada' : 'Guardar comparación',
                busy: _guardando,
                onPressed: _antes == null || _despues == null || porque != null ? null : _guardar,
              ),
            ],
          );
        },
      ),
    );
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
      context.pop();
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
        Text(titulo, style: archivo(20, 800, width: 112, height: 1.1)),
        const SizedBox(height: 10),
        if (medios.isEmpty)
          Text(vacio, style: archivo(16, 500, color: SeimaColors.muted))
        else
          Wrap(
            spacing: 10,
            runSpacing: 10,
            children: [
              for (final medio in medios)
                _Mini(
                  medio: medio,
                  activo: medio.id == elegido,
                  onTap: () => onElegir(medio.id),
                ),
            ],
          ),
      ],
    );
  }
}

class _Mini extends StatelessWidget {
  const _Mini({required this.medio, required this.activo, required this.onTap});

  final Medio medio;
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
        child: SizedBox(
          width: 104,
          height: 104,
          child: Stack(
            fit: StackFit.expand,
            children: [
              ClipRRect(
                borderRadius: BorderRadius.circular(14),
                child: medio.vista.isEmpty
                    ? const ColoredBox(color: SeimaColors.paper2)
                    : Image.network(medio.vista, fit: BoxFit.cover, errorBuilder: (_, _, _) => const ColoredBox(color: SeimaColors.paper2)),
              ),
              if (medio.tipo == 'video')
                const Align(alignment: Alignment.bottomLeft, child: Padding(padding: EdgeInsets.all(6), child: Icon(Icons.play_arrow, color: Colors.white))),
              if (activo) const Align(alignment: Alignment.topRight, child: Padding(padding: EdgeInsets.all(6), child: Icon(Icons.check_circle, color: Colors.white))),
            ],
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
