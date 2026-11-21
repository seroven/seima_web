import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../auth/auth_controller.dart';
import '../auth/auth_state.dart';
import '../screens/ajustes_screen.dart';
import '../screens/contrasena_screen.dart';
import '../screens/datos_proyecto_screen.dart';
import '../screens/etapa_screen.dart';
import '../screens/listas_screen.dart';
import '../screens/login_screen.dart';
import '../screens/par_screen.dart';
import '../screens/proyecto_screen.dart';
import '../screens/proyectos_screen.dart';
import '../screens/shell_screen.dart';
import '../screens/splash_screen.dart';

final routerProvider = Provider<GoRouter>((ref) {
  final refresh = ValueNotifier<int>(0);
  ref.listen(authProvider, (_, _) => refresh.value++);
  ref.onDispose(refresh.dispose);

  final router = GoRouter(
    initialLocation: '/cargando',
    refreshListenable: refresh,
    redirect: (context, state) {
      final auth = ref.read(authProvider);
      final ruta = state.matchedLocation;
      if (auth.isLoading) return ruta == '/cargando' ? null : '/cargando';
      final dentro = auth.value is AuthSignedIn;
      final enLogin = ruta == '/entrar';
      final enCarga = ruta == '/cargando';
      if (!dentro && !enLogin) return '/entrar';
      if (dentro && (enLogin || enCarga)) return '/proyectos';
      return null;
    },
    routes: [
      GoRoute(path: '/cargando', builder: (context, state) => const SplashScreen()),
      GoRoute(path: '/entrar', builder: (context, state) => const LoginScreen()),
      GoRoute(path: '/contrasena', builder: (context, state) => const ContrasenaScreen()),
      GoRoute(path: '/proyecto/nuevo', builder: (context, state) => const DatosProyectoScreen()),
      GoRoute(
        path: '/proyecto/:id',
        builder: (context, state) => ProyectoScreen(id: state.pathParameters['id']!),
        routes: [
          GoRoute(
            path: 'datos',
            builder: (context, state) => DatosProyectoScreen(id: state.pathParameters['id']),
          ),
          GoRoute(
            path: 'comparacion',
            builder: (context, state) => ParScreen.comparacion(id: state.pathParameters['id']!),
          ),
          GoRoute(
            path: 'portada',
            builder: (context, state) => ParScreen.portada(id: state.pathParameters['id']!),
          ),
          GoRoute(
            path: 'publicar',
            builder: (context, state) => PublicarScreen(id: state.pathParameters['id']!),
          ),
          GoRoute(
            path: 'antes',
            builder: (context, state) => EtapaScreen(id: state.pathParameters['id']!, etapa: 'antes'),
          ),
          GoRoute(
            path: 'durante',
            builder: (context, state) => EtapaScreen(id: state.pathParameters['id']!, etapa: 'durante'),
          ),
          GoRoute(
            path: 'despues',
            builder: (context, state) => EtapaScreen(id: state.pathParameters['id']!, etapa: 'despues'),
          ),
        ],
      ),
      StatefulShellRoute.indexedStack(
        builder: (context, state, shell) => ShellScreen(shell: shell),
        branches: [
          StatefulShellBranch(
            routes: [GoRoute(path: '/proyectos', builder: (context, state) => const ProyectosScreen())],
          ),
          StatefulShellBranch(
            routes: [GoRoute(path: '/cotizaciones', builder: (context, state) => const CotizacionesScreen())],
          ),
          StatefulShellBranch(
            routes: [GoRoute(path: '/ajustes', builder: (context, state) => const AjustesScreen())],
          ),
        ],
      ),
    ],
  );
  ref.onDispose(router.dispose);
  return router;
});
