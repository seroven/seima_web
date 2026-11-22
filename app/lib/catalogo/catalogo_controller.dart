import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../api/api_error.dart';
import '../projects/proyectos_controller.dart';
import 'catalogo.dart';
import 'catalogo_api.dart';

/// Cambia de lugar un elemento de una lista de ids (arriba = -1, abajo = +1). null si no se puede mover.
List<String>? movido(List<String> ids, String id, int delta) {
  final i = ids.indexOf(id);
  final j = i + delta;
  if (i < 0 || j < 0 || j >= ids.length) return null;
  final copia = [...ids];
  final otro = copia[j];
  copia[j] = copia[i];
  copia[i] = otro;
  return copia;
}

// ---------------------------------------------------------------------------------------------
// Tipos de trabajo
// ---------------------------------------------------------------------------------------------

final tiposProvider = AsyncNotifierProvider<TiposController, List<TipoTrabajo>>(TiposController.new);

class TiposController extends AsyncNotifier<List<TipoTrabajo>> {
  @override
  Future<List<TipoTrabajo>> build() => ref.read(catalogoApiProvider).tipos();

  Future<String?> crear(String nombre) => _hacer((api) => api.crearTipo(nombre));

  Future<String?> renombrar(String id, String nombre) => _hacer((api) => api.cambiarTipo(id, nombre: nombre));

  Future<String?> activar(String id, bool activo) => _hacer((api) => api.cambiarTipo(id, activo: activo));

  Future<String?> mover(String id, int delta) async {
    final ids = movido([for (final t in state.value ?? const <TipoTrabajo>[]) t.id], id, delta);
    if (ids == null) return null;
    return _hacer((api) => api.ordenarTipos(ids));
  }

  Future<String?> _hacer(Future<Object?> Function(CatalogoApi api) accion) async {
    final api = ref.read(catalogoApiProvider);
    try {
      await accion(api);
      state = AsyncData(await api.tipos());
      // La pantalla de «Nuevo proyecto» elige entre los tipos activos.
      ref.invalidate(categoriasProvider);
      ref.invalidate(proyectosListaProvider);
      return null;
    } on ApiException catch (error) {
      return error.message;
    }
  }
}

// ---------------------------------------------------------------------------------------------
// Servicios del cotizador
// ---------------------------------------------------------------------------------------------

final serviciosCotProvider = AsyncNotifierProvider<ServiciosCotController, List<ServicioCot>>(ServiciosCotController.new);

class ServiciosCotController extends AsyncNotifier<List<ServicioCot>> {
  @override
  Future<List<ServicioCot>> build() => ref.read(catalogoApiProvider).servicios();

  /// Devuelve el servicio creado (para abrirlo) o el motivo del error.
  Future<(String?, ServicioCot?)> crear({required String nombre, required String icono}) async {
    final api = ref.read(catalogoApiProvider);
    try {
      final creado = await api.crearServicio(nombre: nombre, icono: icono);
      await recargar();
      return (null, creado);
    } on ApiException catch (error) {
      return (error.message, null);
    }
  }

  Future<String?> cambiar(String id, {String? nombre, String? icono, bool? activo}) {
    return _hacer((api) => api.cambiarServicio(id, nombre: nombre, icono: icono, activo: activo));
  }

  Future<String?> mover(String id, int delta) async {
    final ids = movido([for (final s in state.value ?? const <ServicioCot>[]) s.id], id, delta);
    if (ids == null) return null;
    return _hacer((api) => api.ordenarServicios(ids));
  }

  Future<void> recargar() async {
    state = AsyncData(await ref.read(catalogoApiProvider).servicios());
    // El formulario de «Nuevo proyecto» lista los servicios activos del cotizador.
    ref.invalidate(serviciosProvider);
  }

  Future<String?> _hacer(Future<Object?> Function(CatalogoApi api) accion) async {
    try {
      await accion(ref.read(catalogoApiProvider));
      await recargar();
      return null;
    } on ApiException catch (error) {
      return error.message;
    }
  }
}

// ---------------------------------------------------------------------------------------------
// Preguntas y opciones
// ---------------------------------------------------------------------------------------------

final preguntasCotProvider = AsyncNotifierProvider<PreguntasCotController, List<PreguntaCot>>(PreguntasCotController.new);

class PreguntasCotController extends AsyncNotifier<List<PreguntaCot>> {
  @override
  Future<List<PreguntaCot>> build() => ref.read(catalogoApiProvider).preguntas();

  /// Devuelve la pregunta creada (para abrirla y agregarle opciones) o el motivo del error.
  Future<(String?, PreguntaCot?)> crear({required String texto, required String etiqueta, required String tipo, required List<String> servicios}) async {
    try {
      final creada = await ref.read(catalogoApiProvider).crearPregunta(texto: texto, etiqueta: etiqueta, tipo: tipo, servicios: servicios);
      await _recargar();
      return (null, creada);
    } on ApiException catch (error) {
      return (error.message, null);
    }
  }

  Future<String?> cambiar(String id, {String? texto, String? etiqueta, String? tipo, bool? activo, List<String>? servicios}) {
    return _hacer((api) => api.cambiarPregunta(id, texto: texto, etiqueta: etiqueta, tipo: tipo, activo: activo, servicios: servicios));
  }

  /// Sube o baja una pregunta DENTRO de un servicio (las de los demás servicios no se mueven).
  Future<String?> mover({required String servicioId, required String id, required int delta}) {
    final delServicio = [...(state.value ?? const <PreguntaCot>[]).where((p) => p.aplicaA(servicioId))]..sort((a, b) => a.orden.compareTo(b.orden));
    final ids = movido([for (final p in delServicio) p.id], id, delta);
    if (ids == null) return Future.value();
    return _hacer((api) => api.ordenarPreguntas(ids));
  }

  Future<String?> crearOpcion(String preguntaId, {required String etiqueta, String? descripcion, required String tipoEntrada, String? entradaAyuda}) {
    return _hacer((api) => api.crearOpcion(preguntaId, etiqueta: etiqueta, descripcion: descripcion, tipoEntrada: tipoEntrada, entradaAyuda: entradaAyuda));
  }

  Future<String?> cambiarOpcion(String id, {String? etiqueta, String? descripcion, String? tipoEntrada, String? entradaAyuda, bool? activo}) {
    return _hacer(
      (api) => api.cambiarOpcion(id, etiqueta: etiqueta, descripcion: descripcion, tipoEntrada: tipoEntrada, entradaAyuda: entradaAyuda, activo: activo),
    );
  }

  Future<String?> moverOpcion({required String preguntaId, required String id, required int delta}) {
    final pregunta = (state.value ?? const <PreguntaCot>[]).where((p) => p.id == preguntaId).firstOrNull;
    if (pregunta == null) return Future.value();
    final ids = movido([for (final o in pregunta.opciones) o.id], id, delta);
    if (ids == null) return Future.value();
    return _hacer((api) => api.ordenarOpciones(preguntaId, ids));
  }

  Future<void> _recargar() async {
    state = AsyncData(await ref.read(catalogoApiProvider).preguntas());
    // Cambia cuántas preguntas tiene cada servicio y lo que ve el cliente en el cotizador.
    ref.invalidate(serviciosCotProvider);
  }

  Future<String?> _hacer(Future<Object?> Function(CatalogoApi api) accion) async {
    try {
      await accion(ref.read(catalogoApiProvider));
      await _recargar();
      return null;
    } on ApiException catch (error) {
      return error.message;
    }
  }
}

/// Un servicio por id, de la lista ya cargada.
final servicioCotPorId = Provider.family<AsyncValue<ServicioCot?>, String>((ref, id) {
  return ref.watch(serviciosCotProvider).whenData((lista) => lista.where((s) => s.id == id).firstOrNull);
});

/// Una pregunta por id, de la lista ya cargada.
final preguntaCotPorId = Provider.family<AsyncValue<PreguntaCot?>, String>((ref, id) {
  return ref.watch(preguntasCotProvider).whenData((lista) => lista.where((p) => p.id == id).firstOrNull);
});
