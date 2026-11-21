class CotizacionResumen {
  const CotizacionResumen({
    required this.id,
    required this.estado,
    required this.cliente,
    required this.nombre,
    required this.distrito,
    required this.servicios,
    required this.creadaEn,
  });

  final String id;
  final String estado;
  final String cliente;
  final String nombre;
  final String distrito;
  final List<String> servicios;
  final String creadaEn;
}

class RespuestaCliente {
  const RespuestaCliente({required this.pregunta, required this.valor});

  final String pregunta;
  final String valor;
}

class FotoCliente {
  const FotoCliente({required this.id, required this.url});

  final String id;
  final String url;
}

class Cotizacion extends CotizacionResumen {
  const Cotizacion({
    required super.id,
    required super.estado,
    required super.cliente,
    required super.nombre,
    required super.distrito,
    required super.servicios,
    required super.creadaEn,
    required this.plazo,
    required this.notas,
    required this.whatsapp,
    required this.razonSocial,
    required this.ruc,
    required this.mensaje,
    required this.respuestas,
    required this.fotos,
  });

  final String plazo;
  final String notas;
  final String whatsapp;
  final String razonSocial;
  final String ruc;
  final String mensaje;
  final List<RespuestaCliente> respuestas;
  final List<FotoCliente> fotos;

  Cotizacion conEstado(String estado) {
    return Cotizacion(
      id: id,
      estado: estado,
      cliente: cliente,
      nombre: nombre,
      distrito: distrito,
      servicios: servicios,
      creadaEn: creadaEn,
      plazo: plazo,
      notas: notas,
      whatsapp: whatsapp,
      razonSocial: razonSocial,
      ruc: ruc,
      mensaje: mensaje,
      respuestas: respuestas,
      fotos: fotos,
    );
  }
}

String etiquetaEstado(String estado) => switch (estado) {
  'contactada' => 'Ya la contacté',
  'cerrada' => 'Cerrada',
  'descartada' => 'Descartada',
  _ => 'Nueva',
};

String etiquetaAccion(String estado) => switch (estado) {
  'cerrada' => 'Cerrada',
  'descartada' => 'Descartar',
  _ => 'Ya la contacté',
};

List<String> accionesDeEstado(String estado) => switch (estado) {
  'contactada' => const ['cerrada', 'descartada'],
  'cerrada' || 'descartada' => const ['contactada'],
  _ => const ['contactada', 'cerrada', 'descartada'],
};

int contarNuevas(Iterable<CotizacionResumen> lista) => lista.where((c) => c.estado == 'nueva').length;

String insigniaNuevas(int total) => total > 9 ? '9+' : '$total';

String fechaCorta(String iso) {
  final fecha = DateTime.tryParse(iso)?.toLocal();
  if (fecha == null) return '';
  const meses = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'set', 'oct', 'nov', 'dic'];
  return '${fecha.day} ${meses[fecha.month - 1]} ${fecha.year}';
}

String plazoLegible(String plazo) => switch (plazo) {
  'asap' => 'Lo antes posible',
  '1mes' => 'En 1 mes',
  'sinapuro' => 'Sin apuro',
  _ => plazo,
};

/// Número listo para wa.me y para llamar, con código de Perú. null si no es un celular.
String? celularPeru(String crudo) {
  final digitos = crudo.replaceAll(RegExp(r'\D'), '');
  if (RegExp(r'^9\d{8}$').hasMatch(digitos)) return '51$digitos';
  if (RegExp(r'^519\d{8}$').hasMatch(digitos)) return digitos;
  return null;
}

String celularVisible(String crudo) {
  final completo = celularPeru(crudo);
  final local = completo == null ? crudo : completo.substring(2);
  if (local.length != 9) return crudo.trim();
  return '${local.substring(0, 3)} ${local.substring(3, 6)} ${local.substring(6)}';
}

Uri enlaceCliente(String numero) => Uri.https('wa.me', '/$numero');

Uri enlaceLlamada(String numero) => Uri(scheme: 'tel', path: '+$numero');

List<CotizacionResumen> cotizacionesDesde(Object? body) {
  final lista = body is Map ? body['data'] : null;
  if (lista is! List) return const [];
  return lista.map(_resumen).whereType<CotizacionResumen>().toList();
}

Cotizacion cotizacionDesde(Object? body) {
  final data = body is Map ? body['data'] : body;
  final mapa = data is Map ? Map<String, dynamic>.from(data) : null;
  final base = mapa == null ? null : _resumen(mapa);
  if (mapa == null || base == null) {
    throw const FormatException('La cotización no se entiende');
  }
  return Cotizacion(
    id: base.id,
    estado: base.estado,
    cliente: base.cliente,
    nombre: base.nombre,
    distrito: base.distrito,
    servicios: base.servicios,
    creadaEn: base.creadaEn,
    plazo: _texto(mapa['plazo']),
    notas: _texto(mapa['notas']),
    whatsapp: _texto(mapa['whatsapp']),
    razonSocial: _texto(mapa['razonSocial']),
    ruc: _texto(mapa['ruc']),
    mensaje: _texto(mapa['mensaje']),
    respuestas: _respuestas(mapa['respuestas']),
    fotos: _fotos(mapa['fotos']),
  );
}

CotizacionResumen? _resumen(Object? item) {
  if (item is! Map) return null;
  final id = _texto(item['id']);
  if (id.isEmpty) return null;
  final servicios = item['servicios'];
  final nombres = servicios is List
      ? servicios.map((s) => s is Map ? _texto(s['nombre']) : '').where((n) => n.isNotEmpty).toList()
      : const <String>[];
  return CotizacionResumen(
    id: id,
    estado: _texto(item['estado']).isEmpty ? 'nueva' : _texto(item['estado']),
    cliente: _texto(item['cliente']),
    nombre: _texto(item['nombre']).isEmpty ? 'Sin nombre' : _texto(item['nombre']),
    distrito: _texto(item['distrito']),
    servicios: nombres,
    creadaEn: _texto(item['creadaEn']),
  );
}

List<RespuestaCliente> _respuestas(Object? lista) {
  if (lista is! List) return const [];
  return lista.map((item) {
    if (item is! Map) return null;
    final pregunta = _texto(item['preguntaEtiqueta']);
    final extra = _texto(item['valor']);
    final opcion = _texto(item['opcionEtiqueta']);
    final valor = extra.isNotEmpty ? extra : opcion;
    if (pregunta.isEmpty && valor.isEmpty) return null;
    return RespuestaCliente(pregunta: pregunta.isEmpty ? 'Dato' : pregunta, valor: valor);
  }).whereType<RespuestaCliente>().toList();
}

List<FotoCliente> _fotos(Object? lista) {
  if (lista is! List) return const [];
  return lista.map((item) {
    if (item is! Map) return null;
    final url = _texto(item['url']);
    if (url.isEmpty) return null;
    return FotoCliente(id: _texto(item['id']), url: url);
  }).whereType<FotoCliente>().toList();
}

String _texto(Object? valor) => valor is String ? valor.trim() : '';
