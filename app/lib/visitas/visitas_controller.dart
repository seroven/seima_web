import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'visitas.dart';
import 'visitas_api.dart';

/// Qué periodo se está viendo: `hoy`, `7d` o `30d`. Por defecto, 7 días.
final periodoVisitasProvider = NotifierProvider<PeriodoVisitas, String>(PeriodoVisitas.new);

class PeriodoVisitas extends Notifier<String> {
  @override
  String build() => '7d';

  void elegir(String periodo) {
    if (periodosVisitas.contains(periodo)) state = periodo;
  }
}

/// El resumen del periodo elegido. Al cambiar de periodo se vuelve a pedir; el gesto de «jalar para actualizar» también.
final resumenVisitasProvider = AsyncNotifierProvider<ResumenVisitasController, ResumenVisitas>(ResumenVisitasController.new);

class ResumenVisitasController extends AsyncNotifier<ResumenVisitas> {
  @override
  Future<ResumenVisitas> build() {
    final periodo = ref.watch(periodoVisitasProvider);
    return ref.read(visitasApiProvider).resumen(periodo);
  }
}
