import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../projects/proyecto.dart';
import '../projects/proyectos_controller.dart';
import '../theme/seima_colors.dart';
import '../theme/seima_theme.dart';
import '../widgets/seima_button.dart';

class ProyectosScreen extends ConsumerWidget {
  const ProyectosScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final lista = ref.watch(proyectosListaProvider);
    return Scaffold(
      appBar: AppBar(title: const Text('Proyectos')),
      body: lista.when(
        loading: () => const Center(child: CircularProgressIndicator(color: SeimaColors.red)),
        error: (error, _) => _AvisoLista(
          titulo: 'No se pudieron cargar las obras',
          detalle: error.toString(),
          accion: 'Reintentar',
          onPressed: () => ref.invalidate(proyectosListaProvider),
        ),
        data: (proyectos) {
          if (proyectos.isEmpty) {
            return const _AvisoLista(
              titulo: 'Todavía no hay obras aquí',
              detalle: 'Crea la primera. Empieza como borrador y la publicas cuando esté lista.',
            );
          }
          return RefreshIndicator(
            color: SeimaColors.red,
            onRefresh: () async => ref.invalidate(proyectosListaProvider),
            child: ListView.separated(
              padding: const EdgeInsets.fromLTRB(16, 8, 16, 16),
              itemCount: proyectos.length,
              separatorBuilder: (_, _) => const SizedBox(height: 12),
              itemBuilder: (context, index) => _Tarjeta(proyectos[index]),
            ),
          );
        },
      ),
      bottomNavigationBar: Padding(
        padding: const EdgeInsets.fromLTRB(16, 0, 16, 12),
        child: SeimaButton(label: '+ Nuevo proyecto', onPressed: () => context.push('/proyecto/nuevo')),
      ),
    );
  }
}

class _Tarjeta extends StatelessWidget {
  const _Tarjeta(this.proyecto);

  final Proyecto proyecto;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: SeimaColors.paper2,
      borderRadius: BorderRadius.circular(14),
      child: InkWell(
        borderRadius: BorderRadius.circular(14),
        onTap: () => context.push('/proyecto/${proyecto.id}'),
        child: Padding(
          padding: const EdgeInsets.all(12),
          child: Row(
            children: [
              _Miniatura(url: proyecto.portadaLista),
              const SizedBox(width: 14),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(proyecto.titulo, style: archivo(20, 750, width: 112, height: 1.15)),
                    const SizedBox(height: 6),
                    Text(
                      [proyecto.etiquetaEstado, if (proyecto.distrito != null) proyecto.distrito].join(' · '),
                      style: archivo(16, 600, color: proyecto.estado == 'publicado' ? SeimaColors.redText : SeimaColors.muted),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _Miniatura extends StatelessWidget {
  const _Miniatura({required this.url});

  final String url;

  @override
  Widget build(BuildContext context) {
    return ClipRRect(
      borderRadius: BorderRadius.circular(10),
      child: SizedBox(
        width: 84,
        height: 84,
        child: url.isEmpty
            ? const ColoredBox(color: SeimaColors.ink3)
            : Image.network(url, fit: BoxFit.cover, errorBuilder: (_, _, _) => const ColoredBox(color: SeimaColors.ink3)),
      ),
    );
  }
}

class _AvisoLista extends StatelessWidget {
  const _AvisoLista({required this.titulo, required this.detalle, this.accion, this.onPressed});

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
        Text(detalle, style: archivo(18, 500, color: SeimaColors.muted)),
        if (accion != null) ...[
          const SizedBox(height: 24),
          SeimaButton(label: accion!, onPressed: onPressed),
        ],
      ],
    );
  }
}
