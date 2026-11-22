const minTramoMs = 1000;

class VentanaRecorte {
  const VentanaRecorte(this.inicioMs, this.finMs);

  final int inicioMs;
  final int finMs;

  int get duracionMs => finMs - inicioMs;
}

/// El tramo inicial cabe en el tope: desde el comienzo, o el video entero si ya es más corto.
VentanaRecorte ventanaInicial({required int duracionMs, required int topeMs}) {
  final total = duracionMs < 1 ? 1 : duracionMs;
  final fin = topeMs < 1 ? 1 : (topeMs > total ? total : topeMs);
  return VentanaRecorte(0, fin < 1 ? 1 : fin);
}

/// Desliza el tramo sin cambiar lo que dura.
VentanaRecorte moverInicio(VentanaRecorte actual, int inicioMs, {required int duracionMs, required int topeMs}) {
  final total = duracionMs < 1 ? 1 : duracionMs;
  final largo = _largo(actual.duracionMs, total, topeMs);
  final inicio = _entre(inicioMs, 0, total - largo);
  return VentanaRecorte(inicio, inicio + largo);
}

/// Cambia el final. No puede durar más que el tope ni menos de un segundo.
VentanaRecorte moverFin(VentanaRecorte actual, int finMs, {required int duracionMs, required int topeMs}) {
  final total = duracionMs < 1 ? 1 : duracionMs;
  final minimo = total < minTramoMs ? total : minTramoMs;
  final tope = topeMs < minimo ? minimo : (topeMs > total ? total : topeMs);
  final fin = _entre(finMs, actual.inicioMs + minimo, actual.inicioMs + tope > total ? total : actual.inicioMs + tope);
  final inicio = fin - actual.inicioMs > tope ? fin - tope : actual.inicioMs;
  return VentanaRecorte(inicio < 0 ? 0 : inicio, fin);
}

int _largo(int pedido, int total, int topeMs) {
  final minimo = total < minTramoMs ? total : minTramoMs;
  final tope = topeMs < minimo ? minimo : (topeMs > total ? total : topeMs);
  if (pedido < minimo) return minimo;
  if (pedido > tope) return tope;
  return pedido;
}

int _entre(int valor, int piso, int techo) {
  if (techo < piso) return piso;
  if (valor < piso) return piso;
  if (valor > techo) return techo;
  return valor;
}
