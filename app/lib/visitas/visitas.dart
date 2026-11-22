/// Lo que la app muestra en «Visitas»: cuántas personas entraron a la web, de dónde vienen y qué miran.
/// Todo viene ya contado desde la API (`GET analytics/summary`); aquí solo se lee y se pone en palabras simples.
library;

/// Un número de este periodo y el del periodo anterior (para decir «subió» o «bajó»).
class Cifra {
  const Cifra({required this.actual, required this.anterior});

  final int actual;
  final int anterior;

  static const cero = Cifra(actual: 0, anterior: 0);
}

class VisitasDia {
  const VisitasDia({required this.fecha, required this.visitas, required this.visitantes});

  /// AAAA-MM-DD (día de Lima).
  final String fecha;
  final int visitas;
  final int visitantes;
}

class ObraVista {
  const ObraVista({required this.slug, required this.titulo, required this.visitas, required this.visitantes});

  final String slug;
  final String titulo;
  final int visitas;
  final int visitantes;
}

class PaginaVista {
  const PaginaVista({required this.ruta, required this.nombre, required this.visitas});

  final String ruta;
  final String nombre;
  final int visitas;
}

class OrigenVisitas {
  const OrigenVisitas({required this.origen, required this.visitas});

  final String origen;
  final int visitas;
}

class LugarVisitas {
  const LugarVisitas({required this.pais, required this.ciudad, required this.visitas});

  final String pais;
  final String? ciudad;
  final int visitas;
}

class ResumenVisitas {
  const ResumenVisitas({
    required this.periodo,
    required this.visitas,
    required this.visitantes,
    required this.cotizaciones,
    required this.whatsapp,
    required this.compartidos,
    required this.porDia,
    required this.obras,
    required this.paginas,
    required this.origenes,
    required this.lugares,
    required this.movil,
    required this.escritorio,
    required this.tablet,
  });

  /// `hoy`, `7d` o `30d`.
  final String periodo;
  final Cifra visitas;
  final Cifra visitantes;
  final Cifra cotizaciones;
  final Cifra whatsapp;
  final Cifra compartidos;
  final List<VisitasDia> porDia;
  final List<ObraVista> obras;
  final List<PaginaVista> paginas;
  final List<OrigenVisitas> origenes;
  final List<LugarVisitas> lugares;
  final int movil;
  final int escritorio;
  final int tablet;

  /// Sin una sola visita ni nada que contar.
  bool get vacio => visitas.actual == 0 && cotizaciones.actual == 0 && whatsapp.actual == 0 && compartidos.actual == 0;
}

/// Los tres periodos que se pueden ver.
const periodosVisitas = ['hoy', '7d', '30d'];

String etiquetaPeriodo(String periodo) => switch (periodo) {
  'hoy' => 'Hoy',
  '7d' => '7 días',
  _ => '30 días',
};

/// «Ayer», «la semana pasada»…: con qué se compara el número.
String comparadoCon(String periodo) => switch (periodo) {
  'hoy' => 'ayer',
  '7d' => 'los 7 días anteriores',
  _ => 'los 30 días anteriores',
};

/// Cómo cambió un número respecto al periodo anterior.
enum Tendencia { sube, baja, igual, nuevo }

class Variacion {
  const Variacion(this.tendencia, this.porcentaje);

  final Tendencia tendencia;

  /// Porcentaje redondeado y sin signo (solo si `tendencia` es `sube` o `baja`).
  final int porcentaje;

  /// «25 % más», «10 % menos», «igual», «nuevo». Vacío si no hay nada que decir.
  String get texto => switch (tendencia) {
    Tendencia.sube => '$porcentaje % más',
    Tendencia.baja => '$porcentaje % menos',
    Tendencia.igual => 'igual',
    Tendencia.nuevo => 'nuevo',
  };
}

/// null cuando no hay nada que comparar (ni ahora ni antes hubo nada).
Variacion? variacion(Cifra cifra) {
  if (cifra.actual == 0 && cifra.anterior == 0) return null;
  if (cifra.anterior == 0) return const Variacion(Tendencia.nuevo, 0);
  if (cifra.actual == cifra.anterior) return const Variacion(Tendencia.igual, 0);
  final pct = ((cifra.actual - cifra.anterior).abs() / cifra.anterior * 100).round();
  // Un cambio chico (menos de 1 %) se dice «igual», no «0 % más».
  if (pct == 0) return const Variacion(Tendencia.igual, 0);
  return Variacion(cifra.actual > cifra.anterior ? Tendencia.sube : Tendencia.baja, pct);
}

/// `2026-11-22` → «22 nov». Si no se entiende, devuelve el texto tal cual.
String diaCorto(String fecha) {
  final partes = fecha.split('-');
  if (partes.length != 3) return fecha;
  final mes = int.tryParse(partes[1]);
  final dia = int.tryParse(partes[2]);
  if (mes == null || dia == null || mes < 1 || mes > 12) return fecha;
  const meses = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'set', 'oct', 'nov', 'dic'];
  return '$dia ${meses[mes - 1]}';
}

/// «Lima, Perú» / «Perú» / «Sin ubicación».
String lugarTexto(LugarVisitas lugar) {
  final ciudad = lugar.ciudad?.trim() ?? '';
  return ciudad.isEmpty ? lugar.pais : '$ciudad, ${lugar.pais}';
}

/// Porcentaje entero de [parte] sobre [total] (0 si no hay total).
int porcentajeDe(int parte, int total) => total <= 0 ? 0 : (parte / total * 100).round();

/// «1 visita» / «12 visitas».
String visitasTexto(int n) => n == 1 ? '1 visita' : '$n visitas';

/// Número con separador de miles para que se lea fácil: 1234 → «1 234».
String miles(int n) {
  final texto = n.abs().toString();
  final buffer = StringBuffer();
  for (var i = 0; i < texto.length; i++) {
    if (i > 0 && (texto.length - i) % 3 == 0) buffer.write(' ');
    buffer.write(texto[i]);
  }
  return n < 0 ? '-$buffer' : buffer.toString();
}

// ---------------------------------------------------------------------------------------------
// Lectura de lo que responde la API
// ---------------------------------------------------------------------------------------------

ResumenVisitas resumenVisitasDesde(Object? body) {
  final raiz = _mapa(body);
  final d = _mapa(raiz?['data']) ?? raiz ?? const <String, dynamic>{};
  final disp = _mapa(d['dispositivos']) ?? const <String, dynamic>{};
  return ResumenVisitas(
    periodo: _texto(d['periodo']),
    visitas: _cifra(d['visitas']),
    visitantes: _cifra(d['visitantes']),
    cotizaciones: _cifra(d['cotizaciones']),
    whatsapp: _cifra(d['whatsapp']),
    compartidos: _cifra(d['compartidos']),
    porDia: [for (final x in _lista(d['porDia'])) VisitasDia(fecha: _texto(x['fecha']), visitas: _entero(x['visitas']), visitantes: _entero(x['visitantes']))],
    obras: [
      for (final x in _lista(d['proyectos']))
        ObraVista(slug: _texto(x['slug']), titulo: _texto(x['titulo']), visitas: _entero(x['visitas']), visitantes: _entero(x['visitantes'])),
    ],
    paginas: [for (final x in _lista(d['paginas'])) PaginaVista(ruta: _texto(x['ruta']), nombre: _texto(x['nombre']), visitas: _entero(x['visitas']))],
    origenes: [for (final x in _lista(d['origenes'])) OrigenVisitas(origen: _texto(x['origen']), visitas: _entero(x['visitas']))],
    lugares: [
      for (final x in _lista(d['lugares']))
        LugarVisitas(pais: _texto(x['pais']), ciudad: x['ciudad'] is String ? x['ciudad'] as String : null, visitas: _entero(x['visitas'])),
    ],
    movil: _entero(disp['movil']),
    escritorio: _entero(disp['escritorio']),
    tablet: _entero(disp['tablet']),
  );
}

Cifra _cifra(Object? valor) {
  final m = _mapa(valor);
  return Cifra(actual: _entero(m?['actual']), anterior: _entero(m?['anterior']));
}

List<Map<String, dynamic>> _lista(Object? valor) {
  if (valor is! List) return const [];
  return [for (final item in valor) ?_mapa(item)];
}

Map<String, dynamic>? _mapa(Object? valor) => valor is Map ? Map<String, dynamic>.from(valor) : null;

String _texto(Object? valor) => valor is String ? valor : '';

int _entero(Object? valor) => valor is num ? valor.toInt() : 0;
