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
              padding: const EdgeInsets.fromLTRB(16, 22, 16, 0),
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
                    )
                  else if (pregunta.opciones.length > 1)
                    Padding(
                      padding: const EdgeInsets.fromLTRB(6, 0, 6, 12),
                      child: Text('Arrastra el ≡ para cambiar el orden en que se muestran.', style: archivo(15, 500, height: 1.3, color: SeimaColors.muted)),
                    ),
                ]),
              ),
            ),
            // Las opciones van en una lista que se puede reordenar arrastrando.
            SliverPadding(
              padding: const EdgeInsets.symmetric(horizontal: 16),
              sliver: SliverReorderableList(
                itemCount: pregunta.opciones.length,
                proxyDecorator: arrastrandoFila,
                onReorderItem: (viejo, nuevo) => _reordenarOpciones(context, notifier, pregunta, viejo, nuevo),
                itemBuilder: (context, i) {
                  final o = pregunta.opciones[i];
                  return Padding(
                    key: ValueKey(o.id),
                    padding: const EdgeInsets.only(bottom: 10),
                    child: FilaGestion(
                      titulo: o.etiqueta,
                      detalle: [if (o.descripcion != null) o.descripcion!, o.resumenEntrada].where((t) => t.isNotEmpty).join(' · '),
                      activo: o.activo,
                      onActivo: (on) => _opcionActiva(context, notifier, o, on),
                      indiceArrastre: i,
                      onTap: () => context.push('/catalogo/preguntas/${pregunta.id}/opcion/${o.id}'),
                    ),
                  );
                },
              ),
            ),
            SliverPadding(
              padding: const EdgeInsets.fromLTRB(16, 6, 16, 48),
              sliver: SliverToBoxAdapter(
                child: SeimaButton(label: 'Agregar opción', icono: Icons.add, onPressed: () => context.push('/catalogo/preguntas/${pregunta.id}/opcion')),
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

  Future<void> _reordenarOpciones(BuildContext context, PreguntasCotController notifier, PreguntaCot p, int viejo, int nuevo) async {
    final error = await notifier.reordenarOpciones(p.id, viejo, nuevo);
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
