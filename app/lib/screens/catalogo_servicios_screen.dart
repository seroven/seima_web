import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../catalogo/catalogo.dart';
import '../catalogo/catalogo_controller.dart';
import '../theme/seima_colors.dart';
import '../router/volver.dart';
import '../theme/seima_theme.dart';
import '../widgets/cabecera_seima.dart';
import '../widgets/capas_marca.dart';
import '../widgets/gestion.dart';
import '../widgets/seima_button.dart';

/// Servicios del cotizador (Cocina, Pintura…): lo que el cliente puede pedir. Cada uno abre sus preguntas.
class ServiciosScreen extends ConsumerWidget {
  const ServiciosScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final lista = ref.watch(serviciosCotProvider);
    return Scaffold(
      floatingActionButtonLocation: FloatingActionButtonLocation.centerFloat,
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () => _nuevo(context, ref),
        backgroundColor: SeimaColors.red,
        foregroundColor: Colors.white,
        elevation: 0,
        focusElevation: 0,
        hoverElevation: 0,
        highlightElevation: 0,
        extendedPadding: const EdgeInsets.symmetric(horizontal: 28),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(18)),
        icon: const Icon(Icons.add, size: 28),
        label: Text('Nuevo servicio', style: archivo(18, 800, height: 1.1, color: Colors.white)),
      ),
      body: RefreshIndicator(
        color: SeimaColors.red,
        onRefresh: () async {
          ref.invalidate(serviciosCotProvider);
          ref.invalidate(preguntasCotProvider);
        },
        child: CustomScrollView(
          physics: const AlwaysScrollableScrollPhysics(),
          slivers: [
            SliverCabeceraSeima(
              titulo: 'Servicios',
              subtitulo: 'Lo que el cliente puede pedir al cotizar',
              alturaExpandida: 130,
              alVolver: () => context.volver('/ajustes'),
            ),
            ...lista.when(
              loading: () => [const SliverFillRemaining(hasScrollBody: false, child: Center(child: CircularProgressIndicator(color: SeimaColors.red)))],
              error: (error, _) => [
                SliverFillRemaining(
                  hasScrollBody: false,
                  child: Padding(
                    padding: const EdgeInsets.all(28),
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const CapasMarca(ancho: 120, claro: true),
                        const SizedBox(height: 24),
                        Text('No se pudieron cargar', style: archivo(26, 850, width: 118, height: 1.1)),
                        const SizedBox(height: 10),
                        Text(error.toString(), style: archivo(17, 500, color: SeimaColors.muted)),
                        const SizedBox(height: 20),
                        SeimaButton(label: 'Reintentar', onPressed: () => ref.invalidate(serviciosCotProvider)),
                      ],
                    ),
                  ),
                ),
              ],
              data: (servicios) => [
                SliverPadding(
                  padding: const EdgeInsets.fromLTRB(22, 20, 22, 14),
                  sliver: SliverToBoxAdapter(
                    child: Text(
                      'Toca un servicio para ver y editar sus preguntas. Arrastra el ≡ para cambiar el orden.',
                      style: archivo(15, 500, height: 1.3, color: SeimaColors.muted),
                    ),
                  ),
                ),
                SliverPadding(
                  padding: const EdgeInsets.fromLTRB(16, 0, 16, 112),
                  sliver: SliverReorderableList(
                    itemCount: servicios.length,
                    proxyDecorator: arrastrandoFila,
                    onReorderItem: (viejo, nuevo) => _reordenar(context, ref, viejo, nuevo),
                    itemBuilder: (context, i) {
                      final servicio = servicios[i];
                      return Padding(
                        key: ValueKey(servicio.id),
                        padding: const EdgeInsets.only(bottom: 10),
                        child: FilaGestion(
                          titulo: servicio.nombre,
                          icono: iconoDeServicio(servicio.icono),
                          detalle: servicio.preguntas == 0 ? 'Sin preguntas' : (servicio.preguntas == 1 ? '1 pregunta' : '${servicio.preguntas} preguntas'),
                          activo: servicio.activo,
                          onActivo: (on) => _activar(context, ref, servicio, on),
                          indiceArrastre: i,
                          onTap: () => context.push('/catalogo/servicios/${servicio.id}'),
                        ),
                      );
                    },
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Future<void> _nuevo(BuildContext context, WidgetRef ref) async {
    final datos = await pedirServicio(context, titulo: 'Nuevo servicio', boton: 'Crear');
    if (datos == null || !context.mounted) return;
    final (error, creado) = await ref.read(serviciosCotProvider.notifier).crear(nombre: datos.nombre, icono: datos.icono);
    if (!context.mounted) return;
    if (error != null) {
      avisar(context, error);
    } else if (creado != null) {
      context.push('/catalogo/servicios/${creado.id}');
    }
  }

  Future<void> _activar(BuildContext context, WidgetRef ref, ServicioCot servicio, bool on) async {
    if (!on) {
      final seguro = await confirmar(
        context,
        titulo: '¿Desactivar «${servicio.nombre}»?',
        texto: 'Dejará de aparecer en el cotizador. Las cotizaciones que ya llegaron no cambian.',
        boton: 'Desactivar',
      );
      if (!seguro || !context.mounted) return;
    }
    final error = await ref.read(serviciosCotProvider.notifier).cambiar(servicio.id, activo: on);
    if (context.mounted && error != null) avisar(context, error);
  }

  Future<void> _reordenar(BuildContext context, WidgetRef ref, int viejo, int nuevo) async {
    final error = await ref.read(serviciosCotProvider.notifier).reordenar(viejo, nuevo);
    if (context.mounted && error != null) avisar(context, error);
  }
}

typedef DatosServicio = ({String nombre, String icono});

/// Hoja para crear o editar un servicio: nombre e ícono.
Future<DatosServicio?> pedirServicio(BuildContext context, {required String titulo, required String boton, String? nombre, String? icono}) {
  return showModalBottomSheet<DatosServicio>(
    context: context,
    isScrollControlled: true,
    backgroundColor: SeimaColors.paper,
    showDragHandle: true,
    shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(28))),
    builder: (contexto) => _HojaServicio(titulo: titulo, boton: boton, nombre: nombre, icono: icono ?? 'generico'),
  );
}

class _HojaServicio extends StatefulWidget {
  const _HojaServicio({required this.titulo, required this.boton, required this.nombre, required this.icono});

  final String titulo;
  final String boton;
  final String? nombre;
  final String icono;

  @override
  State<_HojaServicio> createState() => _HojaServicioState();
}

class _HojaServicioState extends State<_HojaServicio> {
  late final _nombre = TextEditingController(text: widget.nombre ?? '');
  late var _icono = widget.icono;

  @override
  void dispose() {
    _nombre.dispose();
    super.dispose();
  }

  void _listo() {
    final limpio = _nombre.text.trim();
    if (limpio.isEmpty) return;
    Navigator.pop(context, (nombre: limpio, icono: _icono));
  }

  @override
  Widget build(BuildContext context) {
    return SingleChildScrollView(
      padding: EdgeInsets.fromLTRB(24, 0, 24, 20 + MediaQuery.viewInsetsOf(context).bottom),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Text(widget.titulo, style: archivo(22, 850, width: 118, height: 1.12)),
          const SizedBox(height: 16),
          TextField(
            controller: _nombre,
            autofocus: widget.nombre == null,
            maxLength: 80,
            textCapitalization: TextCapitalization.sentences,
            style: archivo(18, 550),
            decoration: const InputDecoration(hintText: 'Nombre del servicio', counterText: ''),
          ),
          const SizedBox(height: 18),
          Text('Ícono', style: archivo(16, 750, height: 1.2)),
          const SizedBox(height: 10),
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: [
              for (final entrada in iconosServicio.entries)
                Semantics(
                  button: true,
                  selected: entrada.key == _icono,
                  label: 'Ícono ${entrada.key}',
                  child: Material(
                    color: entrada.key == _icono ? SeimaColors.ink : SeimaColors.paper2,
                    borderRadius: BorderRadius.circular(14),
                    child: InkWell(
                      borderRadius: BorderRadius.circular(14),
                      onTap: () => setState(() => _icono = entrada.key),
                      child: SizedBox(width: 54, height: 54, child: Icon(entrada.value, color: entrada.key == _icono ? Colors.white : SeimaColors.ink)),
                    ),
                  ),
                ),
            ],
          ),
          const SizedBox(height: 20),
          SeimaButton(label: widget.boton, onPressed: _listo),
        ],
      ),
    );
  }
}
