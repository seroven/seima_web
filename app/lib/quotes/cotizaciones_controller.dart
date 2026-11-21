import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../api/api_error.dart';
import 'cotizacion.dart';
import 'cotizaciones_api.dart';

final cotizacionesListaProvider = AsyncNotifierProvider<CotizacionesLista, List<CotizacionResumen>>(CotizacionesLista.new);

class CotizacionesLista extends AsyncNotifier<List<CotizacionResumen>> {
  @override
  Future<List<CotizacionResumen>> build() => ref.read(cotizacionesApiProvider).listar();
}

final cotizacionProvider = AsyncNotifierProvider.family<CotizacionDetalle, Cotizacion, String>(CotizacionDetalle.new);

class CotizacionDetalle extends AsyncNotifier<Cotizacion> {
  CotizacionDetalle(this.id);

  final String id;

  @override
  Future<Cotizacion> build() => ref.read(cotizacionesApiProvider).obtener(id);

  Future<String?> cambiarEstado(String estado) async {
    try {
      await ref.read(cotizacionesApiProvider).cambiarEstado(id, estado);
      final actual = state.value;
      if (actual != null) state = AsyncData(actual.conEstado(estado));
      ref.invalidate(cotizacionesListaProvider);
      return null;
    } on ApiException catch (error) {
      return error.message;
    }
  }
}
