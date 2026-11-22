import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';
import 'package:seima/router/volver.dart';

/// Un router con la misma forma que el de la app: pestañas dentro de un «shell» y pantallas de detalle encima.
GoRouter _router({String inicial = '/proyectos'}) {
  Widget pantalla(String nombre, {String? alternativa}) => Builder(
    builder: (context) => Scaffold(
      body: Column(
        children: [
          Text('Pantalla $nombre'),
          if (alternativa != null) TextButton(onPressed: () => context.volver(alternativa), child: Text('Volver desde $nombre')),
        ],
      ),
    ),
  );

  return GoRouter(
    initialLocation: inicial,
    routes: [
      GoRoute(path: '/cotizacion/:id', builder: (c, s) => pantalla('cotización', alternativa: '/cotizaciones')),
      GoRoute(path: '/proyecto/:id', builder: (c, s) => pantalla('obra', alternativa: '/proyectos')),
      GoRoute(path: '/catalogo/tipos', builder: (c, s) => pantalla('tipos', alternativa: '/ajustes')),
      StatefulShellRoute.indexedStack(
        builder: (c, s, shell) => shell,
        branches: [
          StatefulShellBranch(
            routes: [
              GoRoute(
                path: '/proyectos',
                builder: (c, s) => Builder(
                  builder: (context) => Column(
                    children: [
                      const Text('Pantalla proyectos'),
                      TextButton(onPressed: () => context.push('/proyecto/1'), child: const Text('Abrir obra')),
                    ],
                  ),
                ),
              ),
            ],
          ),
          StatefulShellBranch(routes: [GoRoute(path: '/cotizaciones', builder: (c, s) => const Text('Pantalla cotizaciones'))]),
          StatefulShellBranch(
            routes: [
              GoRoute(
                path: '/ajustes',
                builder: (c, s) => Builder(
                  builder: (context) => Column(
                    children: [
                      const Text('Pantalla ajustes'),
                      TextButton(onPressed: () => context.push('/catalogo/tipos'), child: const Text('Abrir tipos')),
                    ],
                  ),
                ),
              ),
            ],
          ),
        ],
      ),
    ],
  );
}

Future<GoRouter> _abrir(WidgetTester tester, {String inicial = '/proyectos'}) async {
  final router = _router(inicial: inicial);
  await tester.pumpWidget(MaterialApp.router(routerConfig: router));
  await tester.pumpAndSettle();
  return router;
}

void main() {
  testWidgets('una pantalla apilada vuelve a la anterior', (tester) async {
    await _abrir(tester, inicial: '/ajustes');
    await tester.tap(find.text('Abrir tipos'));
    await tester.pumpAndSettle();
    expect(find.text('Pantalla tipos'), findsOneWidget);

    await tester.tap(find.text('Volver desde tipos'));
    await tester.pumpAndSettle();
    expect(find.text('Pantalla ajustes'), findsOneWidget);
  });

  testWidgets('abierta con «go» (nada debajo), el botón vuelve a la pestaña de origen en vez de quedarse quieto', (tester) async {
    final router = await _abrir(tester);
    router.go('/proyecto/1'); // como al terminar de crear una obra
    await tester.pumpAndSettle();
    expect(find.text('Pantalla obra'), findsOneWidget);
    expect(router.canPop(), isFalse, reason: 'esta es la situación que dejaba el botón de volver sin efecto');

    await tester.tap(find.text('Volver desde obra'));
    await tester.pumpAndSettle();
    expect(find.text('Pantalla proyectos'), findsOneWidget);
  });

  testWidgets('abrir una cotización desde un aviso deja las cotizaciones debajo', (tester) async {
    final router = await _abrir(tester);
    abrirCotizacion(router, 'abc');
    await tester.pumpAndSettle();
    expect(find.text('Pantalla cotización'), findsOneWidget);
    expect(router.canPop(), isTrue);

    await tester.tap(find.text('Volver desde cotización'));
    await tester.pumpAndSettle();
    expect(find.text('Pantalla cotizaciones'), findsOneWidget);
  });

  testWidgets('al crear una obra, su ficha reemplaza a la pantalla de datos y la lista de proyectos sigue debajo', (tester) async {
    final router = await _abrir(tester);
    await tester.tap(find.text('Abrir obra')); // aquí hace de pantalla «datos de la obra»
    await tester.pumpAndSettle();
    router.pushReplacement('/proyecto/2'); // lo que hace la app al guardar la obra nueva
    await tester.pumpAndSettle();
    expect(find.text('Pantalla obra'), findsOneWidget);
    expect(router.canPop(), isTrue);

    await tester.tap(find.text('Volver desde obra'));
    await tester.pumpAndSettle();
    expect(find.text('Pantalla proyectos'), findsOneWidget);
  });
}
