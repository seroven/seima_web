import 'dart:async';
import 'dart:io';

import 'package:connectivity_plus/connectivity_plus.dart';
import 'package:flutter/widgets.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:path_provider/path_provider.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../auth/auth_controller.dart';
import '../auth/auth_state.dart';
import '../settings/ajustes_locales.dart';
import 'cola_videos.dart';
import 'proyectos_api.dart';
import 'proyectos_controller.dart';
import 'subida_fondo.dart';

final colaProvider = AsyncNotifierProvider<ColaVideos, List<PendienteVideo>>(ColaVideos.new);

class ColaVideos extends AsyncNotifier<List<PendienteVideo>> {
  var _drenando = false;

  @override
  Future<List<PendienteVideo>> build() async {
    final prefs = await SharedPreferences.getInstance();
    return decodificarCola(prefs.getString(claveColaVideos));
  }

  Future<String?> agregar({
    required String projectId,
    required String etapa,
    required String ruta,
    required String nombre,
    required int duracionMs,
  }) async {
    try {
      final carpeta = Directory('${(await getApplicationSupportDirectory()).path}${Platform.pathSeparator}videos');
      final copia = await apartarVideo(ruta, carpeta);
      final prefs = await SharedPreferences.getInstance();
      final item = PendienteVideo(
        id: '${DateTime.now().microsecondsSinceEpoch}',
        projectId: projectId,
        etapa: etapa,
        ruta: copia,
        nombre: nombre,
        duracionMs: duracionMs,
        estado: 'esperando',
        intentoEnMs: 0,
      );
      final cola = [...decodificarCola(prefs.getString(claveColaVideos)), item];
      await prefs.setString(claveColaVideos, codificarCola(cola));
      state = AsyncData(cola);
      await drenar();
      return null;
    } catch (_) {
      return 'No se pudo guardar el video en el teléfono.';
    }
  }

  Future<void> reintentar(String id) async {
    final prefs = await SharedPreferences.getInstance();
    final cola = marcarPendiente(decodificarCola(prefs.getString(claveColaVideos)), id, 'esperando');
    await prefs.setString(claveColaVideos, codificarCola(cola));
    state = AsyncData(cola);
    await drenar();
  }

  Future<void> drenar() async {
    if (_drenando) return;
    if (ref.read(authProvider).value is! AuthSignedIn) return;
    _drenando = true;
    try {
      final prefs = await SharedPreferences.getInstance();
      final soloWifi = ref.read(videosWifiProvider).value ?? true;
      final redes = await Connectivity().checkConnectivity();
      final ahora = DateTime.now().millisecondsSinceEpoch;
      final cola = await drenarCola(
        cola: decodificarCola(prefs.getString(claveColaVideos)),
        ahoraMs: ahora,
        hayWifi: redes.contains(ConnectivityResult.wifi),
        soloWifi: soloWifi,
        guardar: (siguiente) async {
          await prefs.setString(claveColaVideos, codificarCola(siguiente));
          state = AsyncData(siguiente);
        },
        subir: (item) async {
          await ref.read(proyectosApiProvider).subirVideo(
            projectId: item.projectId,
            etapa: item.etapa,
            ruta: item.ruta,
            nombre: item.nombre,
            duracionMs: item.duracionMs,
          );
          final archivo = File(item.ruta);
          if (await archivo.exists()) await archivo.delete();
          ref.invalidate(proyectoProvider(item.projectId));
        },
      );
      state = AsyncData(cola);
      if (cola.isNotEmpty) await programarSubida(soloWifi: soloWifi);
    } finally {
      _drenando = false;
    }
  }
}

class VigilaSubidas extends ConsumerStatefulWidget {
  const VigilaSubidas({super.key, required this.child});

  final Widget child;

  @override
  ConsumerState<VigilaSubidas> createState() => _VigilaSubidasState();
}

class _VigilaSubidasState extends ConsumerState<VigilaSubidas> with WidgetsBindingObserver {
  Timer? _pulso;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    _latir();
    _pulso = Timer.periodic(const Duration(seconds: 5), (_) => _latir());
    Future.microtask(() => ref.read(colaProvider.notifier).drenar());
  }

  @override
  void dispose() {
    _pulso?.cancel();
    WidgetsBinding.instance.removeObserver(this);
    super.dispose();
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state == AppLifecycleState.resumed) {
      _pulso ??= Timer.periodic(const Duration(seconds: 5), (_) => _latir());
      _latir();
      ref.read(colaProvider.notifier).drenar();
    }
    if (state == AppLifecycleState.paused || state == AppLifecycleState.detached) {
      _pulso?.cancel();
      _pulso = null;
      _latir(0);
      final soloWifi = ref.read(videosWifiProvider).value ?? true;
      programarSubida(soloWifi: soloWifi);
    }
  }

  Future<void> _latir([int? marca]) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setInt(clavePulsoApp, marca ?? DateTime.now().millisecondsSinceEpoch);
  }

  @override
  Widget build(BuildContext context) {
    ref.watch(colaProvider);
    return widget.child;
  }
}
