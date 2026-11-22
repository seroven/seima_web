import 'dart:io';

import 'package:connectivity_plus/connectivity_plus.dart';
import 'package:flutter/material.dart';
import '../router/volver.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:image_picker/image_picker.dart';
import 'package:video_player/video_player.dart';

import '../projects/cola_controller.dart';
import '../projects/cola_videos.dart';
import '../projects/proyecto.dart';
import '../projects/proyectos_controller.dart';
import '../projects/video_nativo.dart';
import '../projects/video_reglas.dart';
import 'recorte_screen.dart';
import '../settings/ajustes_locales.dart';
import '../theme/seima_colors.dart';
import '../theme/seima_theme.dart';
import '../widgets/capas_marca.dart';
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
  var _hayWifi = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    _mirarRed();
  }

  @override
  Widget build(BuildContext context) {
    final proyecto = ref.watch(proyectoProvider(widget.id));
    final ocupado = _subiendo > 0;
    return Scaffold(
      appBar: AppBar(leading: BackButton(onPressed: () => context.volver('/proyectos')), title: Text(nombreEtapa(widget.etapa))),
      body: proyecto.when(
        loading: () => const Center(child: CircularProgressIndicator(color: SeimaColors.red)),
        error: (error, _) => ListView(
          padding: const EdgeInsets.all(24),
          children: [Text(error.toString(), style: archivo(18, 500))],
        ),
        data: (dato) {
          final medios = dato.de(widget.etapa);
          final cola = ref.watch(colaProvider).value ?? const <PendienteVideo>[];
          final mios = cola.where((item) => item.projectId == widget.id && item.etapa == widget.etapa).toList();
          final progreso = textoProgreso(mios);
          final soloWifi = ref.watch(videosWifiProvider).value ?? true;
          return ListView(
            padding: const EdgeInsets.fromLTRB(16, 4, 16, 40),
            children: [
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 8),
                child: Text('Fotos y videos del ${nombreEtapa(widget.etapa)}', style: archivo(28, 850, width: 118, height: 1.06)),
              ),
              const SizedBox(height: 14),
              _Consejo(soloWifi: soloWifi),
              const SizedBox(height: 18),
              if (ocupado) _Progreso(texto: 'Subiendo $_subiendo de $_total', valor: _total == 0 ? null : (_subiendo - 1) / _total),
              if (progreso != null) _Progreso(texto: progreso),
              Aviso(_error),
              SeimaButton(label: 'Elegir de la galería', icono: Icons.photo_library_outlined, busy: ocupado, onPressed: ocupado ? null : _galeria),
              const SizedBox(height: 10),
              Row(
                children: [
                  Expanded(child: BotonSuave(icono: Icons.photo_camera_outlined, label: 'Tomar una foto', onPressed: ocupado ? null : _camara)),
                  const SizedBox(width: 10),
                  Expanded(child: BotonSuave(icono: Icons.videocam_outlined, label: 'Elegir un video', onPressed: ocupado ? null : _video)),
                ],
              ),
              const SizedBox(height: 24),
              for (final item in mios)
                Padding(
                  padding: const EdgeInsets.only(bottom: 10),
                  child: DecoratedBox(
                    decoration: BoxDecoration(color: item.estado == 'fallo' ? SeimaColors.redSoft : SeimaColors.paper2, borderRadius: BorderRadius.circular(16)),
                    child: Padding(
                      padding: const EdgeInsets.fromLTRB(14, 10, 8, 10),
                      child: Row(
                        children: [
                          Icon(item.estado == 'fallo' ? Icons.error_outline : Icons.movie_outlined, color: item.estado == 'fallo' ? SeimaColors.redText : SeimaColors.ink),
                          const SizedBox(width: 12),
                          Expanded(child: Text(textoPendiente(item, hayWifi: _hayWifi, soloWifi: soloWifi), style: archivo(17, 650, height: 1.25))),
                          if (item.estado == 'fallo')
                            TextButton(
                              onPressed: () => ref.read(colaProvider.notifier).reintentar(item.id),
                              child: Text('Reintentar', style: archivo(16, 800, color: SeimaColors.redText)),
                            ),
                        ],
                      ),
                    ),
                  ),
                ),
              if (medios.isEmpty && mios.isEmpty)
                const _SinMedios()
              else if (medios.isNotEmpty) ...[
                Padding(
                  padding: const EdgeInsets.fromLTRB(8, 0, 8, 12),
                  child: Text(
                    '${medios.length} ${medios.length == 1 ? 'archivo' : 'archivos'}',
                    style: archivo(14, 800, width: 112, height: 1.1, color: SeimaColors.muted).copyWith(letterSpacing: 1.2),
                  ),
                ),
                LayoutBuilder(
                  builder: (context, caja) {
                    final ancho = (caja.maxWidth - 12) / 2;
                    return Wrap(
                      spacing: 12,
                      runSpacing: 12,
                      children: [
                        for (var i = 0; i < medios.length; i++)
                          SizedBox(
                            width: ancho,
                            child: _TarjetaMedio(
                              numero: i + 1,
                              medio: medios[i],
                              puedeSubir: i > 0,
                              puedeBajar: i < medios.length - 1,
                              onQuitar: () => _quitar(medios[i].id),
                              onSubir: () => _mover(medios, i, -1),
                              onBajar: () => _mover(medios, i, 1),
                            ),
                          ),
                      ],
                    );
                  },
                ),
              ],
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

  Future<void> _video() async {
    final video = await _picker.pickVideo(source: ImageSource.gallery);
    if (video == null || !mounted) return;
    final archivo = File(video.path);
    final bytes = await archivo.length();
    final leida = await _duracion(video.path);
    if (!mounted) return;
    if (leida == null) {
      setState(() => _error = 'No se pudo leer el video.');
      return;
    }
    var ruta = video.path;
    var duracion = leida;
    if (videoPideRecorte(duracion)) {
      final tramo = await Navigator.of(context).push<TramoElegido>(
        MaterialPageRoute(
          builder: (_) => RecorteScreen(ruta: ruta, duracionMs: duracion, topeMs: maxVideoGaleriaMs),
        ),
      );
      if (tramo == null || !mounted) return;
      ruta = tramo.ruta;
      duracion = tramo.duracionMs;
    }
    final peso = await File(ruta).length();
    final rechazo = rechazoDeVideo(bytes: videoPideRecorte(leida) ? peso : bytes, duracionMs: duracion);
    if (rechazo != null) {
      setState(() => _error = rechazo);
      return;
    }
    final mensaje = await ref.read(colaProvider.notifier).agregar(
      projectId: widget.id,
      etapa: widget.etapa,
      ruta: ruta,
      nombre: video.name.isEmpty ? 'video.mp4' : video.name,
      duracionMs: duracion,
    );
    if (!mounted) return;
    await _mirarRed();
    if (!mounted) return;
    setState(() => _error = mensaje);
  }

  Future<void> _mirarRed() async {
    final redes = await Connectivity().checkConnectivity();
    if (mounted) setState(() => _hayWifi = redes.contains(ConnectivityResult.wifi));
  }

  Future<int?> _duracion(String ruta) async {
    final reproductor = VideoPlayerController.file(File(ruta));
    try {
      await reproductor.initialize();
      final ms = reproductor.value.duration.inMilliseconds;
      return ms > 0 ? ms : null;
    } catch (_) {
      return null;
    } finally {
      await reproductor.dispose();
    }
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

/// Una foto o un video ya subido: miniatura con su estado y tres botones grandes.
class _TarjetaMedio extends StatelessWidget {
  const _TarjetaMedio({
    required this.numero,
    required this.medio,
    required this.puedeSubir,
    required this.puedeBajar,
    required this.onQuitar,
    required this.onSubir,
    required this.onBajar,
  });

  final int numero;
  final Medio medio;
  final bool puedeSubir;
  final bool puedeBajar;
  final VoidCallback onQuitar;
  final VoidCallback onSubir;
  final VoidCallback onBajar;

  @override
  Widget build(BuildContext context) {
    final esVideo = medio.tipo == 'video';
    final estado = medio.estado == 'subiendo'
        ? 'Subiendo…'
        : medio.listo
        ? (esVideo && medio.duracionMs != null ? textoDuracion(medio.duracionMs!) : 'Listo')
        : 'No se pudo';
    final mal = !medio.listo && medio.estado != 'subiendo';
    return DecoratedBox(
      decoration: BoxDecoration(color: SeimaColors.paper2, borderRadius: BorderRadius.circular(18)),
      child: Padding(
        padding: const EdgeInsets.all(8),
        child: Column(
          children: [
            ClipRRect(
              borderRadius: BorderRadius.circular(12),
              child: AspectRatio(
                aspectRatio: 1,
                child: Stack(
                  fit: StackFit.expand,
                  children: [
                    medio.vista.isEmpty
                        ? const ColoredBox(color: SeimaColors.ink3)
                        : Image.network(medio.vista, fit: BoxFit.cover, errorBuilder: (_, _, _) => const ColoredBox(color: SeimaColors.ink3)),
                    if (esVideo) const Center(child: _Play()),
                    Positioned(
                      left: 8,
                      top: 8,
                      child: DecoratedBox(
                        decoration: const BoxDecoration(color: SeimaColors.ink, shape: BoxShape.circle),
                        child: SizedBox(width: 30, height: 30, child: Center(child: Text('$numero', style: archivo(15, 850, height: 1, color: Colors.white)))),
                      ),
                    ),
                    Positioned(
                      left: 8,
                      bottom: 8,
                      child: DecoratedBox(
                        decoration: BoxDecoration(color: mal ? SeimaColors.red : SeimaColors.ink, borderRadius: BorderRadius.circular(99)),
                        child: Padding(
                          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                          child: Text(estado, style: archivo(13, 750, height: 1.1, color: Colors.white)),
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 8),
            Row(
              children: [
                Expanded(child: _Mini(icono: Icons.arrow_upward, tooltip: 'Subir', onPressed: puedeSubir ? onSubir : null)),
                const SizedBox(width: 6),
                Expanded(child: _Mini(icono: Icons.arrow_downward, tooltip: 'Bajar', onPressed: puedeBajar ? onBajar : null)),
                const SizedBox(width: 6),
                Expanded(child: _Mini(icono: Icons.delete_outline, tooltip: 'Quitar', onPressed: onQuitar)),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

class _Mini extends StatelessWidget {
  const _Mini({required this.icono, required this.tooltip, required this.onPressed});

  final IconData icono;
  final String tooltip;
  final VoidCallback? onPressed;

  @override
  Widget build(BuildContext context) {
    return Tooltip(
      message: tooltip,
      child: Material(
        color: onPressed == null ? Colors.transparent : SeimaColors.tint2,
        borderRadius: BorderRadius.circular(12),
        child: InkWell(
          borderRadius: BorderRadius.circular(12),
          onTap: onPressed,
          child: SizedBox(
            height: 48,
            child: Icon(icono, size: 24, color: onPressed == null ? SeimaColors.tint2 : SeimaColors.ink),
          ),
        ),
      ),
    );
  }
}

class _Play extends StatelessWidget {
  const _Play();

  @override
  Widget build(BuildContext context) {
    return const DecoratedBox(
      decoration: BoxDecoration(color: Color(0x990E0E0E), shape: BoxShape.circle),
      child: SizedBox(width: 48, height: 48, child: Icon(Icons.play_arrow, color: Colors.white, size: 30)),
    );
  }
}

/// Una línea de ayuda, siempre visible, sin letra chica escondida.
class _Consejo extends StatelessWidget {
  const _Consejo({required this.soloWifi});

  final bool soloWifi;

  @override
  Widget build(BuildContext context) {
    return DecoratedBox(
      decoration: BoxDecoration(color: SeimaColors.paper2, borderRadius: BorderRadius.circular(16)),
      child: Padding(
        padding: const EdgeInsets.all(14),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Icon(Icons.lightbulb_outline, size: 24),
            const SizedBox(width: 12),
            Expanded(
              child: Text(
                soloWifi
                    ? 'Los videos de más de 1 minuto se recortan. Se suben cuando haya Wi-Fi.'
                    : 'Los videos de más de 1 minuto se recortan antes de subirse.',
                style: archivo(16, 550, height: 1.3),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _Progreso extends StatelessWidget {
  const _Progreso({required this.texto, this.valor});

  final String texto;
  final double? valor;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 14),
      child: DecoratedBox(
        decoration: BoxDecoration(color: SeimaColors.redSoft, borderRadius: BorderRadius.circular(16)),
        child: Padding(
          padding: const EdgeInsets.all(14),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(texto, style: archivo(17, 750, height: 1.2, color: SeimaColors.redText)),
              const SizedBox(height: 10),
              ClipRRect(
                borderRadius: BorderRadius.circular(99),
                child: LinearProgressIndicator(value: valor, minHeight: 8, color: SeimaColors.red, backgroundColor: SeimaColors.redSoft),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _SinMedios extends StatelessWidget {
  const _SinMedios();

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 24),
      child: Column(
        children: [
          const CapasMarca(ancho: 110, claro: true),
          const SizedBox(height: 16),
          Text('Todavía no hay nada aquí', style: archivo(20, 800, width: 112, height: 1.15)),
          const SizedBox(height: 4),
          Text('Elige fotos o videos con los botones de arriba.', textAlign: TextAlign.center, style: archivo(16, 500, height: 1.3, color: SeimaColors.muted)),
        ],
      ),
    );
  }
}
