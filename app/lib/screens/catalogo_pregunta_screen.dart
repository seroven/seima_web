import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../catalogo/catalogo.dart';
import '../catalogo/catalogo_controller.dart';
import '../theme/seima_colors.dart';
import '../theme/seima_theme.dart';
import '../widgets/cabecera_seima.dart';
import '../widgets/elecciones.dart';
import '../widgets/gestion.dart';
import '../widgets/seima_button.dart';

/// Una pregunta del cotizador: su texto, cómo se responde, en qué servicios se hace y sus opciones.
class PreguntaScreen extends ConsumerWidget {
  const PreguntaScreen({super.key, required this.id});

  final String id;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final asincrona = ref.watch(preguntaCotPorId(id));
    final pregunta = asincrona.value;
    final servicios = ref.watch(serviciosCotProvider).value ?? const <ServicioCot>[];

    if (pregunta == null) {
      return Scaffold(
        appBar: AppBar(title: const Text('Pregunta')),
        body: asincrona.isLoading
            ? const Center(child: CircularProgressIndicator(color: SeimaColors.red))
            : Padding(padding: const EdgeInsets.all(24), child: Text(asincrona.hasError ? asincrona.error.toString() : 'Esa pregunta ya no existe.', style: archivo(18, 500))),
      );
    }

    final notifier = ref.read(preguntasCotProvider.notifier);
    return Scaffold(
      body: RefreshIndicator(
        color: SeimaColors.red,
        onRefresh: () async => ref.invalidate(preguntasCotProvider),
        child: CustomScrollView(
          physics: const AlwaysScrollableScrollPhysics(),
          slivers: [
            SliverCabeceraSeima(
              titulo: pregunta.etiqueta,
              subtitulo: pregunta.visible ? 'Así se ve en el cotizador' : (pregunta.opcionesActivas == 0 ? 'Todavía no se muestra: falta una opción' : 'Ahora no se muestra al cliente'),
              alturaExpandida: 130,
              alVolver: () => context.pop(),
            ),
            SliverPadding(
              padding: const EdgeInsets.fromLTRB(16, 22, 16, 48),
              sliver: SliverList(
                delegate: SliverChildListDelegate([
                  const _Titulo('Lo que ve el cliente'),
                  FilaGestion(
                    titulo: pregunta.texto,
                    detalle: 'Toca para cambiar la pregunta',
                    onTap: () => _cambiarTexto(context, notifier, pregunta, esEtiqueta: false),
                  ),
                  const SizedBox(height: 10),
                  FilaGestion(
                    titulo: 'Nombre corto: ${pregunta.etiqueta}',
                    detalle: 'Sale en el resumen de la cotización',
                    onTap: () => _cambiarTexto(context, notifier, pregunta, esEtiqueta: true),
                  ),
                  const SizedBox(height: 26),
                  const _Titulo('¿Cómo responde?'),
                  Row(
                    children: [
                      Expanded(child: TarjetaEleccion(texto: 'Elige una', icono: Icons.radio_button_checked, activo: !pregunta.variasRespuestas, onTap: () => _tipo(context, notifier, pregunta, 'unica'))),
                      const SizedBox(width: 10),
                      Expanded(child: TarjetaEleccion(texto: 'Elige varias', icono: Icons.checklist, activo: pregunta.variasRespuestas, onTap: () => _tipo(context, notifier, pregunta, 'multiple'))),
                    ],
                  ),
                  const SizedBox(height: 26),
                  const _Titulo('Se hace en estos servicios'),
                  Wrap(
                    spacing: 8,
                    runSpacing: 8,
                    children: [
                      for (final s in servicios)
                        ChipEleccion(texto: s.nombre, activo: pregunta.aplicaA(s.id), onTap: () => _servicio(context, notifier, pregunta, s)),
                    ],
                  ),
                  const SizedBox(height: 26),
                  FilaGestion(
                    titulo: 'Pregunta activa',
                    detalle: pregunta.activo ? 'El cliente la ve (si tiene opciones)' : 'No se le hace al cliente',
                    activo: pregunta.activo,
                    onActivo: (on) => _activa(context, notifier, pregunta, on),
                  ),
                  const SizedBox(height: 26),
                  const _Titulo('Opciones'),
                  if (pregunta.opciones.isEmpty)
                    Padding(
                      padding: const EdgeInsets.fromLTRB(6, 0, 6, 12),
                      child: Text('Sin opciones no se le muestra al cliente. Agrega al menos una.', style: archivo(16, 600, height: 1.3, color: SeimaColors.redText)),
                    ),
                  for (var i = 0; i < pregunta.opciones.length; i++) ...[
                    FilaGestion(
                      titulo: pregunta.opciones[i].etiqueta,
                      detalle: [if (pregunta.opciones[i].descripcion != null) pregunta.opciones[i].descripcion!, pregunta.opciones[i].resumenEntrada].where((t) => t.isNotEmpty).join(' · '),
                      activo: pregunta.opciones[i].activo,
                      onActivo: (on) => _opcionActiva(context, notifier, pregunta.opciones[i], on),
                      ordenable: true,
                      onSubir: i > 0 ? () => _moverOpcion(context, notifier, pregunta, pregunta.opciones[i], -1) : null,
                      onBajar: i < pregunta.opciones.length - 1 ? () => _moverOpcion(context, notifier, pregunta, pregunta.opciones[i], 1) : null,
                      onTap: () => context.push('/catalogo/preguntas/${pregunta.id}/opcion/${pregunta.opciones[i].id}'),
                    ),
                    const SizedBox(height: 10),
                  ],
                  const SizedBox(height: 6),
                  SeimaButton(label: 'Agregar opción', icono: Icons.add, onPressed: () => context.push('/catalogo/preguntas/${pregunta.id}/opcion')),
                ]),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Future<void> _cambiarTexto(BuildContext context, PreguntasCotController notifier, PreguntaCot p, {required bool esEtiqueta}) async {
    final nuevo = await pedirTexto(
      context,
      titulo: esEtiqueta ? 'Nombre corto' : 'La pregunta',
      ayuda: esEtiqueta ? 'Sale en el resumen que recibes. Ej: Piso' : 'Lo que lee el cliente. Ej: ¿Qué tipo de piso quieres?',
      valorInicial: esEtiqueta ? p.etiqueta : p.texto,
      maxLength: esEtiqueta ? 60 : 160,
      maxLines: esEtiqueta ? 1 : 3,
    );
    if (nuevo == null || !context.mounted) return;
    final error = await (esEtiqueta ? notifier.cambiar(p.id, etiqueta: nuevo) : notifier.cambiar(p.id, texto: nuevo));
    if (context.mounted && error != null) avisar(context, error);
  }

  Future<void> _tipo(BuildContext context, PreguntasCotController notifier, PreguntaCot p, String tipo) async {
    if (p.tipo == tipo) return;
    final error = await notifier.cambiar(p.id, tipo: tipo);
    if (context.mounted && error != null) avisar(context, error);
  }

  Future<void> _servicio(BuildContext context, PreguntasCotController notifier, PreguntaCot p, ServicioCot s) async {
    final ids = p.servicios.map((x) => x.id).toList();
    if (ids.contains(s.id)) {
      if (ids.length == 1) {
        avisar(context, 'Tiene que quedar en al menos un servicio.');
        return;
      }
      ids.remove(s.id);
    } else {
      ids.add(s.id);
    }
    final error = await notifier.cambiar(p.id, servicios: ids);
    if (context.mounted && error != null) avisar(context, error);
  }

  Future<void> _activa(BuildContext context, PreguntasCotController notifier, PreguntaCot p, bool on) async {
    final error = await notifier.cambiar(p.id, activo: on);
    if (context.mounted && error != null) avisar(context, error);
  }

  Future<void> _opcionActiva(BuildContext context, PreguntasCotController notifier, OpcionCot o, bool on) async {
    final error = await notifier.cambiarOpcion(o.id, activo: on);
    if (context.mounted && error != null) avisar(context, error);
  }

  Future<void> _moverOpcion(BuildContext context, PreguntasCotController notifier, PreguntaCot p, OpcionCot o, int delta) async {
    final error = await notifier.moverOpcion(preguntaId: p.id, id: o.id, delta: delta);
    if (context.mounted && error != null) avisar(context, error);
  }
}

class _Titulo extends StatelessWidget {
  const _Titulo(this.texto);

  final String texto;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(left: 6, bottom: 10),
      child: Text(texto.toUpperCase(), style: archivo(14, 800, width: 112, height: 1.1, color: SeimaColors.muted).copyWith(letterSpacing: 1.2)),
    );
  }
}
