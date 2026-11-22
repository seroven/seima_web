import 'package:firebase_core/firebase_core.dart';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter/widgets.dart';
import 'package:flutter_dotenv/flutter_dotenv.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'app.dart';
import 'config/app_env.dart';
import 'devices/push_service.dart';
import 'projects/subida_fondo.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await dotenv.load(fileName: '.env', isOptional: true);
  if (AppEnv.firebaseListo) {
    await Firebase.initializeApp(options: AppEnv.firebase);
    FirebaseMessaging.onBackgroundMessage(fondoFirebase);
  }
  await prepararSubidaEnSegundoPlano();
  runApp(const ProviderScope(child: SeimaApp()));
}
