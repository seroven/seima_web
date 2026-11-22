import 'package:flutter/material.dart';

/// Un tipo de trabajo (Cocinas, Baños…): lo que se elige al crear una obra.
class TipoTrabajo {
  const TipoTrabajo({required this.id, required this.slug, required this.nombre, required this.orden, required this.activo, required this.obras});

  final String id;
  final String slug;
  final String nombre;
  final int orden;
  final bool activo;

  /// Cuántas obras (también borradores y ocultas) lo tienen.
  final int obras;
}

/// Un servicio del cotizador (Cocina, Pintura…).
class ServicioCot {
  const ServicioCot({
    required this.id,
    required this.slug,
    required this.nombre,
    required this.icono,
    required this.orden,
    required this.activo,
    required this.preguntas,
  });

  final String id;
  final String slug;
  final String nombre;
  final String icono;
  final int orden;
  final bool activo;

  /// Cuántas preguntas activas se le hacen al cliente con este servicio.
  final int preguntas;
}

class RefServicio {
  const RefServicio({required this.id, required this.slug, required this.nombre});

  final String id;
  final String slug;
  final String nombre;
}

/// Una opción de una pregunta («Estándar», «Otro»…). Puede pedir un dato más al elegirla.
class OpcionCot {
  const OpcionCot({
    required this.id,
    required this.slug,
    required this.etiqueta,
    required this.descripcion,
    required this.tipoEntrada,
    required this.entradaAyuda,
    required this.orden,
    required this.activo,
  });

  final String id;
  final String slug;
  final String etiqueta;
  final String? descripcion;

  /// `ninguna`, `texto` o `numero`.
  final String tipoEntrada;
  final String? entradaAyuda;
  final int orden;
  final bool activo;

  /// «Pide un número (m²)», «Pide un texto (¿Cuál?)» o vacío.
  String get resumenEntrada => switch (tipoEntrada) {
    'texto' => entradaAyuda == null ? 'Pide un texto' : 'Pide un texto ($entradaAyuda)',
    'numero' => entradaAyuda == null ? 'Pide un número' : 'Pide un número ($entradaAyuda)',
    _ => '',
  };
}

/// Una pregunta del cotizador con sus opciones y los servicios donde se hace.
class PreguntaCot {
  const PreguntaCot({
    required this.id,
    required this.slug,
    required this.texto,
    required this.etiqueta,
    required this.tipo,
    required this.orden,
    required this.activo,
    required this.servicios,
    required this.opciones,
    required this.visible,
  });

  final String id;
  final String slug;
  final String texto;
  final String etiqueta;

  /// `unica` (elige una) o `multiple` (elige varias).
  final String tipo;
  final int orden;
  final bool activo;
  final List<RefServicio> servicios;
  final List<OpcionCot> opciones;

  /// La web solo la muestra si está activa, tiene una opción activa y un servicio activo.
  final bool visible;

  bool get variasRespuestas => tipo == 'multiple';
  int get opcionesActivas => opciones.where((o) => o.activo).length;
  bool aplicaA(String servicioId) => servicios.any((s) => s.id == servicioId);

  String get resumenTipo => variasRespuestas ? 'Elige varias' : 'Elige una';
}

/// Íconos que la web sabe dibujar para un servicio, con su equivalente en la app.
const iconosServicio = <String, IconData>{
  'cocinas': Icons.kitchen,
  'banos': Icons.bathtub_outlined,
  'departamentos': Icons.apartment,
  'divisiones': Icons.view_week_outlined,
  'techos': Icons.roofing,
  'enchapado': Icons.grid_view,
  'electricidad': Icons.bolt,
  'melamina': Icons.weekend_outlined,
  'remodelaciones': Icons.format_paint_outlined,
  'locales': Icons.storefront,
  'generico': Icons.layers_outlined,
};

IconData iconoDeServicio(String icono) => iconosServicio[icono] ?? Icons.layers_outlined;

// ---- Lectura de lo que manda la API ----

List<TipoTrabajo> tiposDesde(Object? body) => [for (final item in _lista(body)) _tipo(item)];

TipoTrabajo tipoDesde(Object? body) => _tipo(_dato(body));

List<ServicioCot> serviciosCotDesde(Object? body) => [for (final item in _lista(body)) _servicio(item)];

ServicioCot servicioCotDesde(Object? body) => _servicio(_dato(body));

List<PreguntaCot> preguntasCotDesde(Object? body) => [for (final item in _lista(body)) _pregunta(item)];

PreguntaCot preguntaCotDesde(Object? body) => _pregunta(_dato(body));

TipoTrabajo _tipo(Map<String, dynamic> m) => TipoTrabajo(
  id: _texto(m['id']),
  slug: _texto(m['slug']),
  nombre: _texto(m['nombre']),
  orden: _entero(m['orden']),
  activo: m['activo'] != false,
  obras: _entero(m['obras']),
);

ServicioCot _servicio(Map<String, dynamic> m) => ServicioCot(
  id: _texto(m['id']),
  slug: _texto(m['slug']),
  nombre: _texto(m['nombre']),
  icono: _texto(m['icono']).isEmpty ? 'generico' : _texto(m['icono']),
  orden: _entero(m['orden']),
  activo: m['activo'] != false,
  preguntas: _entero(m['preguntas']),
);

PreguntaCot _pregunta(Map<String, dynamic> m) => PreguntaCot(
  id: _texto(m['id']),
  slug: _texto(m['slug']),
  texto: _texto(m['texto']),
  etiqueta: _texto(m['etiqueta']),
  tipo: _texto(m['tipo']) == 'multiple' ? 'multiple' : 'unica',
  orden: _entero(m['orden']),
  activo: m['activo'] != false,
  servicios: [
    for (final s in _listaDe(m['servicios']))
      RefServicio(id: _texto(s['id']), slug: _texto(s['slug']), nombre: _texto(s['nombre'])),
  ],
  opciones: [for (final o in _listaDe(m['opciones'])) _opcion(o)],
  visible: m['visible'] == true,
);

OpcionCot _opcion(Map<String, dynamic> m) {
  final descripcion = _texto(m['descripcion']).trim();
  final ayuda = _texto(m['entradaAyuda']).trim();
  final entrada = _texto(m['tipoEntrada']);
  return OpcionCot(
    id: _texto(m['id']),
    slug: _texto(m['slug']),
    etiqueta: _texto(m['etiqueta']),
    descripcion: descripcion.isEmpty ? null : descripcion,
    tipoEntrada: entrada == 'texto' || entrada == 'numero' ? entrada : 'ninguna',
    entradaAyuda: ayuda.isEmpty ? null : ayuda,
    orden: _entero(m['orden']),
    activo: m['activo'] != false,
  );
}

Map<String, dynamic> _dato(Object? body) {
  final raiz = _mapa(body);
  return _mapa(raiz?['data']) ?? raiz ?? const {};
}

List<Map<String, dynamic>> _lista(Object? body) {
  final raiz = _mapa(body);
  return _listaDe(raiz?['data'] ?? body);
}

List<Map<String, dynamic>> _listaDe(Object? valor) {
  if (valor is! List) return const [];
  return [for (final item in valor) ?_mapa(item)];
}

Map<String, dynamic>? _mapa(Object? valor) => valor is Map ? Map<String, dynamic>.from(valor) : null;

String _texto(Object? valor) => valor is String ? valor : '';

int _entero(Object? valor) => valor is num ? valor.toInt() : 0;
