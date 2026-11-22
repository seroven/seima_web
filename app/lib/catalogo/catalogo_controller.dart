import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../api/api_error.dart';
import '../projects/proyectos_controller.dart';
import 'catalogo.dart';
import 'catalogo_api.dart';

/// Lo que pasa al arrastrar un elemento de [viejo] a [nuevo] en una lista reordenable de Flutter
/// (`onReorderItem`: [nuevo] ya es la posición final del elemento, contando que sale de su sitio). Devuelve una copia.
List<T> reordenado<T>(List<T> lista, int viejo, int nuevo) {
  final copia = [...lista];
  if (viejo < 0 || viejo >= copia.length) return copia;
  copia.insert(nuevo.clamp(0, copia.length - 1), copia.removeAt(viejo));
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

  /// Arrastrar: la lista cambia YA en pantalla y luego se guarda; si falla, se vuelve a cargar lo que hay en el servidor.
  Future<String?> reordenar(int viejo, int nuevo) async {
    final actual = state.value;
    if (actual == null) return null;
    final lista = reordenado(actual, viejo, nuevo);
    state = AsyncData(lista);
    final api = ref.read(catalogoApiProvider);
    try {
      await api.ordenarTipos([for (final t in lista) t.id]);
      ref.invalidate(categoriasProvider);
      return null;
    } on ApiException catch (error) {
      state = AsyncData(await _intentar(api.tipos, actual));
      return error.message;
    }
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

  Future<String?> reordenar(int viejo, int nuevo) async {
    final actual = state.value;
    if (actual == null) return null;
    final lista = reordenado(actual, viejo, nuevo);
    state = AsyncData(lista);
    final api = ref.read(catalogoApiProvider);
    try {
      await api.ordenarServicios([for (final s in lista) s.id]);
      ref.invalidate(serviciosProvider);
      return null;
    } on ApiException catch (error) {
      state = AsyncData(await _intentar(api.servicios, actual));
      return error.message;
    }
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

  /// Arrastrar una pregunta DENTRO de un servicio. [propias] son las preguntas de ese servicio en el orden en que se ven.
  /// Se reparten entre ellas los mismos números de orden que ya tenían, así las de los demás servicios no se mueven.
  Future<String?> reordenarDeServicio(List<PreguntaCot> propias, int viejo, int nuevo) async {
    final actual = state.value;
    if (actual == null) return null;
    final nuevoOrden = reordenado(propias, viejo, nuevo);
    final ordenes = [for (final p in propias) p.orden]..sort();
    final ordenNuevo = {for (var i = 0; i < nuevoOrden.length; i++) nuevoOrden[i].id: ordenes[i]};
    state = AsyncData([for (final p in actual) ordenNuevo.containsKey(p.id) ? p.copiaCon(orden: ordenNuevo[p.id]) : p]);
    final api = ref.read(catalogoApiProvider);
    try {
      await api.ordenarPreguntas([for (final p in nuevoOrden) p.id]);
      return null;
    } on ApiException catch (error) {
      state = AsyncData(await _intentar(api.preguntas, actual));
      return error.message;
    }
  }

  Future<String?> crearOpcion(String preguntaId, {required String etiqueta, String? descripcion, required String tipoEntrada, String? entradaAyuda}) {
    return _hacer((api) => api.crearOpcion(preguntaId, etiqueta: etiqueta, descripcion: descripcion, tipoEntrada: tipoEntrada, entradaAyuda: entradaAyuda));
  }

  Future<String?> cambiarOpcion(String id, {String? etiqueta, String? descripcion, String? tipoEntrada, String? entradaAyuda, bool? activo}) {
    return _hacer(
      (api) => api.cambiarOpcion(id, etiqueta: etiqueta, descripcion: descripcion, tipoEntrada: tipoEntrada, entradaAyuda: entradaAyuda, activo: activo),
    );
  }

  Future<String?> reordenarOpciones(String preguntaId, int viejo, int nuevo) async {
    final actual = state.value;
    final pregunta = actual?.where((p) => p.id == preguntaId).firstOrNull;
    if (actual == null || pregunta == null) return null;
    final lista = reordenado(pregunta.opciones, viejo, nuevo);
    final conOrden = [for (var i = 0; i < lista.length; i++) lista[i].conOrden(i)];
    state = AsyncData([for (final p in actual) p.id == preguntaId ? p.copiaCon(opciones: conOrden) : p]);
    final api = ref.read(catalogoApiProvider);
    try {
      await api.ordenarOpciones(preguntaId, [for (final o in lista) o.id]);
      return null;
    } on ApiException catch (error) {
      state = AsyncData(await _intentar(api.preguntas, actual));
      return error.message;
    }
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

/// Vuelve a pedir la lista al servidor; si tampoco se puede, deja la que había antes.
Future<List<T>> _intentar<T>(Future<List<T>> Function() cargar, List<T> respaldo) async {
  try {
    return await cargar();
  } on ApiException {
    return respaldo;
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
