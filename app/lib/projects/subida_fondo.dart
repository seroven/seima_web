import 'dart:io';
import 'dart:ui';

import 'package:connectivity_plus/connectivity_plus.dart';
import 'package:flutter/widgets.dart';
import 'package:flutter_dotenv/flutter_dotenv.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:workmanager/workmanager.dart';

import '../api/api_client.dart';
import '../auth/almacen_sesion.dart';
import '../auth/token_vault.dart';
import 'cola_videos.dart';
import 'proyectos_api.dart';

const tareaVideos = 'seima.subirVideos';
const nombreTareaVideos = 'subir-videos';

@pragma('vm:entry-point')
void despacharSubida() {
  Workmanager().executeTask((task, inputData) async {
    WidgetsFlutterBinding.ensureInitialized();
    DartPluginRegistrant.ensureInitialized();
    await dotenv.load(fileName: '.env', isOptional: true);
    final prefs = await SharedPreferences.getInstance();
    final ahora = DateTime.now().millisecondsSinceEpoch;
    if (appSigueAbierta(pulsoMs: prefs.getInt(clavePulsoApp) ?? 0, ahoraMs: ahora)) return true;
    final sesion = AlmacenSesion();
    final refresh = await sesion.readRefresh();
    if (refresh == null || refresh.isEmpty) return false;
    final vault = TokenVault()..refresh = refresh;
    final api = ProyectosApi(armarDio(vault: vault, store: sesion));
    final redes = await Connectivity().checkConnectivity();
    await drenarCola(
      cola: decodificarCola(prefs.getString(claveColaVideos)),
      ahoraMs: ahora,
      hayWifi: redes.contains(ConnectivityResult.wifi),
      soloWifi: prefs.getBool(claveVideosWifi) ?? true,
      guardar: (cola) => prefs.setString(claveColaVideos, codificarCola(cola)),
      subir: (item) async {
        await api.subirVideo(projectId: item.projectId, etapa: item.etapa, ruta: item.ruta, nombre: item.nombre, duracionMs: item.duracionMs);
        final archivo = File(item.ruta);
        if (await archivo.exists()) await archivo.delete();
      },
    );
    return true;
  });
}

Future<void> programarSubida({required bool soloWifi}) async {
  if (!Platform.isAndroid) return;
  try {
    await Workmanager().registerOneOffTask(
      nombreTareaVideos,
      tareaVideos,
      existingWorkPolicy: ExistingWorkPolicy.replace,
      constraints: Constraints(networkType: soloWifi ? NetworkType.unmetered : NetworkType.connected),
      foregroundServiceConfig: ForegroundServiceConfig(
        notificationTitle: 'SEIMA',
        notificationText: 'Subiendo un video',
        notificationChannelName: 'Subidas',
        foregroundServiceType: ForegroundServiceType.dataSync,
      ),
    );
  } catch (_) {}
}

Future<void> prepararSubidaEnSegundoPlano() async {
  if (!Platform.isAndroid) return;
  try {
    await Workmanager().initialize(despacharSubida);
  } catch (_) {}
}
