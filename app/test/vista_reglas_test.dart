import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:seima/projects/vista_reglas.dart';
import 'package:seima/widgets/deslizador.dart';
import 'package:seima/widgets/tarjeta_portada.dart';

void main() {
  test('elige el deslizador cuando el par es horizontal', () {
    expect(modoVista(1600, 900), 'deslizador');
    expect(modoVista(900, 1600), 'lado');
    expect(modoVista(null, null), 'lado');
    expect(proporcionDe(1600, 900), closeTo(1600 / 900, 0.001));
    expect(proporcionDe(100, 1000), 0.7);
  });

  test('arma el mensaje de WhatsApp sin inventar un enlace', () {
    expect(textoParaCompartir('Cocina de Surco'), 'Te comparto esta obra de SEIMA: Cocina de Surco.');
    expect(textoParaCompartir('  '), 'Te comparto esta obra de SEIMA: una obra.');
    final enlace = enlaceWhatsapp('hola');
    expect(enlace.host, 'wa.me');
    expect(enlace.queryParameters['text'], 'hola');
    expect(enlace.toString().contains('http'), isTrue);
    expect(enlace.toString().contains('proyectos/'), isFalse);
  });

  testWidgets('el deslizador se mueve con el dedo', (tester) async {
    final semantica = tester.ensureSemantics();
    await tester.pumpWidget(const MaterialApp(home: Scaffold(body: Center(child: SizedBox(width: 300, child: Deslizador(antes: '', despues: ''))))));
    expect(tester.getSemantics(find.byType(Deslizador)).value, '50%');
    await tester.drag(find.byType(Deslizador), const Offset(80, 0));
    await tester.pump();
    expect(tester.getSemantics(find.byType(Deslizador)).value, isNot('50%'));
    semantica.dispose();
  });

  testWidgets('la portada muestra el antes mientras se mantiene presionada', (tester) async {
    final semantica = tester.ensureSemantics();
    await tester.pumpWidget(
      const MaterialApp(home: Scaffold(body: Center(child: SizedBox(width: 240, child: TarjetaPortada(antes: '', despues: ''))))),
    );
    expect(find.bySemanticsLabel('Mostrando el después'), findsOneWidget);
    final gesto = await tester.startGesture(tester.getCenter(find.byType(TarjetaPortada)));
    await tester.pump();
    expect(find.bySemanticsLabel('Mostrando el antes'), findsOneWidget);
    await gesto.up();
    await tester.pump();
    expect(find.bySemanticsLabel('Mostrando el después'), findsOneWidget);
    semantica.dispose();
  });
}
