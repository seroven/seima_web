import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../catalogo/catalogo.dart';
import '../catalogo/catalogo_controller.dart';
import '../theme/seima_colors.dart';
import '../router/volver.dart';
import '../theme/seima_theme.dart';
import '../widgets/cabecera_seima.dart';
import '../widgets/elecciones.dart';
import '../widgets/gestion.dart';
import '../widgets/seima_button.dart';
import 'catalogo_servicios_screen.dart';

/// Un servicio del cotizador y las preguntas que se le hacen al cliente cuando lo elige.
class ServicioScreen extends ConsumerWidget {
  const ServicioScreen({super.key, required this.id});

  final String id;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final servicioAsync = ref.watch(servicioCotPorId(id));
    final preguntasAsync = ref.watch(preguntasCotProvider);
    final servicio = servicioAsync.value;

    if (servicio == null) {
      return Scaffold(
        appBar: AppBar(leading: BackButton(onPressed: () => context.volver('/ajustes')), title: const Text('Servicio')),
        body: servicioAsync.isLoading || preguntasAsync.isLoading
            ? const Center(child: CircularProgressIndicator(color: SeimaColors.red))
            : Padding(
                padding: const EdgeInsets.all(24),
                child: Text(servicioAsync.hasError ? servicioAsync.error.toString() : 'Ese servicio ya no existe.', style: archivo(18, 500)),
              ),
      );
    }

    final todas = preguntasAsync.value ?? const <PreguntaCot>[];
    final propias = [...todas.where((p) => p.aplicaA(id))]..sort((a, b) => a.orden.compareTo(b.orden));

    return Scaffold(
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
              titulo: servicio.nombre,
              subtitulo: 'Preguntas que se hacen con este servicio',
              alturaExpandida: 150,
              alVolver: () => context.volver('/ajustes'),
              acciones: [BotonRedondo(icono: Icons.edit_outlined, tooltip: 'Cambiar nombre o ícono', onPressed: () => _editar(context, ref, servicio))],
            ),
            SliverPadding(
              padding: const EdgeInsets.fromLTRB(16, 20, 16, 0),
              sliver: SliverList(
                delegate: SliverChildListDelegate([
                  FilaGestion(
                    titulo: 'Se muestra en el cotizador',
                    detalle: servicio.activo ? 'El cliente puede elegirlo' : 'El cliente no lo ve',
                    icono: iconoDeServicio(servicio.icono),
                    activo: servicio.activo,
                    onActivo: (on) => _activarServicio(context, ref, servicio, on),
                  ),
                  const SizedBox(height: 26),
                  Padding(
                    padding: const EdgeInsets.only(left: 6, bottom: 10),
                    child: Text('PREGUNTAS', style: archivo(14, 800, width: 112, height: 1.1, color: SeimaColors.muted).copyWith(letterSpacing: 1.2)),
                  ),
                  if (preguntasAsync.isLoading)
                    const Padding(padding: EdgeInsets.all(24), child: Center(child: CircularProgressIndicator(color: SeimaColors.red)))
                  else if (preguntasAsync.hasError)
                    Text(preguntasAsync.error.toString(), style: archivo(16, 600, color: SeimaColors.redText))
                  else if (propias.isEmpty)
                    Padding(
                      padding: const EdgeInsets.fromLTRB(6, 0, 6, 12),
                      child: Text('Este servicio todavía no tiene preguntas. Crea una o agrega una que ya exista.', style: archivo(16, 500, height: 1.3, color: SeimaColors.muted)),
                    )
                  else if (propias.length > 1)
                    Padding(
                      padding: const EdgeInsets.fromLTRB(6, 0, 6, 12),
                      child: Text('Arrastra el ≡ para cambiar el orden en que se hacen.', style: archivo(15, 500, height: 1.3, color: SeimaColors.muted)),
                    ),
                ]),
              ),
            ),
            // Las preguntas van en una lista que se puede reordenar arrastrando.
            if (!preguntasAsync.isLoading && !preguntasAsync.hasError && propias.isNotEmpty)
              SliverPadding(
                padding: const EdgeInsets.symmetric(horizontal: 16),
                sliver: SliverReorderableList(
                  itemCount: propias.length,
                  proxyDecorator: arrastrandoFila,
                  onReorderItem: (viejo, nuevo) => _reordenar(context, ref, propias, viejo, nuevo),
                  itemBuilder: (context, i) {
                    final p = propias[i];
                    return Padding(
                      key: ValueKey(p.id),
                      padding: const EdgeInsets.only(bottom: 10),
                      child: FilaGestion(
                        titulo: p.texto,
                        detalle: '${p.resumenTipo} · ${_cuantas(p.opcionesActivas)}${p.servicios.length > 1 ? ' · en ${p.servicios.length} servicios' : ''}',
                        aviso: p.activo && p.opcionesActivas == 0 ? 'Sin opciones: no se muestra' : null,
                        activo: p.activo,
                        onActivo: (on) => _activarPregunta(context, ref, p, on),
                        indiceArrastre: i,
                        onTap: () => context.push('/catalogo/preguntas/${p.id}'),
                      ),
                    );
                  },
                ),
              ),
            SliverPadding(
              padding: const EdgeInsets.fromLTRB(16, 4, 16, 40),
              sliver: SliverList(
                delegate: SliverChildListDelegate([
                  SeimaButton(label: 'Nueva pregunta', icono: Icons.add, onPressed: () => _nueva(context, ref, servicio)),
                  const SizedBox(height: 10),
                  BotonSuave(icono: Icons.link, label: 'Agregar una pregunta que ya existe', onPressed: () => _agregarExistente(context, ref, servicio, todas)),
                ]),
              ),
            ),
          ],
        ),
      ),
    );
  }

  static String _cuantas(int n) => n == 0 ? 'sin opciones' : (n == 1 ? '1 opción' : '$n opciones');

  Future<void> _editar(BuildContext context, WidgetRef ref, ServicioCot servicio) async {
    final datos = await pedirServicio(context, titulo: 'Servicio', boton: 'Guardar', nombre: servicio.nombre, icono: servicio.icono);
    if (datos == null || !context.mounted) return;
    final error = await ref.read(serviciosCotProvider.notifier).cambiar(servicio.id, nombre: datos.nombre, icono: datos.icono);
    if (context.mounted && error != null) avisar(context, error);
  }

  Future<void> _activarServicio(BuildContext context, WidgetRef ref, ServicioCot servicio, bool on) async {
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

  Future<void> _activarPregunta(BuildContext context, WidgetRef ref, PreguntaCot pregunta, bool on) async {
    final error = await ref.read(preguntasCotProvider.notifier).cambiar(pregunta.id, activo: on);
    if (context.mounted && error != null) avisar(context, error);
  }

  Future<void> _reordenar(BuildContext context, WidgetRef ref, List<PreguntaCot> propias, int viejo, int nuevo) async {
    final error = await ref.read(preguntasCotProvider.notifier).reordenarDeServicio(propias, viejo, nuevo);
    if (context.mounted && error != null) avisar(context, error);
  }

  Future<void> _nueva(BuildContext context, WidgetRef ref, ServicioCot servicio) async {
    final datos = await showModalBottomSheet<DatosPregunta>(
      context: context,
      isScrollControlled: true,
      backgroundColor: SeimaColors.paper,
      showDragHandle: true,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(28))),
      builder: (contexto) => const _HojaPregunta(),
    );
    if (datos == null || !context.mounted) return;
    final (error, creada) = await ref.read(preguntasCotProvider.notifier).crear(
      texto: datos.texto,
      etiqueta: datos.etiqueta,
      tipo: datos.tipo,
      servicios: [servicio.id],
    );
    if (!context.mounted) return;
    if (error != null) {
      avisar(context, error);
    } else if (creada != null) {
      // Se abre para agregarle sus opciones: sin opciones no se muestra al cliente.
      context.push('/catalogo/preguntas/${creada.id}');
    }
  }

  Future<void> _agregarExistente(BuildContext context, WidgetRef ref, ServicioCot servicio, List<PreguntaCot> todas) async {
    final disponibles = [...todas.where((p) => !p.aplicaA(servicio.id))]..sort((a, b) => a.orden.compareTo(b.orden));
    if (disponibles.isEmpty) {
      avisar(context, 'Todas las preguntas ya se hacen en este servicio.');
      return;
    }
    final elegida = await showModalBottomSheet<PreguntaCot>(
      context: context,
      isScrollControlled: true,
      backgroundColor: SeimaColors.paper,
      showDragHandle: true,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(28))),
      builder: (contexto) => DraggableScrollableSheet(
        expand: false,
        initialChildSize: 0.7,
        maxChildSize: 0.92,
        builder: (contexto, scroll) => ListView(
          controller: scroll,
          padding: const EdgeInsets.fromLTRB(16, 0, 16, 24),
          children: [
            Padding(
              padding: const EdgeInsets.fromLTRB(8, 0, 8, 6),
              child: Text('¿Cuál agregas?', style: archivo(22, 850, width: 118, height: 1.12)),
            ),
            Padding(
              padding: const EdgeInsets.fromLTRB(8, 0, 8, 14),
              child: Text('Se hace también en el servicio donde ya estaba.', style: archivo(15, 500, height: 1.3, color: SeimaColors.muted)),
            ),
            for (final p in disponibles) ...[
              FilaGestion(
                titulo: p.texto,
                detalle: 'En: ${p.servicios.map((s) => s.nombre).join(', ')}',
                onTap: () => Navigator.pop(contexto, p),
              ),
              const SizedBox(height: 10),
            ],
          ],
        ),
      ),
    );
    if (elegida == null || !context.mounted) return;
    final error = await ref.read(preguntasCotProvider.notifier).cambiar(elegida.id, servicios: [...elegida.servicios.map((s) => s.id), servicio.id]);
    if (context.mounted && error != null) avisar(context, error);
  }
}

typedef DatosPregunta = ({String texto, String etiqueta, String tipo});

class _HojaPregunta extends StatefulWidget {
  const _HojaPregunta();

  @override
  State<_HojaPregunta> createState() => _HojaPreguntaState();
}

class _HojaPreguntaState extends State<_HojaPregunta> {
  final _texto = TextEditingController();
  final _etiqueta = TextEditingController();
  var _tipo = 'unica';
  String? _error;

  @override
  void dispose() {
    _texto.dispose();
    _etiqueta.dispose();
    super.dispose();
  }

  void _listo() {
    final texto = _texto.text.trim();
    final etiqueta = _etiqueta.text.trim();
    if (texto.length < 5) {
      setState(() => _error = 'Escribe la pregunta completa');
      return;
    }
    if (etiqueta.length < 2) {
      setState(() => _error = 'Escribe un nombre corto');
      return;
    }
    Navigator.pop(context, (texto: texto, etiqueta: etiqueta, tipo: _tipo));
  }

  @override
  Widget build(BuildContext context) {
    return SingleChildScrollView(
      padding: EdgeInsets.fromLTRB(24, 0, 24, 20 + MediaQuery.viewInsetsOf(context).bottom),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Text('Nueva pregunta', style: archivo(22, 850, width: 118, height: 1.12)),
          const SizedBox(height: 16),
          TextField(
            controller: _texto,
            autofocus: true,
            maxLength: 160,
            minLines: 1,
            maxLines: 3,
            textCapitalization: TextCapitalization.sentences,
            style: archivo(18, 550),
            decoration: const InputDecoration(hintText: 'Lo que ve el cliente. Ej: ¿Qué tipo de piso?', counterText: ''),
          ),
          const SizedBox(height: 10),
          TextField(
            controller: _etiqueta,
            maxLength: 60,
            textCapitalization: TextCapitalization.sentences,
            style: archivo(18, 550),
            decoration: const InputDecoration(hintText: 'Nombre corto para tu resumen. Ej: Piso', counterText: ''),
          ),
          const SizedBox(height: 14),
          Row(
            children: [
              Expanded(child: TarjetaEleccion(texto: 'Elige una', icono: Icons.radio_button_checked, activo: _tipo == 'unica', onTap: () => setState(() => _tipo = 'unica'))),
              const SizedBox(width: 10),
              Expanded(child: TarjetaEleccion(texto: 'Elige varias', icono: Icons.checklist, activo: _tipo == 'multiple', onTap: () => setState(() => _tipo = 'multiple'))),
            ],
          ),
          if (_error != null) Padding(padding: const EdgeInsets.only(top: 12), child: Text(_error!, style: archivo(15, 650, height: 1.3, color: SeimaColors.redText))),
          const SizedBox(height: 16),
          SeimaButton(label: 'Crear y agregar opciones', onPressed: _listo),
        ],
      ),
    );
  }
}
