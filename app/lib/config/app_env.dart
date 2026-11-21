import 'package:firebase_core/firebase_core.dart';
import 'package:flutter_dotenv/flutter_dotenv.dart';

/// Lo que la app lee de `app/.env`. Nada de esto va en el código.
class AppEnv {
  static String get apiUrl {
    final cruda = dotenv.maybeGet('API_URL')?.trim() ?? '';
    if (cruda.isEmpty) return '';
    return cruda.endsWith('/') ? cruda : '$cruda/';
  }

  static bool get tieneApi => apiUrl.isNotEmpty;

  static bool get firebaseListo =>
      _lleno('FIREBASE_API_KEY') &&
      _lleno('FIREBASE_APP_ID') &&
      _lleno('FIREBASE_MESSAGING_SENDER_ID') &&
      _lleno('FIREBASE_PROJECT_ID');

  static FirebaseOptions get firebase => FirebaseOptions(
    apiKey: dotenv.get('FIREBASE_API_KEY'),
    appId: dotenv.get('FIREBASE_APP_ID'),
    messagingSenderId: dotenv.get('FIREBASE_MESSAGING_SENDER_ID'),
    projectId: dotenv.get('FIREBASE_PROJECT_ID'),
  );

  static bool _lleno(String clave) => (dotenv.maybeGet(clave)?.trim().isNotEmpty) ?? false;
}
