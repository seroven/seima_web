import 'package:flutter/widgets.dart';
import 'package:go_router/go_router.dart';

/// El botón de «volver» de las pantallas de detalle.
///
/// `context.pop()` solo sirve si hay una pantalla debajo. Si la pantalla se abrió con `go` (al terminar de crear una
/// obra, o al tocar el aviso de una cotización) no hay nada debajo y `pop()` no hace nada: el botón parece roto.
/// Aquí, si no hay a dónde volver, se va a la pantalla de [alternativa] (la pestaña de donde se suele venir).
extension VolverDesde on BuildContext {
  void volver(String alternativa) {
    if (canPop()) {
      pop();
    } else {
      go(alternativa);
    }
  }
}

/// Abre [destino] dejando [base] debajo, para que «volver» regrese ahí. Sirve cuando la pantalla se abre desde fuera
/// de la app (un aviso en el celular) y no desde un toque dentro de ella.
void abrirApilando(GoRouter router, String base, String destino) {
  router.go(base);
  router.push(destino);
}

/// La cotización de un aviso: con las cotizaciones debajo.
void abrirCotizacion(GoRouter router, String id) => abrirApilando(router, '/cotizaciones', '/cotizacion/$id');
