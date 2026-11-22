import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:seima/api/api_error.dart';
import 'package:seima/screens/visitas_screen.dart';
import 'package:seima/theme/seima_theme.dart';
import 'package:seima/visitas/visitas.dart';
import 'package:seima/visitas/visitas_api.dart';
import 'package:seima/visitas/visitas_controller.dart';

/// Lo que responde la API (`GET analytics/summary`), tal cual.
Map<String, dynamic> _respuesta({String periodo = '7d', int visitas = 120, int antes = 100}) => {
  'data': {
    'periodo': periodo,
    'visitas': {'actual': visitas, 'anterior': antes},
    'visitantes': {'actual': 80, 'anterior': 90},
    'cotizaciones': {'actual': 5, 'anterior': 0},
    'whatsapp': {'actual': 9, 'anterior': 9},
    'compartidos': {'actual': 0, 'anterior': 0},
    'porDia': [
      {'fecha': '2026-11-16', 'visitas': 10, 'visitantes': 8},
      {'fecha': '2026-11-17', 'visitas': 30, 'visitantes': 20},
      {'fecha': '2026-11-18', 'visitas': 0, 'visitantes': 0},
    ],
    'proyectos': [
      {'slug': 'cocina-moderna', 'titulo': 'Cocina moderna', 'visitas': 40, 'visitantes': 25},
      {'slug': 'bano', 'titulo': 'Baño en porcelanato', 'visitas': 1, 'visitantes': 1},
    ],
    'paginas': [
      {'ruta': '/', 'nombre': 'Inicio', 'visitas': 70},
    ],
    'origenes': [
      {'origen': 'TikTok', 'visitas': 50},
      {'origen': 'Directo', 'visitas': 30},
    ],
    'lugares': [
      {'pais': 'Perú', 'ciudad': 'Lima', 'visitas': 90},
      {'pais': 'Sin ubicación', 'ciudad': null, 'visitas': 3},
    ],
    'dispositivos': {'movil': 75, 'escritorio': 25, 'tablet': 0},
  },
};

class _ApiFalsa extends VisitasApi {
  _ApiFalsa({this.falla = false, this.vacia = false}) : super(Dio());

  final bool falla;
  final bool vacia;
  final pedidos = <String>[];

  @override
  Future<ResumenVisitas> resumen(String periodo) async {
    pedidos.add(periodo);
    if (falla) throw ApiException('No hay conexión. Revisa el Wi-Fi e inténtalo de nuevo.', sinConexion: true);
    if (vacia) {
      return resumenVisitasDesde({
        'data': {
          'periodo': periodo,
          'visitas': {'actual': 0, 'anterior': 0},
        },
      });
    }
    return resumenVisitasDesde(_respuesta(periodo: periodo));
  }
}

Widget _app(_ApiFalsa api) => ProviderScope(
  overrides: [visitasApiProvider.overrideWithValue(api)],
  child: MaterialApp(theme: seimaTheme(), home: const VisitasScreen()),
);

void main() {
  group('cuánto cambió', () {
    test('sube, baja, igual y nuevo', () {
      expect(variacion(const Cifra(actual: 125, anterior: 100))?.tendencia, Tendencia.sube);
      expect(variacion(const Cifra(actual: 125, anterior: 100))?.texto, '25 % más');
      expect(variacion(const Cifra(actual: 90, anterior: 100))?.texto, '10 % menos');
      expect(variacion(const Cifra(actual: 7, anterior: 7))?.tendencia, Tendencia.igual);
      expect(variacion(const Cifra(actual: 4, anterior: 0))?.tendencia, Tendencia.nuevo);
    });

    test('sin nada que comparar no dice nada', () {
      expect(variacion(Cifra.cero), isNull);
    });

    test('un cambio mínimo se dice «igual», no «0 % más»', () {
      expect(variacion(const Cifra(actual: 1001, anterior: 1000))?.tendencia, Tendencia.igual);
    });

    test('con 0 ahora y algo antes baja 100 %', () {
      final v = variacion(const Cifra(actual: 0, anterior: 8))!;
      expect(v.tendencia, Tendencia.baja);
      expect(v.porcentaje, 100);
    });
  });

  group('palabras simples', () {
    test('periodos y con qué se compara', () {
      expect([for (final p in periodosVisitas) etiquetaPeriodo(p)], ['Hoy', '7 días', '30 días']);
      expect(comparadoCon('hoy'), 'ayer');
      expect(comparadoCon('7d'), 'los 7 días anteriores');
      expect(comparadoCon('30d'), 'los 30 días anteriores');
    });

    test('día corto, lugar, visitas y miles', () {
      expect(diaCorto('2026-11-22'), '22 nov');
      expect(diaCorto('2026-09-01'), '1 set');
      expect(diaCorto('raro'), 'raro');
      expect(lugarTexto(const LugarVisitas(pais: 'Perú', ciudad: 'Lima', visitas: 1)), 'Lima, Perú');
      expect(lugarTexto(const LugarVisitas(pais: 'Perú', ciudad: null, visitas: 1)), 'Perú');
      expect(lugarTexto(const LugarVisitas(pais: 'Perú', ciudad: '  ', visitas: 1)), 'Perú');
      expect(visitasTexto(1), '1 visita');
      expect(visitasTexto(12), '12 visitas');
      expect(miles(1234), '1 234');
      expect(miles(999), '999');
      expect(miles(1234567), '1 234 567');
      expect(porcentajeDe(75, 100), 75);
      expect(porcentajeDe(1, 0), 0);
    });
  });

  group('lo que responde la API', () {
    test('se lee completo', () {
      final r = resumenVisitasDesde(_respuesta());
      expect(r.periodo, '7d');
      expect(r.visitas.actual, 120);
      expect(r.visitas.anterior, 100);
      expect(r.cotizaciones.actual, 5);
      expect(r.porDia, hasLength(3));
      expect(r.obras.first.titulo, 'Cocina moderna');
      expect(r.origenes.map((o) => o.origen), ['TikTok', 'Directo']);
      expect(r.lugares.last.ciudad, isNull);
      expect(r.movil, 75);
      expect(r.tablet, 0);
      expect(r.vacio, isFalse);
    });

    test('una respuesta vacía o rara no rompe nada', () {
      final r = resumenVisitasDesde(null);
      expect(r.vacio, isTrue);
      expect(r.porDia, isEmpty);
      expect(resumenVisitasDesde({'data': 'algo raro'}).visitas.actual, 0);
    });
  });

  group('el periodo', () {
    test('empieza en 7 días y solo acepta los tres conocidos', () {
      final c = ProviderContainer(overrides: [visitasApiProvider.overrideWithValue(_ApiFalsa())]);
      addTearDown(c.dispose);
      expect(c.read(periodoVisitasProvider), '7d');
      c.read(periodoVisitasProvider.notifier).elegir('30d');
      expect(c.read(periodoVisitasProvider), '30d');
      c.read(periodoVisitasProvider.notifier).elegir('1año');
      expect(c.read(periodoVisitasProvider), '30d');
    });

    test('al cambiar de periodo se vuelve a pedir a la API con ese periodo', () async {
      final api = _ApiFalsa();
      final c = ProviderContainer(overrides: [visitasApiProvider.overrideWithValue(api)]);
      addTearDown(c.dispose);
      final sub = c.listen(resumenVisitasProvider, (_, _) {});
      addTearDown(sub.close);
      await c.read(resumenVisitasProvider.future);
      c.read(periodoVisitasProvider.notifier).elegir('hoy');
      final r = await c.read(resumenVisitasProvider.future);
      expect(api.pedidos, ['7d', 'hoy']);
      expect(r.periodo, 'hoy');
    });
  });

  group('la pantalla', () {
    testWidgets('muestra las cifras con su cambio y las listas', (tester) async {
      await tester.pumpWidget(_app(_ApiFalsa()));
      await tester.pumpAndSettle();

      expect(find.text('Visitas'), findsWidgets);
      expect(find.text('120'), findsOneWidget);
      expect(find.text('20 % más que los 7 días anteriores'), findsOneWidget);
      expect(find.text('nuevo, antes no había'), findsOneWidget); // cotizaciones: 5 contra 0
      expect(find.text('igual que los 7 días anteriores'), findsWidgets);
      expect(tester.takeException(), isNull);

      await tester.scrollUntilVisible(find.text('Obras más vistas'), 300, scrollable: find.byType(Scrollable).first);
      expect(find.text('Cocina moderna'), findsOneWidget);
      expect(find.text('40 visitas'), findsOneWidget);
      expect(find.text('1 visita'), findsOneWidget);
      await tester.scrollUntilVisible(find.text('De dónde llegan'), 300, scrollable: find.byType(Scrollable).first);
      expect(find.text('TikTok'), findsOneWidget);
      await tester.scrollUntilVisible(find.text('Ciudades'), 300, scrollable: find.byType(Scrollable).first);
      expect(find.text('Lima, Perú'), findsOneWidget);
      expect(find.text('Sin ubicación'), findsOneWidget);
      await tester.scrollUntilVisible(find.text('Con qué entran'), 300, scrollable: find.byType(Scrollable).first);
      expect(find.text('Celular'), findsOneWidget);
      expect(find.text('75 %'), findsOneWidget);
      expect(find.text('Tableta'), findsNothing, reason: 'sin visitas desde tableta no se muestra');
      expect(tester.takeException(), isNull);
    });

    testWidgets('cambiar de periodo vuelve a pedir y se ve cuál está elegido', (tester) async {
      final api = _ApiFalsa();
      await tester.pumpWidget(_app(api));
      await tester.pumpAndSettle();
      expect(api.pedidos, ['7d']);

      await tester.tap(find.text('30 días'));
      await tester.pumpAndSettle();
      expect(api.pedidos, ['7d', '30d']);
      expect(find.text('los 30 días anteriores'), findsNothing); // el texto lleva el % delante
      expect(find.text('20 % más que los 30 días anteriores'), findsOneWidget);

      await tester.tap(find.text('Hoy'));
      await tester.pumpAndSettle();
      expect(api.pedidos.last, 'hoy');
      expect(find.text('20 % más que ayer'), findsOneWidget);
    });

    testWidgets('sin visitas explica con calma qué pasa', (tester) async {
      await tester.pumpWidget(_app(_ApiFalsa(vacia: true)));
      await tester.pumpAndSettle();
      expect(find.text('Todavía no hay visitas'), findsOneWidget);
      expect(find.text('Cuando alguien entre a la web, lo vas a ver aquí.'), findsOneWidget);
      expect(find.text('Obras más vistas'), findsNothing);
    });

    testWidgets('si falla, dice qué pasó y deja reintentar', (tester) async {
      await tester.pumpWidget(_app(_ApiFalsa(falla: true)));
      await tester.pumpAndSettle();
      expect(find.text('No se pudieron cargar las visitas'), findsOneWidget);
      expect(find.text('No hay conexión. Revisa el Wi-Fi e inténtalo de nuevo.'), findsOneWidget);
      expect(find.text('Reintentar'), findsOneWidget);
    });
  });
}
