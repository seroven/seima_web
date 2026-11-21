import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../api/api_error.dart';
import 'proyecto.dart';
import 'proyectos_api.dart';

final proyectosListaProvider = AsyncNotifierProvider<ProyectosLista, List<Proyecto>>(ProyectosLista.new);

class ProyectosLista extends AsyncNotifier<List<Proyecto>> {
  @override
  Future<List<Proyecto>> build() => ref.read(proyectosApiProvider).listar();
}

final proyectoProvider = AsyncNotifierProvider.family<ProyectoDetalle, Proyecto, String>(ProyectoDetalle.new);

class ProyectoDetalle extends AsyncNotifier<Proyecto> {
  ProyectoDetalle(this.id);

  final String id;

  @override
  Future<Proyecto> build() => ref.read(proyectosApiProvider).obtener(id);

  Future<String?> subirFoto({required String etapa, required List<int> bytes, required String nombre}) {
    return _guardar(() => ref.read(proyectosApiProvider).subirFoto(projectId: id, etapa: etapa, bytes: bytes, nombre: nombre));
  }

  Future<String?> quitarMedio(String medioId) {
    return _guardar(() => ref.read(proyectosApiProvider).quitarMedio(id, medioId));
  }

  Future<String?> reordenar(String etapa, List<String> ids) {
    return _guardar(() => ref.read(proyectosApiProvider).reordenar(id, etapa, ids));
  }

  Future<String?> cambiarEstado(String estado) {
    return _guardar(() => ref.read(proyectosApiProvider).cambiarEstado(id, estado));
  }

  Future<String?> eliminar() async {
    try {
      await ref.read(proyectosApiProvider).eliminar(id);
      ref.invalidate(proyectosListaProvider);
      return null;
    } on ApiException catch (error) {
      return error.message;
    }
  }

  Future<String?> _guardar(Future<Proyecto> Function() accion) async {
    try {
      final actual = await accion();
      state = AsyncData(actual);
      ref.invalidate(proyectosListaProvider);
      return null;
    } on ApiException catch (error) {
      return error.message;
    }
  }
}

final categoriasProvider = FutureProvider<List<OpcionCatalogo>>((ref) => ref.watch(proyectosApiProvider).categorias());

final serviciosProvider = FutureProvider<List<OpcionCatalogo>>((ref) => ref.watch(proyectosApiProvider).servicios());
