import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:seima/theme/seima_theme.dart';
import 'package:seima/widgets/gestion.dart';

/// Una lista como las de «Tipos de trabajo» y «Servicios»: filas con interruptor y asa de arrastre.
Widget _lista(List<(int, int)> movimientos) {
  return MaterialApp(
    theme: seimaTheme(),
    home: Scaffold(
      body: CustomScrollView(
        slivers: [
          SliverReorderableList(
            itemCount: 4,
            proxyDecorator: arrastrandoFila,
            onReorderItem: (viejo, nuevo) => movimientos.add((viejo, nuevo)),
            itemBuilder: (context, i) => Padding(
              key: ValueKey(i),
              padding: const EdgeInsets.only(bottom: 10),
              child: FilaGestion(titulo: 'Fila $i', detalle: 'Detalle', activo: true, onActivo: (_) {}, indiceArrastre: i, onTap: () {}),
            ),
          ),
        ],
      ),
    ),
  );
}

void main() {
  testWidgets('arrastrar una fila no lanza errores y avisa de la nueva posición', (tester) async {
    final movimientos = <(int, int)>[];
    await tester.pumpWidget(_lista(movimientos));

    final gesto = await tester.startGesture(tester.getCenter(find.byIcon(Icons.drag_indicator).first));
    await tester.pump(const Duration(milliseconds: 100));
    // Mientras se arrastra, la fila «flota» fuera del Scaffold (en el Overlay): ahí también tiene que poder dibujarse.
    await gesto.moveBy(const Offset(0, 90));
    await tester.pump(const Duration(milliseconds: 200));
    expect(tester.takeException(), isNull, reason: 'la fila arrastrada se tiene que dibujar sin errores');

    await gesto.moveBy(const Offset(0, 90));
    await tester.pump(const Duration(milliseconds: 200));
    await gesto.up();
    await tester.pumpAndSettle();

    expect(tester.takeException(), isNull);
    expect(movimientos, isNotEmpty, reason: 'se tuvo que avisar que la fila cambió de lugar');
    expect(movimientos.first.$1, 0);
    expect(movimientos.first.$2, greaterThan(0));
  });

  testWidgets('el interruptor de una fila sigue funcionando junto al asa', (tester) async {
    var activado = <bool>[];
    await tester.pumpWidget(
      MaterialApp(
        theme: seimaTheme(),
        home: Scaffold(
          body: CustomScrollView(
            slivers: [
              SliverReorderableList(
                itemCount: 1,
                onReorderItem: (_, _) {},
                itemBuilder: (context, i) => FilaGestion(key: const ValueKey(0), titulo: 'Una', activo: true, onActivo: activado.add, indiceArrastre: 0),
              ),
            ],
          ),
        ),
      ),
    );
    await tester.tap(find.byType(Switch));
    await tester.pump();
    expect(activado, [false]);
  });
}
