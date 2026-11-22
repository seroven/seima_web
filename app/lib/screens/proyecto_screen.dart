import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:url_launcher/url_launcher.dart';

import '../projects/proyecto.dart';
import '../projects/proyectos_controller.dart';
import '../projects/vista_reglas.dart';
import '../theme/seima_colors.dart';
import '../router/volver.dart';
import '../theme/seima_theme.dart';
import '../widgets/cabecera_seima.dart';
import '../widgets/capas_marca.dart';
import '../widgets/etiquetas.dart';
import '../widgets/foto_llena.dart';
import '../widgets/seima_button.dart';
import '../widgets/toque.dart';

class ProyectoScreen extends ConsumerWidget {
  const ProyectoScreen({super.key, required this.id});

  final String id;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final proyecto = ref.watch(proyectoProvider(id));
    return Scaffold(
      // Mientras carga o si falla no hay encabezado con flecha: sin esto no habría cómo volver.
      appBar: proyecto.hasValue ? null : AppBar(leading: BackButton(onPressed: () => context.volver('/proyectos'))),
      body: proyecto.when(
        loading: () => const Center(child: CircularProgressIndicator(color: SeimaColors.red)),
        error: (error, _) => SafeArea(
          child: _CuerpoMensaje(
            titulo: 'No se pudo abrir la obra',
            detalle: error.toString(),
            accion: 'Reintentar',
            onPressed: () => ref.invalidate(proyectoProvider(id)),
          ),
        ),
        data: (dato) => _Cuerpo(id: id, dato: dato),
      ),
    );
  }
}

class _Cuerpo extends ConsumerWidget {
  const _Cuerpo({required this.id, required this.dato});

  final String id;
  final Proyecto dato;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final hechos = [
      for (final etapa in etapasObra) dato.de(etapa).any((m) => m.listo),
      dato.comparadorAntes != null && dato.comparadorDespues != null,
      dato.de('antes').any((m) => m.esPortada && m.listo) && dato.de('despues').any((m) => m.esPortada && m.listo),
      dato.estado == 'publicado',
    ];
    final listos = hechos.where((h) => h).length;
    final siguiente = hechos.indexOf(false);

    final pasos = <_DatosPaso>[
      for (final etapa in etapasObra)
        _DatosPaso(
          titulo: nombreEtapa(etapa),
          detalle: _detalleEtapa(dato, etapa),
          icono: switch (etapa) {
            'antes' => Icons.history,
            'durante' => Icons.construction,
            _ => Icons.auto_awesome,
          },
          ruta: '/proyecto/$id/$etapa',
        ),
      _DatosPaso(
        titulo: 'Comparación',
        detalle: hechos[3] ? 'Antes y Después elegidos' : 'Elige uno de Antes y uno de Después',
        icono: Icons.compare,
        ruta: '/proyecto/$id/comparacion',
      ),
      _DatosPaso(
        titulo: 'Portada',
        detalle: hechos[4] ? 'Fotos de portada elegidas' : 'La foto que se ve en el catálogo',
        icono: Icons.photo,
        ruta: '/proyecto/$id/portada',
      ),
      _DatosPaso(
        titulo: dato.estado == 'publicado' ? 'Publicada' : 'Publicar',
        detalle: dato.estado == 'publicado' ? 'Visible en la web' : 'Revisa lo que falta',
        icono: Icons.rocket_launch,
        ruta: '/proyecto/$id/publicar',
        esPublicar: true,
      ),
    ];

    return CustomScrollView(
      slivers: [
        SliverAppBar(
          pinned: true,
          toolbarHeight: 64,
          expandedHeight: 280,
          backgroundColor: SeimaColors.ink,
          surfaceTintColor: Colors.transparent,
          foregroundColor: Colors.white,
          systemOverlayStyle: SystemUiOverlayStyle.light,
          leadingWidth: 72,
          leading: Padding(
            padding: const EdgeInsets.only(left: 16),
            child: Center(child: BotonRedondo(icono: Icons.arrow_back, tooltip: 'Volver', onPressed: () => context.volver('/proyectos'))),
          ),
          actions: [
            Padding(
              padding: const EdgeInsets.only(right: 16),
              child: _Menu(id: id, dato: dato),
            ),
          ],
          flexibleSpace: LayoutBuilder(
            builder: (context, caja) {
              final top = MediaQuery.paddingOf(context).top;
              final maximo = 280 + top;
              final minimo = 64 + top;
              final t = ((maximo - caja.maxHeight) / (maximo - minimo)).clamp(0.0, 1.0);
              return Stack(
                fit: StackFit.expand,
                children: [
                  Opacity(opacity: (1 - t * 1.4).clamp(0.0, 1.0), child: _Portada(dato: dato)),
                  // El nombre de la obra queda a la vista en la barra pegada.
                  Positioned(
                    left: 76,
                    right: 76,
                    top: top,
                    height: 64,
                    child: IgnorePointer(
                      child: Opacity(
                        opacity: ((t - 0.6) / 0.4).clamp(0.0, 1.0),
                        child: Align(
                          alignment: Alignment.centerLeft,
                          child: Text(dato.titulo, maxLines: 1, overflow: TextOverflow.ellipsis, style: archivo(20, 850, width: 114, height: 1.1, color: Colors.white)),
                        ),
                      ),
                    ),
                  ),
                ],
              );
            },
          ),
        ),
        SliverPadding(
          padding: const EdgeInsets.fromLTRB(16, 20, 16, 40),
          sliver: SliverList(
            delegate: SliverChildListDelegate([
              _Avance(listos: listos, total: hechos.length, hechos: hechos),
              const SizedBox(height: 14),
              TarjetaToque(
                onTap: () => context.push('/proyecto/$id/datos'),
                child: DecoratedBox(
                  decoration: BoxDecoration(color: SeimaColors.paper2, borderRadius: BorderRadius.circular(18)),
                  child: Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
                    child: Row(
                      children: [
                        const Icon(Icons.edit_outlined, size: 24),
                        const SizedBox(width: 12),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text('Datos del proyecto', style: archivo(18, 750, height: 1.15)),
                              Text('Nombre, tipo de trabajo, distrito…', style: archivo(15, 500, height: 1.2, color: SeimaColors.muted)),
                            ],
                          ),
                        ),
                        const Icon(Icons.chevron_right, color: SeimaColors.muted),
                      ],
                    ),
                  ),
                ),
              ),
              const SizedBox(height: 24),
              Padding(
                padding: const EdgeInsets.only(left: 4, bottom: 12),
                child: Text('Paso a paso', style: archivo(14, 800, width: 112, height: 1.1, color: SeimaColors.muted).copyWith(letterSpacing: 1.2)),
              ),
              for (var i = 0; i < pasos.length; i++)
                _Paso(
                  numero: i + 1,
                  paso: pasos[i],
                  hecho: hechos[i],
                  esSiguiente: i == siguiente,
                  esUltimo: i == pasos.length - 1,
                  onTap: () => context.push(pasos[i].ruta),
                ),
            ]),
          ),
        ),
      ],
    );
  }

  static String _detalleEtapa(Proyecto dato, String etapa) {
    final cantidad = dato.de(etapa).where((m) => m.listo).length;
    if (cantidad == 0) return 'Sin fotos todavía';
    if (cantidad == 1) return '1 archivo';
    return '$cantidad archivos';
  }
}

class _DatosPaso {
  const _DatosPaso({required this.titulo, required this.detalle, required this.icono, required this.ruta, this.esPublicar = false});

  final String titulo;
  final String detalle;
  final IconData icono;
  final String ruta;
  final bool esPublicar;
}

class _Portada extends StatelessWidget {
  const _Portada({required this.dato});

  final Proyecto dato;

  @override
  Widget build(BuildContext context) {
    final detalle = [
      if (dato.categoriasTexto.isNotEmpty) dato.categoriasTexto,
      if (dato.distrito != null && dato.distrito!.isNotEmpty) dato.distrito!,
    ].join(' · ');
    return Stack(
      fit: StackFit.expand,
      children: [
        if (dato.portadaLista.isEmpty)
          const ColoredBox(color: SeimaColors.ink2, child: Align(alignment: Alignment(0.92, 0.0), child: CapasMarca(ancho: 150)))
        else
          FotoLlena(dato.portadaLista),
        const DecoratedBox(
          decoration: BoxDecoration(
            gradient: LinearGradient(
              begin: Alignment.topCenter,
              end: Alignment.bottomCenter,
              stops: [0, 0.35, 1],
              colors: [Color(0x990E0E0E), Color(0x000E0E0E), Color(0xF20E0E0E)],
            ),
          ),
        ),
        Positioned(
          left: 24,
          right: 24,
          bottom: 20,
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Etiqueta.obra(dato.estado, sobreFoto: true),
              const SizedBox(height: 10),
              Text(dato.titulo, maxLines: 3, overflow: TextOverflow.ellipsis, style: archivo(30, 850, width: 118, height: 1.05, color: Colors.white)),
              if (detalle.isNotEmpty) ...[
                const SizedBox(height: 6),
                Text(detalle, style: archivo(16, 600, height: 1.2, color: const Color(0xCCFFFFFF))),
              ],
            ],
          ),
        ),
      ],
    );
  }
}

class _Menu extends ConsumerWidget {
  const _Menu({required this.id, required this.dato});

  final String id;
  final Proyecto dato;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final hayAcciones = dato.estado == 'publicado' || dato.estado == 'oculto' || dato.estado == 'borrador';
    if (!hayAcciones) return const SizedBox.shrink();
    return PopupMenuButton<String>(
      tooltip: 'Más opciones',
      icon: const Icon(Icons.more_vert, color: Colors.white),
      style: IconButton.styleFrom(backgroundColor: SeimaColors.ink3, fixedSize: const Size(48, 48)),
      onSelected: (accion) => _accion(context, ref, accion),
      itemBuilder: (context) => [
        if (dato.estado == 'publicado') const PopupMenuItem(value: 'ocultar', child: Text('Ocultar de la web')),
        if (dato.estado == 'oculto') const PopupMenuItem(value: 'mostrar', child: Text('Mostrar en la web')),
        if (dato.estado == 'borrador') const PopupMenuItem(value: 'eliminar', child: Text('Eliminar borrador')),
      ],
    );
  }

  Future<void> _accion(BuildContext context, WidgetRef ref, String accion) async {
    if (accion == 'eliminar') {
      final si = await showDialog<bool>(
        context: context,
        builder: (context) => AlertDialog(
          title: Text('¿Eliminar este borrador?', style: archivo(22, 800, width: 112, height: 1.15)),
          content: Text('Se borra la obra y sus fotos.', style: archivo(18, 500)),
          actions: [
            TextButton(onPressed: () => Navigator.pop(context, false), child: Text('Cancelar', style: archivo(18, 650))),
            TextButton(onPressed: () => Navigator.pop(context, true), child: Text('Eliminar', style: archivo(18, 750, color: SeimaColors.redText))),
          ],
        ),
      );
      if (si != true) return;
      final mensaje = await ref.read(proyectoProvider(id).notifier).eliminar();
      if (!context.mounted) return;
      if (mensaje == null) {
        context.go('/proyectos');
      } else {
        _aviso(context, mensaje);
      }
      return;
    }
    final estado = accion == 'ocultar' ? 'oculto' : 'publicado';
    final mensaje = await ref.read(proyectoProvider(id).notifier).cambiarEstado(estado);
    if (mensaje != null && context.mounted) _aviso(context, mensaje);
  }
}

void _aviso(BuildContext context, String mensaje) {
  ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(mensaje)));
}

/// «3 de 6 pasos listos» con una barra en tramos.
class _Avance extends StatelessWidget {
  const _Avance({required this.listos, required this.total, required this.hechos});

  final int listos;
  final int total;
  final List<bool> hechos;

  @override
  Widget build(BuildContext context) {
    final completo = listos == total;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          crossAxisAlignment: CrossAxisAlignment.baseline,
          textBaseline: TextBaseline.alphabetic,
          children: [
            Text('$listos', style: archivo(40, 850, width: 118, height: 1, color: SeimaColors.redText)),
            Text(' de $total', style: archivo(24, 800, width: 112, height: 1)),
            const SizedBox(width: 8),
            Expanded(
              child: Text(completo ? 'pasos listos. ¡Obra completa!' : 'pasos listos', style: archivo(18, 600, color: SeimaColors.muted, height: 1.1)),
            ),
          ],
        ),
        const SizedBox(height: 12),
        Row(
          children: [
            for (var i = 0; i < hechos.length; i++) ...[
              Expanded(
                child: AnimatedContainer(
                  duration: const Duration(milliseconds: 300),
                  height: 8,
                  decoration: BoxDecoration(color: hechos[i] ? SeimaColors.red : SeimaColors.tint2, borderRadius: BorderRadius.circular(99)),
                ),
              ),
              if (i < hechos.length - 1) const SizedBox(width: 5),
            ],
          ],
        ),
      ],
    );
  }
}

/// Un paso del camino: círculo en el riel, tarjeta a la derecha. El siguiente paso va resaltado.
class _Paso extends StatelessWidget {
  const _Paso({
    required this.numero,
    required this.paso,
    required this.hecho,
    required this.esSiguiente,
    required this.esUltimo,
    required this.onTap,
  });

  final int numero;
  final _DatosPaso paso;
  final bool hecho;
  final bool esSiguiente;
  final bool esUltimo;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final fondo = esSiguiente ? (paso.esPublicar ? SeimaColors.red : SeimaColors.ink) : SeimaColors.paper2;
    final oscuro = esSiguiente;
    final colorTexto = oscuro ? Colors.white : SeimaColors.ink;
    final colorSecundario = oscuro ? (paso.esPublicar ? const Color(0xE6FFFFFF) : SeimaColors.onInkMuted) : SeimaColors.muted;

    return IntrinsicHeight(
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          SizedBox(
            width: 44,
            child: Column(
              children: [
                _Circulo(numero: numero, hecho: hecho, resaltado: esSiguiente),
                if (!esUltimo)
                  Expanded(
                    child: Center(
                      child: Container(width: 3, margin: const EdgeInsets.symmetric(vertical: 4), decoration: BoxDecoration(color: hecho ? SeimaColors.red : SeimaColors.tint2, borderRadius: BorderRadius.circular(2))),
                    ),
                  ),
              ],
            ),
          ),
          const SizedBox(width: 10),
          Expanded(
            child: Padding(
              padding: EdgeInsets.only(bottom: esUltimo ? 0 : 12),
              child: TarjetaToque(
                semantica: '${paso.titulo}. ${paso.detalle}',
                onTap: onTap,
                child: DecoratedBox(
                  decoration: BoxDecoration(color: fondo, borderRadius: BorderRadius.circular(18)),
                  child: ConstrainedBox(
                    constraints: const BoxConstraints(minHeight: 76),
                    child: Padding(
                      padding: const EdgeInsets.fromLTRB(16, 12, 12, 12),
                      child: Row(
                        children: [
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                if (esSiguiente)
                                  Padding(
                                    padding: const EdgeInsets.only(bottom: 4),
                                    child: Text(
                                      paso.esPublicar ? 'LISTO PARA PUBLICAR' : 'SIGUIENTE',
                                      style: archivo(12, 800, width: 112, height: 1.1, color: paso.esPublicar ? Colors.white : SeimaColors.red).copyWith(letterSpacing: 1.3),
                                    ),
                                  ),
                                Text(paso.titulo, style: archivo(20, 800, height: 1.1, color: colorTexto)),
                                const SizedBox(height: 2),
                                Text(paso.detalle, style: archivo(15, 500, height: 1.25, color: colorSecundario)),
                              ],
                            ),
                          ),
                          Icon(Icons.chevron_right, size: 28, color: colorSecundario),
                        ],
                      ),
                    ),
                  ),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _Circulo extends StatelessWidget {
  const _Circulo({required this.numero, required this.hecho, required this.resaltado});

  final int numero;
  final bool hecho;
  final bool resaltado;

  @override
  Widget build(BuildContext context) {
    final fondo = hecho ? SeimaColors.red : (resaltado ? SeimaColors.ink : SeimaColors.tint2);
    return AnimatedContainer(
      duration: const Duration(milliseconds: 250),
      width: 44,
      height: 44,
      decoration: BoxDecoration(color: fondo, shape: BoxShape.circle),
      alignment: Alignment.center,
      child: hecho
          ? const Icon(Icons.check, color: Colors.white, size: 26)
          : Text('$numero', style: archivo(20, 850, height: 1, color: resaltado ? Colors.white : SeimaColors.ink)),
    );
  }
}

class PublicarScreen extends ConsumerWidget {
  const PublicarScreen({super.key, required this.id});

  final String id;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final proyecto = ref.watch(proyectoProvider(id));
    return Scaffold(
      appBar: AppBar(leading: BackButton(onPressed: () => context.volver('/proyectos')), title: const Text('Publicar')),
      body: proyecto.when(
        loading: () => const Center(child: CircularProgressIndicator(color: SeimaColors.red)),
        error: (error, _) => _CuerpoMensaje(titulo: 'No se pudo abrir', detalle: error.toString()),
        data: (dato) {
          final faltan = faltantesParaPublicar(dato);
          final ya = dato.estado == 'publicado';
          final listo = !ya && faltan.isEmpty;
          return ListView(
            padding: const EdgeInsets.fromLTRB(24, 16, 24, 32),
            children: [
              _SelloEstado(ya: ya, listo: listo),
              const SizedBox(height: 24),
              Text(
                ya
                    ? 'Esta obra ya está publicada.'
                    : listo
                    ? '¡Todo listo para publicar!'
                    : 'Todavía falta esto',
                style: archivo(28, 850, width: 118, height: 1.08),
              ),
              const SizedBox(height: 8),
              Text(
                ya
                    ? 'Ya se ve en la web. Puedes enviarla por WhatsApp.'
                    : listo
                    ? 'Al publicarla, cualquiera la verá en la web.'
                    : 'Completa estos pasos y vuelve aquí.',
                style: archivo(18, 500, color: SeimaColors.muted),
              ),
              const SizedBox(height: 20),
              if (!ya)
                for (final frase in faltan)
                  Padding(
                    padding: const EdgeInsets.only(bottom: 10),
                    child: DecoratedBox(
                      decoration: BoxDecoration(color: SeimaColors.paper2, borderRadius: BorderRadius.circular(16)),
                      child: Padding(
                        padding: const EdgeInsets.all(16),
                        child: Row(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            const Icon(Icons.error_outline, color: SeimaColors.redText),
                            const SizedBox(width: 12),
                            Expanded(child: Text(frase, style: archivo(18, 600, height: 1.3))),
                          ],
                        ),
                      ),
                    ),
                  ),
              const SizedBox(height: 12),
              if (ya)
                SeimaButton(
                  label: 'Compartir por WhatsApp',
                  onPressed: () async {
                    final abrio = await launchUrl(enlaceWhatsapp(textoParaCompartir(dato.titulo)), mode: LaunchMode.externalApplication);
                    if (!context.mounted || abrio) return;
                    _aviso(context, 'No se pudo abrir WhatsApp.');
                  },
                ),
              if (ya) ...[
                const SizedBox(height: 10),
                SeimaButton(label: 'Volver', ink: true, onPressed: () => context.volver('/proyectos')),
              ],
              if (listo)
                SeimaButton(
                  label: 'Publicar',
                  onPressed: () async {
                    final mensaje = await ref.read(proyectoProvider(id).notifier).cambiarEstado('publicado');
                    if (!context.mounted || mensaje == null) return;
                    _aviso(context, mensaje);
                  },
                ),
            ],
          );
        },
      ),
    );
  }
}

class _SelloEstado extends StatelessWidget {
  const _SelloEstado({required this.ya, required this.listo});

  final bool ya;
  final bool listo;

  @override
  Widget build(BuildContext context) {
    final bien = ya || listo;
    return Align(
      alignment: Alignment.centerLeft,
      child: Container(
        width: 84,
        height: 84,
        decoration: BoxDecoration(color: bien ? SeimaColors.red : SeimaColors.ink, shape: BoxShape.circle),
        child: Icon(bien ? Icons.check : Icons.checklist, color: Colors.white, size: 44),
      ),
    );
  }
}

class _CuerpoMensaje extends StatelessWidget {
  const _CuerpoMensaje({required this.titulo, required this.detalle, this.accion, this.onPressed});

  final String titulo;
  final String detalle;
  final String? accion;
  final VoidCallback? onPressed;

  @override
  Widget build(BuildContext context) {
    return ListView(
      padding: const EdgeInsets.all(24),
      children: [
        Text(titulo, style: archivo(28, 800, width: 118, height: 1.1)),
        const SizedBox(height: 12),
        Text(detalle, style: archivo(18, 500)),
        if (accion != null) ...[const SizedBox(height: 20), SeimaButton(label: accion!, onPressed: onPressed)],
      ],
    );
  }
}
