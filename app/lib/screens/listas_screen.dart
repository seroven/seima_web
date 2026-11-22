import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../quotes/cotizacion.dart';
import '../quotes/cotizaciones_controller.dart';
import '../theme/seima_colors.dart';
import '../theme/seima_theme.dart';
import '../widgets/cabecera_seima.dart';
import '../widgets/capas_marca.dart';
import '../widgets/etiquetas.dart';
import '../widgets/seima_button.dart';
import '../widgets/toque.dart';

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
    final todas = lista.value ?? const <CotizacionResumen>[];
    final nuevas = contarNuevas(todas);
    final visibles = _filtro == null ? todas : todas.where((c) => c.estado == _filtro).toList();

    return Scaffold(
      body: RefreshIndicator(
        color: SeimaColors.red,
        onRefresh: () async => ref.invalidate(cotizacionesListaProvider),
        child: CustomScrollView(
          physics: const AlwaysScrollableScrollPhysics(),
          slivers: [
            SliverCabeceraSeima(
              titulo: 'Cotizaciones',
              subtitulo: lista.hasValue ? (nuevas == 0 ? 'Todo al día' : (nuevas == 1 ? '1 por responder' : '$nuevas por responder')) : null,
              alturaExpandida: 120,
              // Los filtros se quedan a la vista aunque se baje por la lista.
              alturaPie: 76,
              pie: lista.hasValue
                  ? SingleChildScrollView(
                      scrollDirection: Axis.horizontal,
                      padding: const EdgeInsets.fromLTRB(24, 8, 24, 16),
                      child: Row(
                        children: [
                          for (final opcion in const [null, 'nueva', 'contactada', 'cerrada', 'descartada'])
                            Padding(
                              padding: const EdgeInsets.only(right: 8),
                              child: _Filtro(
                                label: opcion == null ? 'Todas' : etiquetaFiltro(opcion),
                                cuantas: opcion == null ? todas.length : todas.where((c) => c.estado == opcion).length,
                                activo: _filtro == opcion,
                                onTap: () => setState(() => _filtro = opcion),
                              ),
                            ),
                        ],
                      ),
                    )
                  : null,
            ),
            ...lista.when(
              loading: () => [const SliverFillRemaining(hasScrollBody: false, child: Center(child: CircularProgressIndicator(color: SeimaColors.red)))],
              error: (error, _) => [
                SliverFillRemaining(
                  hasScrollBody: false,
                  child: _Vacio(
                    titulo: 'No se pudieron cargar',
                    detalle: error.toString(),
                    accion: 'Reintentar',
                    onPressed: () => ref.invalidate(cotizacionesListaProvider),
                  ),
                ),
              ],
              data: (_) {
                if (visibles.isEmpty) {
                  return [
                    SliverFillRemaining(
                      hasScrollBody: false,
                      child: _Vacio(
                        titulo: todas.isEmpty ? 'Cuando alguien cotice, aparece aquí' : 'No hay cotizaciones en este grupo',
                        detalle: todas.isEmpty
                            ? 'También te llega un aviso al celular, si las notificaciones están activas.'
                            : 'Prueba con otro filtro.',
                      ),
                    ),
                  ];
                }
                return [
                  SliverPadding(
                    padding: const EdgeInsets.fromLTRB(16, 20, 16, 24),
                    sliver: SliverList.separated(
                      itemCount: visibles.length,
                      separatorBuilder: (_, _) => const SizedBox(height: 12),
                      itemBuilder: (context, index) => Aparece(indice: index, child: _Tarjeta(visibles[index])),
                    ),
                  ),
                ];
              },
            ),
          ],
        ),
      ),
    );
  }
}

/// Plural corto para los filtros («Nuevas», «Contactadas»…).
String etiquetaFiltro(String estado) => switch (estado) {
  'nueva' => 'Nuevas',
  'contactada' => 'Contactadas',
  'cerrada' => 'Cerradas',
  _ => 'Descartadas',
};

class _Filtro extends StatelessWidget {
  const _Filtro({required this.label, required this.cuantas, required this.activo, required this.onTap});

  final String label;
  final int cuantas;
  final bool activo;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Semantics(
      button: true,
      selected: activo,
      label: '$label, $cuantas',
      child: Material(
        color: activo ? Colors.white : SeimaColors.ink3,
        borderRadius: BorderRadius.circular(999),
        child: InkWell(
          borderRadius: BorderRadius.circular(999),
          onTap: onTap,
          child: ConstrainedBox(
            constraints: const BoxConstraints(minHeight: 48),
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 18),
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Text(label, style: archivo(16, 750, height: 1.1, color: activo ? SeimaColors.ink : Colors.white)),
                  const SizedBox(width: 8),
                  Text('$cuantas', style: archivo(16, 750, height: 1.1, color: activo ? SeimaColors.redText : SeimaColors.onInkMuted)),
                ],
              ),
            ),
          ),
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
    final servicios = cotizacion.servicios.join(' · ');
    final nueva = cotizacion.estado == 'nueva';
    final lugar = [
      if (cotizacion.distrito.isNotEmpty) cotizacion.distrito,
      if (fechaCorta(cotizacion.creadaEn).isNotEmpty) fechaCorta(cotizacion.creadaEn),
    ].join(' · ');
    return TarjetaToque(
      semantica: '${cotizacion.nombre}, ${etiquetaEstado(cotizacion.estado)}',
      onTap: () => context.push('/cotizacion/${cotizacion.id}'),
      child: DecoratedBox(
        decoration: BoxDecoration(color: SeimaColors.paper2, borderRadius: BorderRadius.circular(20)),
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              InicialCircular(nombre: cotizacion.nombre, resaltada: nueva),
              const SizedBox(width: 14),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(nombreLegible(cotizacion.nombre), maxLines: 2, overflow: TextOverflow.ellipsis, style: archivo(20, 800, width: 108, height: 1.15)),
                    if (servicios.isNotEmpty) ...[
                      const SizedBox(height: 3),
                      Text(servicios, maxLines: 2, overflow: TextOverflow.ellipsis, style: archivo(16, 550, height: 1.25)),
                    ],
                    if (lugar.isNotEmpty) ...[
                      const SizedBox(height: 3),
                      Text(lugar, maxLines: 1, overflow: TextOverflow.ellipsis, style: archivo(15, 500, height: 1.2, color: SeimaColors.muted)),
                    ],
                    const SizedBox(height: 10),
                    Etiqueta.cotizacion(cotizacion.estado, etiquetaEstado(cotizacion.estado)),
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

/// La inicial del cliente en un círculo. Roja si la cotización es nueva.
class InicialCircular extends StatelessWidget {
  const InicialCircular({super.key, required this.nombre, this.resaltada = false, this.tamano = 52});

  final String nombre;
  final bool resaltada;
  final double tamano;

  @override
  Widget build(BuildContext context) {
    final limpio = nombre.trim();
    final inicial = limpio.isEmpty ? '?' : limpio.characters.first.toUpperCase();
    return Container(
      width: tamano,
      height: tamano,
      alignment: Alignment.center,
      decoration: BoxDecoration(color: resaltada ? SeimaColors.red : SeimaColors.tint2, shape: BoxShape.circle),
      child: Text(inicial, style: archivo(tamano * 0.44, 850, width: 112, height: 1, color: resaltada ? Colors.white : SeimaColors.ink)),
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
    return Padding(
      padding: const EdgeInsets.fromLTRB(28, 24, 28, 24),
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const CapasMarca(ancho: 130, claro: true),
          const SizedBox(height: 24),
          Text(titulo, style: archivo(26, 850, width: 118, height: 1.1)),
          const SizedBox(height: 12),
          Text(detalle, style: archivo(18, 500, color: SeimaColors.muted)),
          if (accion != null) ...[
            const SizedBox(height: 20),
            SeimaButton(label: accion!, onPressed: onPressed),
          ],
        ],
      ),
    );
  }
}
