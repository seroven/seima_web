import 'dart:async';

import 'package:firebase_core/firebase_core.dart';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter/widgets.dart';
import 'package:flutter_dotenv/flutter_dotenv.dart';
import 'package:flutter_local_notifications/flutter_local_notifications.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../auth/auth_api.dart';
import '../config/app_env.dart';

/// El mismo id que envía la API y que declara el manifiesto.
const canalAvisos = 'seima_avisos';

final _locales = FlutterLocalNotificationsPlugin();
var _canalListo = false;

Future<void> prepararCanal({void Function(String id)? alTocar}) async {
  if (_canalListo) return;
  await _locales.initialize(
    settings: const InitializationSettings(android: AndroidInitializationSettings('@mipmap/ic_launcher')),
    onDidReceiveNotificationResponse: (respuesta) {
      final id = respuesta.payload;
      if (id != null && id.isNotEmpty) alTocar?.call(id);
    },
  );
  await _locales.resolvePlatformSpecificImplementation<AndroidFlutterLocalNotificationsPlugin>()?.createNotificationChannel(
    const AndroidNotificationChannel(
      canalAvisos,
      'Cotizaciones',
      description: 'Avisos cuando llega una cotización nueva',
      importance: Importance.high,
    ),
  );
  await _locales.resolvePlatformSpecificImplementation<AndroidFlutterLocalNotificationsPlugin>()?.requestNotificationsPermission();
  _canalListo = true;
}

Future<void> mostrarAviso(RemoteMessage mensaje) async {
  final aviso = mensaje.notification;
  if (aviso == null) return;
  await _locales.show(
    id: aviso.hashCode,
    title: aviso.title,
    body: aviso.body,
    notificationDetails: const NotificationDetails(
      android: AndroidNotificationDetails(
        canalAvisos,
        'Cotizaciones',
        channelDescription: 'Avisos cuando llega una cotización nueva',
        importance: Importance.high,
        priority: Priority.high,
        icon: '@mipmap/ic_launcher',
      ),
    ),
    payload: mensaje.data['quoteId'],
  );
}

/// El sistema muestra el aviso. Este isolate solo deja Firebase listo.
@pragma('vm:entry-point')
Future<void> fondoFirebase(RemoteMessage message) async {
  WidgetsFlutterBinding.ensureInitialized();
  try {
    await dotenv.load(fileName: '.env', isOptional: true);
  } catch (_) {}
  if (Firebase.apps.isEmpty && AppEnv.firebaseListo) {
    await Firebase.initializeApp(options: AppEnv.firebase);
  }
}

abstract class PushService {
  Future<String> registrar(AuthApi api);
  Future<void> olvidar(AuthApi api);
  Future<void> escucharAvisos({required void Function(String id) alAbrir, void Function()? alLlegar});
}

class FirebasePush implements PushService {
  String? _token;
  bool _escuchando = false;

  bool _avisos = false;

  /// Escucha el aviso de una cotización nueva. Si tocan el aviso, llama [alAbrir] con su id.
  @override
  Future<void> escucharAvisos({required void Function(String id) alAbrir, void Function()? alLlegar}) async {
    if (_avisos || !AppEnv.firebaseListo) return;
    _avisos = true;
    try {
      if (Firebase.apps.isEmpty) {
        await Firebase.initializeApp(options: AppEnv.firebase);
      }
      await prepararCanal(alTocar: alAbrir);
      void tomar(RemoteMessage mensaje) {
        final id = mensaje.data['quoteId'];
        if (id is String && id.isNotEmpty) alAbrir(id);
      }

      FirebaseMessaging.onMessage.listen((mensaje) {
        mostrarAviso(mensaje);
        alLlegar?.call();
      });
      FirebaseMessaging.onMessageOpenedApp.listen(tomar);
      final inicial = await FirebaseMessaging.instance.getInitialMessage();
      if (inicial != null) tomar(inicial);
    } catch (_) {}
  }

  @override
  Future<String> registrar(AuthApi api) async {
    if (!AppEnv.firebaseListo) {
      return 'Las notificaciones se activan cuando configures Firebase.';
    }
    try {
      if (Firebase.apps.isEmpty) {
        await Firebase.initializeApp(options: AppEnv.firebase);
      }
      await prepararCanal();
      final messaging = FirebaseMessaging.instance;
      final permiso = await messaging.requestPermission();
      // El aviso sale con sendEachForMulticast, que pide el token de registro.
      // register()/onRegistered devuelve el FID, y esa llamada no lo acepta.
      // ignore: deprecated_member_use
      final token = await messaging.getToken();
      if (token == null || token.length < 10) {
        return 'Este celular todavía no puede recibir avisos.';
      }
      await api.registrarDispositivo(token);
      _token = token;
      if (!_escuchando) {
        _escuchando = true;
        // ignore: deprecated_member_use
        messaging.onTokenRefresh.listen((nuevo) async {
          _token = nuevo;
          try {
            await api.registrarDispositivo(nuevo);
          } catch (_) {}
        });
      }
      if (permiso.authorizationStatus == AuthorizationStatus.denied) {
        return 'Activa las notificaciones del teléfono para enterarte de las cotizaciones.';
      }
      return 'Este celular recibirá las cotizaciones nuevas.';
    } catch (_) {
      return 'No se pudo preparar las notificaciones.';
    }
  }

  @override
  Future<void> olvidar(AuthApi api) async {
    final token = _token;
    _token = null;
    if (token == null) return;
    try {
      await api.olvidarDispositivo(token);
    } catch (_) {}
  }
}

final pushProvider = Provider<PushService>((ref) => FirebasePush());
