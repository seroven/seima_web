import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../quotes/cotizacion.dart';
import '../quotes/cotizaciones_controller.dart';
import '../theme/seima_colors.dart';
import '../theme/seima_theme.dart';
import '../widgets/seima_button.dart';

class CotizacionesScreen extends ConsumerStatefulWidget {
  const CotizacionesScreen({super.key});

  @override
  ConsumerState<CotizacionesScreen> createState() => _CotizacionesScreenState();
}

class _CotizacionesScreenState extends ConsumerState<CotizacionesScreen> {
  String? _filtro;

  @override
  Widget build(BuildContext context) {
    final lista = ref.watch(cotizacionesListaProvider);
    return Scaffold(
      appBar: AppBar(title: const Text('Cotizaciones')),
      body: lista.when(
        loading: () => const Center(child: CircularProgressIndicator(color: SeimaColors.red)),
        error: (error, _) => _Vacio(
          titulo: 'No se pudieron cargar',
          detalle: error.toString(),
          accion: 'Reintentar',
          onPressed: () => ref.invalidate(cotizacionesListaProvider),
        ),
        data: (cotizaciones) {
          final visibles = _filtro == null ? cotizaciones : cotizaciones.where((c) => c.estado == _filtro).toList();
          return Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              SizedBox(
                height: 64,
                child: ListView(
                  scrollDirection: Axis.horizontal,
                  padding: const EdgeInsets.fromLTRB(16, 8, 16, 8),
                  children: [
                    for (final opcion in const [null, 'nueva', 'contactada', 'cerrada', 'descartada'])
                      Padding(
                        padding: const EdgeInsets.only(right: 8),
                        child: _Filtro(
                          label: opcion == null ? 'Todas' : etiquetaEstado(opcion),
                          activo: _filtro == opcion,
                          onTap: () => setState(() => _filtro = opcion),
                        ),
                      ),
                  ],
                ),
              ),
              Expanded(
                child: visibles.isEmpty
                    ? _Vacio(
                        titulo: cotizaciones.isEmpty ? 'Cuando alguien cotice, aparece aquí' : 'No hay cotizaciones en este grupo',
                        detalle: cotizaciones.isEmpty
                            ? 'También te llega un aviso al celular, si las notificaciones están activas.'
                            : 'Prueba con otro filtro.',
                      )
                    : RefreshIndicator(
                        color: SeimaColors.red,
                        onRefresh: () async => ref.invalidate(cotizacionesListaProvider),
                        child: ListView.separated(
                          padding: const EdgeInsets.fromLTRB(16, 8, 16, 24),
                          itemCount: visibles.length,
                          separatorBuilder: (_, _) => const SizedBox(height: 12),
                          itemBuilder: (context, index) => _Tarjeta(visibles[index]),
                        ),
                      ),
              ),
            ],
          );
        },
      ),
    );
  }
}

class _Filtro extends StatelessWidget {
  const _Filtro({required this.label, required this.activo, required this.onTap});

  final String label;
  final bool activo;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: activo ? SeimaColors.ink : SeimaColors.paper2,
      borderRadius: BorderRadius.circular(14),
      child: InkWell(
        borderRadius: BorderRadius.circular(14),
        onTap: onTap,
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 16),
          child: Center(child: Text(label, style: archivo(16, 700, color: activo ? Colors.white : SeimaColors.ink))),
        ),
      ),
    );
  }
}

class _Tarjeta extends StatelessWidget {
  const _Tarjeta(this.cotizacion);

  final CotizacionResumen cotizacion;

  @override
  Widget build(BuildContext context) {
    final servicios = cotizacion.servicios.join(', ');
    final meta = [
      etiquetaEstado(cotizacion.estado),
      if (cotizacion.distrito.isNotEmpty) cotizacion.distrito,
      if (fechaCorta(cotizacion.creadaEn).isNotEmpty) fechaCorta(cotizacion.creadaEn),
    ].join(' · ');
    return Material(
      color: SeimaColors.paper2,
      borderRadius: BorderRadius.circular(14),
      child: InkWell(
        borderRadius: BorderRadius.circular(14),
        onTap: () => context.push('/cotizacion/${cotizacion.id}'),
        child: ConstrainedBox(
          constraints: const BoxConstraints(minHeight: 88),
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(cotizacion.nombre, style: archivo(20, 750, width: 112, height: 1.15)),
                const SizedBox(height: 6),
                Text(meta, style: archivo(16, 600, color: cotizacion.estado == 'nueva' ? SeimaColors.redText : SeimaColors.muted)),
                if (servicios.isNotEmpty) ...[
                  const SizedBox(height: 4),
                  Text(servicios, style: archivo(16, 500)),
                ],
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class _Vacio extends StatelessWidget {
  const _Vacio({required this.titulo, required this.detalle, this.accion, this.onPressed});

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
        if (accion != null) ...[const SizedBox(height: 20), SeimaButton(label: accion!, onPressed: onPressed)],
      ],
    );
  }
}
