import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'projects/cola_controller.dart';
import 'auth/auth_controller.dart';
import 'auth/auth_state.dart';
import 'devices/push_service.dart';
import 'quotes/cotizaciones_controller.dart';
import 'router/app_router.dart';
import 'router/volver.dart';
import 'theme/seima_theme.dart';

class SeimaApp extends ConsumerWidget {
  const SeimaApp({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return const VigilaSubidas(
      child: EscuchaAvisos(
        child: _Enrutador(),
      ),
    );
  }
}

class _Enrutador extends ConsumerWidget {
  const _Enrutador();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return MaterialApp.router(
      title: 'SEIMA',
      debugShowCheckedModeBanner: false,
      theme: seimaTheme(),
      themeMode: ThemeMode.light,
      routerConfig: ref.watch(routerProvider),
      builder: (context, child) {
        final datos = MediaQuery.of(context);
        // Letra más chica en toda la app, respetando el ajuste de letra del teléfono.
        final delSistema = datos.textScaler.scale(16) / 16;
        return MediaQuery(
          data: datos.copyWith(textScaler: TextScaler.linear(delSistema * escalaTexto)),
          child: child ?? const SizedBox.shrink(),
        );
      },
    );
  }
}

/// Guarda el id de la cotización cuando llega o se toca un aviso, y abre su ficha si ya hay sesión.
class EscuchaAvisos extends ConsumerStatefulWidget {
  const EscuchaAvisos({super.key, required this.child});

  final Widget child;

  @override
  ConsumerState<EscuchaAvisos> createState() => _EscuchaAvisosState();
}

class _EscuchaAvisosState extends ConsumerState<EscuchaAvisos> {
  @override
  void initState() {
    super.initState();
    ref.read(pushProvider).escucharAvisos(
      alAbrir: (id) => ref.read(avisoAbiertoProvider.notifier).abrir(id),
      alLlegar: () => ref.invalidate(cotizacionesListaProvider),
    );
  }

  @override
  Widget build(BuildContext context) {
    ref.listen(avisoAbiertoProvider, (_, id) => _ir(id));
    ref.listen(authProvider, (_, _) => _ir(ref.read(avisoAbiertoProvider)));
    return widget.child;
  }

  void _ir(String? id) {
    if (id == null || ref.read(authProvider).value is! AuthSignedIn) return;
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!mounted || ref.read(avisoAbiertoProvider) != id) return;
      ref.read(avisoAbiertoProvider.notifier).consumir();
      abrirCotizacion(ref.read(routerProvider), id); // con las cotizaciones debajo, para poder volver
    });
  }
}

class AvisoAbierto extends Notifier<String?> {
  @override
  String? build() => null;

  void abrir(String id) => state = id;

  void consumir() => state = null;
}

final avisoAbiertoProvider = NotifierProvider<AvisoAbierto, String?>(AvisoAbierto.new);

