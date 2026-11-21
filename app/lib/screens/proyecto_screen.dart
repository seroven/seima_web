import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:url_launcher/url_launcher.dart';

import '../projects/proyecto.dart';
import '../projects/proyectos_controller.dart';
import '../projects/vista_reglas.dart';
import '../theme/seima_colors.dart';
import '../theme/seima_theme.dart';
import '../widgets/seima_button.dart';

class ProyectoScreen extends ConsumerWidget {
  const ProyectoScreen({super.key, required this.id});

  final String id;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final proyecto = ref.watch(proyectoProvider(id));
    return Scaffold(
      appBar: AppBar(
        title: const Text('Proyecto'),
        actions: [
          proyecto.maybeWhen(
            data: (dato) => PopupMenuButton<String>(
              icon: const Icon(Icons.more_vert),
              onSelected: (accion) => _accion(context, ref, dato, accion),
              itemBuilder: (context) => [
                if (dato.estado == 'publicado') const PopupMenuItem(value: 'ocultar', child: Text('Ocultar')),
                if (dato.estado == 'oculto') const PopupMenuItem(value: 'mostrar', child: Text('Mostrar')),
                if (dato.estado == 'borrador') const PopupMenuItem(value: 'eliminar', child: Text('Eliminar borrador')),
              ],
            ),
            orElse: () => const SizedBox.shrink(),
          ),
        ],
      ),
      body: proyecto.when(
        loading: () => const Center(child: CircularProgressIndicator(color: SeimaColors.red)),
        error: (error, _) => _CuerpoMensaje(
          titulo: 'No se pudo abrir la obra',
          detalle: error.toString(),
          accion: 'Reintentar',
          onPressed: () => ref.invalidate(proyectoProvider(id)),
        ),
        data: (dato) => ListView(
          padding: const EdgeInsets.fromLTRB(24, 8, 24, 32),
          children: [
            Text(dato.titulo, style: archivo(32, 850, width: 118, height: 1.05)),
            const SizedBox(height: 8),
            Text(
              [dato.etiquetaEstado, dato.categoriaNombre, if (dato.distrito != null) dato.distrito!].where((t) => t.isNotEmpty).join(' · '),
              style: archivo(16, 600, color: SeimaColors.muted),
            ),
            const SizedBox(height: 20),
            SeimaButton(label: 'Datos del proyecto', ink: true, onPressed: () => context.push('/proyecto/$id/datos')),
            const SizedBox(height: 24),
            for (final etapa in etapasObra) ...[
              _Paso(
                numero: etapasObra.indexOf(etapa) + 1,
                titulo: nombreEtapa(etapa),
                hecho: dato.de(etapa).any((m) => m.listo),
                detalle: _detalleEtapa(dato, etapa),
                onTap: () => context.push('/proyecto/$id/$etapa'),
              ),
              const SizedBox(height: 10),
            ],
            _Paso(
              numero: 4,
              titulo: 'Comparación',
              hecho: dato.comparadorAntes != null && dato.comparadorDespues != null,
              detalle: dato.comparadorAntes != null && dato.comparadorDespues != null
                  ? 'Antes y Después elegidos'
                  : 'Elige uno de Antes y uno de Después',
              onTap: () => context.push('/proyecto/$id/comparacion'),
            ),
            const SizedBox(height: 10),
            _Paso(
              numero: 5,
              titulo: 'Portada',
              hecho: dato.de('antes').any((m) => m.esPortada && m.listo) && dato.de('despues').any((m) => m.esPortada && m.listo),
              detalle: 'La foto que se ve en el catálogo',
              onTap: () => context.push('/proyecto/$id/portada'),
            ),
            const SizedBox(height: 10),
            _Paso(
              numero: 6,
              titulo: 'Publicar',
              hecho: dato.estado == 'publicado',
              detalle: dato.estado == 'publicado' ? 'Visible en la web.' : 'Revisa lo que falta.',
              onTap: () => context.push('/proyecto/$id/publicar'),
            ),
          ],
        ),
      ),
    );
  }

  String _detalleEtapa(Proyecto dato, String etapa) {
    final cantidad = dato.de(etapa).where((m) => m.listo).length;
    if (cantidad == 0) return 'Sin fotos todavía';
    if (cantidad == 1) return '1 archivo';
    return '$cantidad archivos';
  }

  Future<void> _accion(BuildContext context, WidgetRef ref, Proyecto dato, String accion) async {
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

  void _aviso(BuildContext context, String mensaje) {
    ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(mensaje, style: archivo(16, 600, color: Colors.white))));
  }
}

class PublicarScreen extends ConsumerWidget {
  const PublicarScreen({super.key, required this.id});

  final String id;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final proyecto = ref.watch(proyectoProvider(id));
    return Scaffold(
      appBar: AppBar(title: const Text('Publicar')),
      body: proyecto.when(
        loading: () => const Center(child: CircularProgressIndicator(color: SeimaColors.red)),
        error: (error, _) => _CuerpoMensaje(titulo: 'No se pudo abrir', detalle: error.toString()),
        data: (dato) {
          final faltan = faltantesParaPublicar(dato);
          final ya = dato.estado == 'publicado';
          return ListView(
            padding: const EdgeInsets.all(24),
            children: [
              Text(ya ? 'Esta obra ya está publicada.' : 'Para publicarla tiene que estar completa.', style: archivo(22, 800, width: 118, height: 1.15)),
              const SizedBox(height: 16),
              if (!ya)
                for (final frase in faltan)
                  Padding(
                    padding: const EdgeInsets.only(bottom: 8),
                    child: Text(frase, style: archivo(18, 550)),
                  ),
              if (!ya && faltan.isEmpty) Text('Todo listo.', style: archivo(18, 600)),
              if (ya) Text('Ya está publicada. Puedes enviarla por WhatsApp.', style: archivo(18, 600)),
              const SizedBox(height: 24),
              if (ya)
                SeimaButton(
                  label: 'Compartir por WhatsApp',
                  onPressed: () async {
                    final abrio = await launchUrl(enlaceWhatsapp(textoParaCompartir(dato.titulo)), mode: LaunchMode.externalApplication);
                    if (!context.mounted || abrio) return;
                    ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('No se pudo abrir WhatsApp.', style: archivo(16, 600))));
                  },
                ),
              if (ya) ...[
                const SizedBox(height: 10),
                SeimaButton(label: 'Volver', ink: true, onPressed: () => context.pop()),
              ],
              if (!ya && faltan.isEmpty)
                SeimaButton(
                  label: 'Publicar',
                  onPressed: () async {
                    final mensaje = await ref.read(proyectoProvider(id).notifier).cambiarEstado('publicado');
                    if (!context.mounted || mensaje == null) return;
                    ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(mensaje)));
                  },
                ),
            ],
          );
        },
      ),
    );
  }
}

class _Paso extends StatelessWidget {
  const _Paso({required this.numero, required this.titulo, required this.hecho, required this.detalle, required this.onTap});

  final int numero;
  final String titulo;
  final bool hecho;
  final String detalle;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: SeimaColors.paper2,
      borderRadius: BorderRadius.circular(14),
      child: InkWell(
        borderRadius: BorderRadius.circular(14),
        onTap: onTap,
        child: ConstrainedBox(
          constraints: const BoxConstraints(minHeight: 72),
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
            child: Row(
              children: [
                Text('$numero', style: archivo(22, 800, color: SeimaColors.redText)),
                const SizedBox(width: 14),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(titulo, style: archivo(20, 750, height: 1.1)),
                      Text(detalle, style: archivo(16, 500, color: SeimaColors.muted)),
                    ],
                  ),
                ),
                Icon(hecho ? Icons.check_circle : Icons.circle_outlined, color: hecho ? SeimaColors.red : SeimaColors.muted),
              ],
            ),
          ),
        ),
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
