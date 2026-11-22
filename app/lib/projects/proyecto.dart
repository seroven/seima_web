class Medio {
  const Medio({
    required this.id,
    required this.etapa,
    required this.tipo,
    required this.orden,
    required this.esPrincipal,
    required this.esPortada,
    required this.estado,
    this.ancho,
    this.alto,
    this.duracionMs,
    this.url,
    this.poster,
  });

  final String id;
  final String etapa;
  final String tipo;
  final int orden;
  final bool esPrincipal;
  final bool esPortada;
  final String estado;
  final int? ancho;
  final int? alto;
  final int? duracionMs;
  final String? url;
  final String? poster;

  bool get listo => estado == 'listo';

  String get vista => (tipo == 'video' ? poster : url) ?? url ?? '';
}

class Proyecto {
  const Proyecto({
    required this.id,
    required this.titulo,
    required this.estado,
    required this.categorias,
    required this.distrito,
    required this.areaM2,
    required this.dias,
    required this.servicios,
    required this.descripcion,
    required this.cliente,
    required this.portadaAntes,
    required this.portadaDespues,
    required this.medios,
    required this.comparadorAntes,
    required this.comparadorDespues,
  });

  final String id;
  final String titulo;
  final String estado;
  /// Tipos de trabajo de la obra, en el orden del catálogo (la primera es la principal).
  final List<OpcionCatalogo> categorias;
  final String? distrito;
  final double? areaM2;
  final int? dias;
  final List<String> servicios;
  final String descripcion;
  final String cliente;
  final String? portadaAntes;
  final String? portadaDespues;
  final Map<String, List<Medio>> medios;
  final String? comparadorAntes;
  final String? comparadorDespues;

  List<Medio> de(String etapa) {
    final lista = List<Medio>.from(medios[etapa] ?? const []);
    lista.sort((a, b) => a.orden.compareTo(b.orden));
    return lista;
  }

  String get portadaLista => portadaDespues ?? portadaAntes ?? '';

  List<String> get categoriaSlugs => [for (final c in categorias) c.slug];

  /// «Cocinas · Melamina». Vacío si la obra no tiene tipos de trabajo.
  String get categoriasTexto => categorias.map((c) => c.nombre).where((n) => n.isNotEmpty).join(' · ');

  String get etiquetaEstado => switch (estado) {
    'publicado' => 'Publicado',
    'oculto' => 'Oculto',
    _ => 'Borrador',
  };
}

/// Cuántos tipos de trabajo puede tener una obra (el mismo tope que valida la API).
const maxCategorias = 4;

class OpcionCatalogo {
  const OpcionCatalogo({required this.slug, required this.nombre});

  final String slug;
  final String nombre;
}

class FirmaSubida {
  const FirmaSubida({
    required this.uploadUrl,
    required this.apiKey,
    required this.timestamp,
    required this.publicId,
    required this.allowedFormats,
    required this.signature,
  });

  final String uploadUrl;
  final String apiKey;
  final int timestamp;
  final String publicId;
  final String allowedFormats;
  final String signature;
}

const etapasObra = ['antes', 'durante', 'despues'];

String nombreEtapa(String etapa) => switch (etapa) {
  'antes' => 'Antes',
  'durante' => 'Durante',
  'despues' => 'Después',
  _ => etapa,
};

/// El cuadrado cuenta como horizontal. Sin medidas no hay lado.
String? ladoDe(int? ancho, int? alto) {
  if (ancho == null || alto == null || ancho <= 0 || alto <= 0) return null;
  return ancho >= alto ? 'horizontal' : 'vertical';
}

/// La misma frase que devuelve la API si el par no se puede comparar.
String? mensajeIncompatible(Medio antes, Medio despues) {
  if (!antes.listo || !despues.listo) return 'Espera a que terminen de subirse.';
  if (antes.tipo != despues.tipo) return 'Para compararlos, los dos deben ser fotos o los dos videos.';
  final ladoAntes = ladoDe(antes.ancho, antes.alto);
  final ladoDespues = ladoDe(despues.ancho, despues.alto);
  if (ladoAntes == null || ladoDespues == null) return 'Faltan las medidas del archivo.';
  if (ladoAntes != ladoDespues) {
    final cual = antes.tipo == 'video' ? 'videos' : 'fotos';
    final lado = ladoAntes == 'vertical' ? 'verticales' : 'horizontales';
    return 'Para compararlos, los dos deben ser $cual $lado.';
  }
  bool largo(Medio medio) => medio.duracionMs == null || medio.duracionMs! > 15000;
  if (antes.tipo == 'video' && (largo(antes) || largo(despues))) {
    return 'Los videos de la comparación duran como máximo 15 segundos.';
  }
  return null;
}

Medio? _porId(Proyecto proyecto, String etapa, String? id) {
  if (id == null) return null;
  for (final medio in proyecto.de(etapa)) {
    if (medio.id == id) return medio;
  }
  return null;
}

/// Las mismas frases que exige la API antes de publicar.
List<String> faltantesParaPublicar(Proyecto proyecto) {
  final todos = etapasObra.expand(proyecto.de).toList();
  final faltan = <String>[];
  if (todos.any((m) => m.estado == 'subiendo')) faltan.add('Todavía se está subiendo un archivo.');
  for (final etapa in etapasObra) {
    if (!proyecto.de(etapa).any((m) => m.listo)) faltan.add('Falta algo en ${nombreEtapa(etapa)}.');
  }
  final antes = _porId(proyecto, 'antes', proyecto.comparadorAntes);
  final despues = _porId(proyecto, 'despues', proyecto.comparadorDespues);
  if (antes == null || despues == null) {
    faltan.add('Falta la comparación.');
  } else {
    final porque = mensajeIncompatible(antes, despues);
    if (porque != null) faltan.add('La comparación no es válida.');
  }
  bool portada(String etapa) => proyecto.de(etapa).any((m) => m.esPortada && m.tipo == 'foto' && m.listo);
  if (!portada('antes') || !portada('despues')) faltan.add('Falta la portada.');
  return faltan;
}

Proyecto proyectoDesde(Object? body) {
  final data = _mapa(body, 'data') ?? _mapaPlano(body);
  if (data == null) {
    throw const FormatException('La respuesta del proyecto no se entiende');
  }
  return _proyecto(data);
}

List<Proyecto> proyectosDesde(Object? body) {
  final raiz = _mapaPlano(body);
  final lista = raiz?['data'];
  if (lista is! List) return const [];
  return lista.map(_proyecto).toList();
}

List<OpcionCatalogo> categoriasDesde(Object? body) {
  final lista = _mapaPlano(body)?['data'];
  if (lista is! List) return const [];
  return lista.map((item) {
    final mapa = _mapaPlano(item) ?? const {};
    return OpcionCatalogo(slug: _texto(mapa['slug']), nombre: _texto(mapa['nombre']));
  }).where((c) => c.slug.isNotEmpty).toList();
}

List<OpcionCatalogo> serviciosDesde(Object? body) {
  final data = _mapa(body, 'data');
  final lista = data?['servicios'];
  if (lista is! List) return const [];
  return lista.map((item) {
    final mapa = _mapaPlano(item) ?? const {};
    return OpcionCatalogo(slug: _texto(mapa['slug']), nombre: _texto(mapa['nombre']));
  }).where((c) => c.nombre.isNotEmpty).toList();
}

FirmaSubida firmaDesde(Object? body) {
  final mapa = _mapaPlano(body) ?? const {};
  return FirmaSubida(
    uploadUrl: _texto(mapa['uploadUrl']),
    apiKey: _texto(mapa['apiKey']),
    timestamp: _entero(mapa['timestamp']) ?? 0,
    publicId: _texto(mapa['publicId']),
    allowedFormats: _texto(mapa['allowedFormats']),
    signature: _texto(mapa['signature']),
  );
}

Proyecto _proyecto(Object? raw) {
  final mapa = _mapaPlano(raw) ?? const {};
  final portada = _mapaPlano(mapa['portada']) ?? const {};
  final comparador = _mapaPlano(mapa['comparador']) ?? const {};
  final mediosRaw = _mapaPlano(mapa['medios']) ?? const {};
  return Proyecto(
    id: _texto(mapa['id']),
    titulo: _texto(mapa['titulo']),
    estado: _texto(mapa['estado']).isEmpty ? 'borrador' : _texto(mapa['estado']),
    categorias: _categoriasDe(mapa),
    distrito: _textoONull(mapa['distrito']),
    areaM2: _decimal(mapa['areaM2']),
    dias: _entero(mapa['dias']),
    servicios: _textos(mapa['servicios']),
    descripcion: _texto(mapa['descripcion']),
    cliente: _texto(mapa['cliente']).isEmpty ? 'persona' : _texto(mapa['cliente']),
    portadaAntes: _urlDe(portada['antes']),
    portadaDespues: _urlDe(portada['despues']),
    medios: {
      for (final etapa in etapasObra)
        etapa: _medios(mediosRaw[etapa], etapa),
    },
    comparadorAntes: _idDe(comparador['antes']),
    comparadorDespues: _idDe(comparador['despues']),
  );
}

/// Lee `categorias` (varias). Si la API es vieja y solo trae `categoria`, usa esa.
List<OpcionCatalogo> _categoriasDe(Map<String, dynamic> mapa) {
  OpcionCatalogo? una(Object? raw) {
    final c = _mapaPlano(raw);
    if (c == null) return null;
    final slug = _texto(c['slug']);
    return slug.isEmpty ? null : OpcionCatalogo(slug: slug, nombre: _texto(c['nombre']));
  }

  final lista = mapa['categorias'];
  if (lista is List) {
    return [for (final item in lista) ?una(item)];
  }
  final sola = una(mapa['categoria']);
  return sola == null ? const [] : [sola];
}

List<Medio> _medios(Object? raw, String etapa) {
  if (raw is! List) return const [];
  return raw.map((item) {
    final mapa = _mapaPlano(item) ?? const {};
    return Medio(
      id: _texto(mapa['id']),
      etapa: _texto(mapa['etapa']).isEmpty ? etapa : _texto(mapa['etapa']),
      tipo: _texto(mapa['tipo']).isEmpty ? 'foto' : _texto(mapa['tipo']),
      orden: _entero(mapa['orden']) ?? 0,
      esPrincipal: mapa['esPrincipal'] == true,
      esPortada: mapa['esPortada'] == true,
      estado: _texto(mapa['estado']).isEmpty ? 'listo' : _texto(mapa['estado']),
      ancho: _entero(mapa['ancho']),
      alto: _entero(mapa['alto']),
      duracionMs: _entero(mapa['duracionMs']),
      url: _textoONull(mapa['url']),
      poster: _textoONull(mapa['poster']),
    );
  }).toList();
}

Map<String, dynamic>? _mapa(Object? body, String clave) {
  final raiz = _mapaPlano(body);
  final valor = raiz?[clave];
  return _mapaPlano(valor);
}

Map<String, dynamic>? _mapaPlano(Object? valor) {
  if (valor is Map) return Map<String, dynamic>.from(valor);
  return null;
}

String _texto(Object? valor) => valor is String ? valor : '';

String? _textoONull(Object? valor) {
  final texto = _texto(valor).trim();
  return texto.isEmpty ? null : texto;
}

List<String> _textos(Object? valor) {
  if (valor is! List) return const [];
  return valor.map(_texto).where((t) => t.isNotEmpty).toList();
}

int? _entero(Object? valor) => valor is num ? valor.toInt() : null;

double? _decimal(Object? valor) => valor is num ? valor.toDouble() : null;

String? _urlDe(Object? medio) => _textoONull(_mapaPlano(medio)?['url']);

String? _idDe(Object? medio) => _textoONull(_mapaPlano(medio)?['id']);
