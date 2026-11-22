import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../auth/auth_controller.dart';
import '../auth/auth_state.dart';
import '../projects/proyecto.dart';
import '../projects/proyectos_controller.dart';
import '../theme/seima_colors.dart';
import '../theme/seima_theme.dart';
import '../widgets/cabecera_seima.dart';
import '../widgets/capas_marca.dart';
import '../widgets/etiquetas.dart';
import '../widgets/foto_llena.dart';
import '../widgets/seima_button.dart';
import '../widgets/toque.dart';

class ProyectosScreen extends ConsumerWidget {
  const ProyectosScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final lista = ref.watch(proyectosListaProvider);
    final auth = ref.watch(authProvider).value;
    final saludo = auth is AuthSignedIn ? primerNombre(auth.nombre) : '';

    return Scaffold(
      floatingActionButtonLocation: FloatingActionButtonLocation.centerFloat,
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () => context.push('/proyecto/nuevo'),
        backgroundColor: SeimaColors.red,
        foregroundColor: Colors.white,
        elevation: 0,
        focusElevation: 0,
        hoverElevation: 0,
        highlightElevation: 0,
        extendedPadding: const EdgeInsets.symmetric(horizontal: 28),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(18)),
        icon: const Icon(Icons.add, size: 28),
        label: Text('Nuevo proyecto', style: archivo(18, 800, height: 1.1, color: Colors.white)),
      ),
      body: RefreshIndicator(
        color: SeimaColors.red,
        onRefresh: () async => ref.invalidate(proyectosListaProvider),
        child: CustomScrollView(
          physics: const AlwaysScrollableScrollPhysics(),
          slivers: [
            SliverCabeceraSeima(
              antetitulo: saludo.isEmpty ? null : 'Hola, $saludo',
              titulo: 'Mis obras',
              alturaExpandida: 168,
              hijo: lista.maybeWhen(data: _Cifras.new, orElse: () => null),
            ),
            ...lista.when(
              loading: () => [const SliverFillRemaining(hasScrollBody: false, child: Center(child: CircularProgressIndicator(color: SeimaColors.red)))],
              error: (error, _) => [
                SliverFillRemaining(
                  hasScrollBody: false,
                  child: _Vacio(
                    titulo: 'No se pudieron cargar las obras',
                    detalle: error.toString(),
                    accion: 'Reintentar',
                    onPressed: () => ref.invalidate(proyectosListaProvider),
                  ),
                ),
              ],
              data: (proyectos) {
                if (proyectos.isEmpty) {
                  return [
                    const SliverFillRemaining(
                      hasScrollBody: false,
                      child: _Vacio(
                        titulo: 'Aquí van a vivir tus obras',
                        detalle: 'Toca «Nuevo proyecto» para crear la primera. Empieza como borrador y la publicas cuando esté lista.',
                      ),
                    ),
                  ];
                }
                return [
                  SliverPadding(
                    padding: const EdgeInsets.fromLTRB(16, 20, 16, 112),
                    sliver: SliverList.separated(
                      itemCount: proyectos.length,
                      separatorBuilder: (_, _) => const SizedBox(height: 16),
                      itemBuilder: (context, index) => Aparece(indice: index, child: _TarjetaObra(proyectos[index])),
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

/// «luis» o «Luis Rodríguez» → «Luis».
String primerNombre(String nombre) {
  final limpio = nombre.trim();
  if (limpio.isEmpty) return '';
  final primero = limpio.split(RegExp(r'\s+')).first;
  return primero[0].toUpperCase() + primero.substring(1);
}

class _Cifras extends StatelessWidget {
  const _Cifras(this.proyectos);

  final List<Proyecto> proyectos;

  @override
  Widget build(BuildContext context) {
    int cuantas(String estado) => proyectos.where((p) => p.estado == estado).length;
    return Row(
      children: [
        CifraCabecera(cifra: cuantas('publicado'), rotulo: 'Publicadas', resalta: true),
        const SizedBox(width: 32),
        CifraCabecera(cifra: cuantas('borrador'), rotulo: 'Borradores'),
        const SizedBox(width: 32),
        CifraCabecera(cifra: cuantas('oculto'), rotulo: 'Ocultas'),
      ],
    );
  }
}

class _TarjetaObra extends StatelessWidget {
  const _TarjetaObra(this.proyecto);

  final Proyecto proyecto;

  @override
  Widget build(BuildContext context) {
    final detalle = [
      if (proyecto.categoriasTexto.isNotEmpty) proyecto.categoriasTexto,
      if (proyecto.distrito != null && proyecto.distrito!.isNotEmpty) proyecto.distrito!,
    ].join(' · ');
    return TarjetaToque(
      semantica: '${proyecto.titulo}, ${proyecto.etiquetaEstado}',
      onTap: () => context.push('/proyecto/${proyecto.id}'),
      child: ClipRRect(
        borderRadius: BorderRadius.circular(22),
        child: AspectRatio(
          aspectRatio: 4 / 3.2,
          child: Stack(
            fit: StackFit.expand,
            children: [
              if (proyecto.portadaLista.isEmpty)
                const _SinFoto()
              else
                FotoLlena(proyecto.portadaLista),
              // Velo para que el texto blanco se lea sobre cualquier foto.
              const DecoratedBox(
                decoration: BoxDecoration(
                  gradient: LinearGradient(
                    begin: Alignment.topCenter,
                    end: Alignment.bottomCenter,
                    stops: [0.3, 1],
                    colors: [Color(0x000E0E0E), Color(0xE60E0E0E)],
                  ),
                ),
              ),
              Positioned(left: 14, top: 14, child: Etiqueta.obra(proyecto.estado, sobreFoto: true)),
              Positioned(
                left: 18,
                right: 76,
                bottom: 16,
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      proyecto.titulo,
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                      style: archivo(24, 850, width: 118, height: 1.08, color: Colors.white),
                    ),
                    if (detalle.isNotEmpty) ...[
                      const SizedBox(height: 4),
                      Text(detalle, maxLines: 1, overflow: TextOverflow.ellipsis, style: archivo(16, 600, height: 1.2, color: const Color(0xCCFFFFFF))),
                    ],
                  ],
                ),
              ),
              const Positioned(
                right: 14,
                bottom: 14,
                child: DecoratedBox(
                  decoration: BoxDecoration(color: SeimaColors.red, shape: BoxShape.circle),
                  child: SizedBox(width: 48, height: 48, child: Icon(Icons.arrow_forward, color: Colors.white)),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _SinFoto extends StatelessWidget {
  const _SinFoto();

  @override
  Widget build(BuildContext context) {
    return const ColoredBox(
      color: SeimaColors.ink2,
      child: Align(alignment: Alignment(0.7, -0.5), child: CapasMarca(ancho: 170)),
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
      padding: const EdgeInsets.fromLTRB(28, 24, 28, 112),
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const CapasMarca(ancho: 150, claro: true),
          const SizedBox(height: 28),
          Text(titulo, style: archivo(28, 850, width: 118, height: 1.08)),
          const SizedBox(height: 12),
          Text(detalle, style: archivo(18, 500, color: SeimaColors.muted)),
          if (accion != null) ...[
            const SizedBox(height: 24),
            SeimaButton(label: accion!, onPressed: onPressed),
          ],
        ],
      ),
    );
  }
}
