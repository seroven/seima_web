import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:image_picker/image_picker.dart';

import '../projects/proyecto.dart';
import '../projects/proyectos_controller.dart';
import '../theme/seima_colors.dart';
import '../theme/seima_theme.dart';
import '../widgets/seima_button.dart';

class EtapaScreen extends ConsumerStatefulWidget {
  const EtapaScreen({super.key, required this.id, required this.etapa});

  final String id;
  final String etapa;

  @override
  ConsumerState<EtapaScreen> createState() => _EtapaScreenState();
}

class _EtapaScreenState extends ConsumerState<EtapaScreen> {
  final _picker = ImagePicker();
  var _subiendo = 0;
  var _total = 0;
  String? _error;

  @override
  Widget build(BuildContext context) {
    final proyecto = ref.watch(proyectoProvider(widget.id));
    final ocupado = _subiendo > 0;
    return Scaffold(
      appBar: AppBar(title: Text(nombreEtapa(widget.etapa))),
      body: proyecto.when(
        loading: () => const Center(child: CircularProgressIndicator(color: SeimaColors.red)),
        error: (error, _) => ListView(
          padding: const EdgeInsets.all(24),
          children: [Text(error.toString(), style: archivo(18, 500))],
        ),
        data: (dato) {
          final medios = dato.de(widget.etapa);
          return ListView(
            padding: const EdgeInsets.fromLTRB(24, 8, 24, 32),
            children: [
              Text('Fotos de ${nombreEtapa(widget.etapa)}', style: archivo(28, 800, width: 118, height: 1.05)),
              const SizedBox(height: 8),
              Text('Los videos se agregan en el siguiente paso.', style: archivo(16, 500, color: SeimaColors.muted)),
              const SizedBox(height: 16),
              if (ocupado)
                Padding(
                  padding: const EdgeInsets.only(bottom: 12),
                  child: Text('Subiendo $_subiendo de $_total', style: archivo(18, 700, color: SeimaColors.redText)),
                ),
              Aviso(_error),
              SeimaButton(label: 'Elegir de la galería', busy: ocupado, onPressed: ocupado ? null : _galeria),
              const SizedBox(height: 10),
              SeimaButton(label: 'Tomar ahora', ink: true, onPressed: ocupado ? null : _camara),
              const SizedBox(height: 20),
              for (var i = 0; i < medios.length; i++)
                _FilaMedio(
                  medio: medios[i],
                  puedeSubir: i > 0,
                  puedeBajar: i < medios.length - 1,
                  onQuitar: () => _quitar(medios[i].id),
                  onSubir: () => _mover(medios, i, -1),
                  onBajar: () => _mover(medios, i, 1),
                ),
            ],
          );
        },
      ),
    );
  }

  Future<void> _galeria() async {
    final fotos = await _picker.pickMultiImage(imageQuality: 85, maxWidth: 2000, maxHeight: 2000);
    if (fotos.isEmpty) return;
    await _subir(fotos);
  }

  Future<void> _camara() async {
    final foto = await _picker.pickImage(source: ImageSource.camera, imageQuality: 85, maxWidth: 2000, maxHeight: 2000);
    if (foto == null) return;
    await _subir([foto]);
  }

  Future<void> _subir(List<XFile> fotos) async {
    setState(() {
      _total = fotos.length;
      _subiendo = 1;
      _error = null;
    });
    for (var i = 0; i < fotos.length; i++) {
      setState(() => _subiendo = i + 1);
      final bytes = await fotos[i].readAsBytes();
      final mensaje = await ref.read(proyectoProvider(widget.id).notifier).subirFoto(
        etapa: widget.etapa,
        bytes: bytes,
        nombre: fotos[i].name.isEmpty ? 'foto.jpg' : fotos[i].name,
      );
      if (mensaje != null) {
        if (mounted) {
          setState(() {
            _error = mensaje;
            _subiendo = 0;
          });
        }
        return;
      }
    }
    if (mounted) setState(() => _subiendo = 0);
  }

  Future<void> _quitar(String medioId) async {
    final mensaje = await ref.read(proyectoProvider(widget.id).notifier).quitarMedio(medioId);
    if (mensaje != null && mounted) setState(() => _error = mensaje);
  }

  Future<void> _mover(List<Medio> medios, int indice, int delta) async {
    final ids = medios.map((m) => m.id).toList();
    final otro = indice + delta;
    final actual = ids[indice];
    ids[indice] = ids[otro];
    ids[otro] = actual;
    final mensaje = await ref.read(proyectoProvider(widget.id).notifier).reordenar(widget.etapa, ids);
    if (mensaje != null && mounted) setState(() => _error = mensaje);
  }
}

class _FilaMedio extends StatelessWidget {
  const _FilaMedio({
    required this.medio,
    required this.puedeSubir,
    required this.puedeBajar,
    required this.onQuitar,
    required this.onSubir,
    required this.onBajar,
  });

  final Medio medio;
  final bool puedeSubir;
  final bool puedeBajar;
  final VoidCallback onQuitar;
  final VoidCallback onSubir;
  final VoidCallback onBajar;

  @override
  Widget build(BuildContext context) {
    final estado = medio.estado == 'subiendo' ? 'Subiendo' : (medio.listo ? 'Listo' : 'No se pudo');
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: Row(
        children: [
          ClipRRect(
            borderRadius: BorderRadius.circular(10),
            child: SizedBox(
              width: 72,
              height: 72,
              child: medio.vista.isEmpty
                  ? const ColoredBox(color: SeimaColors.paper2)
                  : Image.network(medio.vista, fit: BoxFit.cover, errorBuilder: (_, _, _) => const ColoredBox(color: SeimaColors.paper2)),
            ),
          ),
          const SizedBox(width: 12),
          Expanded(child: Text(estado, style: archivo(18, 650))),
          IconButton(tooltip: 'Subir', onPressed: puedeSubir ? onSubir : null, icon: const Icon(Icons.arrow_upward)),
          IconButton(tooltip: 'Bajar', onPressed: puedeBajar ? onBajar : null, icon: const Icon(Icons.arrow_downward)),
          IconButton(tooltip: 'Quitar', onPressed: onQuitar, icon: const Icon(Icons.close)),
        ],
      ),
    );
  }
}
