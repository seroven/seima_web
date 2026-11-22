import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:url_launcher/url_launcher.dart';

import '../quotes/cotizacion.dart';
import '../quotes/cotizaciones_controller.dart';
import '../theme/seima_colors.dart';
import '../theme/seima_theme.dart';
import '../widgets/cabecera_seima.dart';
import '../widgets/etiquetas.dart';
import '../widgets/foto_llena.dart';
import '../widgets/seima_button.dart';

class CotizacionScreen extends ConsumerWidget {
  const CotizacionScreen({super.key, required this.id});

  final String id;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final cotizacion = ref.watch(cotizacionProvider(id));
    return Scaffold(
      appBar: cotizacion.hasValue ? null : AppBar(title: const Text('Cotización')),
      body: cotizacion.when(
        loading: () => const Center(child: CircularProgressIndicator(color: SeimaColors.red)),
        error: (error, _) => ListView(
          padding: const EdgeInsets.all(24),
          children: [
            Text('No se pudo abrir', style: archivo(28, 800, width: 118, height: 1.1)),
            const SizedBox(height: 12),
            Text(error.toString(), style: archivo(18, 500)),
            const SizedBox(height: 20),
            SeimaButton(label: 'Reintentar', onPressed: () => ref.invalidate(cotizacionProvider(id))),
          ],
        ),
        data: (dato) => _Cuerpo(dato: dato),
      ),
    );
  }
}

class _Cuerpo extends ConsumerWidget {
  const _Cuerpo({required this.dato});

  final Cotizacion dato;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final numero = celularPeru(dato.whatsapp);
    final quien = [
      if (dato.cliente == 'empresa') 'Empresa${dato.razonSocial.isEmpty ? '' : ': ${dato.razonSocial}'}' else 'Persona',
      if (dato.ruc.isNotEmpty) 'RUC ${dato.ruc}',
    ].join(' · ');
    final datos = <(IconData, String)>[
      (Icons.person_outline, quien),
      if (dato.distrito.isNotEmpty) (Icons.place_outlined, dato.distrito),
      if (dato.plazo.isNotEmpty) (Icons.schedule, plazoLegible(dato.plazo)),
    ];
    final acciones = accionesDeEstado(dato.estado);

    return CustomScrollView(
      slivers: [
        SliverCabeceraSeima(
          alVolver: () => context.pop(),
          alturaExpandida: 190,
          titulo: nombreLegible(dato.nombre),
          subtitulo: [
            if (numero != null) celularVisible(dato.whatsapp),
            if (fechaCorta(dato.creadaEn).isNotEmpty) fechaCorta(dato.creadaEn),
          ].join(' · '),
          hijo: Align(
            alignment: Alignment.centerLeft,
            child: Etiqueta.cotizacion(dato.estado, etiquetaEstado(dato.estado)),
          ),
        ),
        SliverToBoxAdapter(
          child: Padding(
          padding: const EdgeInsets.fromLTRB(16, 20, 16, 40),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              if (numero == null)
                Text('El número no se puede usar.', style: archivo(18, 650, color: SeimaColors.redText))
              else ...[
                SeimaButton(
                  label: 'Escribir por WhatsApp',
                  onPressed: () => _abrir(context, enlaceCliente(numero), 'No se pudo abrir WhatsApp.'),
                ),
                const SizedBox(height: 10),
                SeimaButton(
                  label: 'Llamar',
                  ink: true,
                  onPressed: () => _abrir(context, enlaceLlamada(numero), 'No se pudo llamar.'),
                ),
              ],
              const SizedBox(height: 28),
              const _Titulo('Quién es'),
              _Tarjeta(
                hijos: [
                  for (final (icono, texto) in datos)
                    Padding(
                      padding: const EdgeInsets.symmetric(vertical: 5),
                      child: Row(
                        children: [
                          Icon(icono, size: 22, color: SeimaColors.muted),
                          const SizedBox(width: 12),
                          Expanded(child: Text(texto, style: archivo(18, 600, height: 1.25))),
                        ],
                      ),
                    ),
                ],
              ),
              if (dato.servicios.isNotEmpty) ...[
                const SizedBox(height: 24),
                const _Titulo('Lo que necesita'),
                Wrap(
                  spacing: 8,
                  runSpacing: 8,
                  children: [
                    for (final servicio in dato.servicios) Etiqueta(texto: servicio, fondo: SeimaColors.ink, color: Colors.white),
                  ],
                ),
              ],
              if (dato.respuestas.isNotEmpty) ...[
                const SizedBox(height: 16),
                _Tarjeta(
                  hijos: [
                    for (var i = 0; i < dato.respuestas.length; i++) ...[
                      if (i > 0) const SizedBox(height: 14),
                      Text(dato.respuestas[i].pregunta, style: archivo(15, 650, height: 1.2, color: SeimaColors.muted)),
                      const SizedBox(height: 2),
                      Text(dato.respuestas[i].valor, style: archivo(18, 650, height: 1.25)),
                    ],
                  ],
                ),
              ],
              if (dato.notas.isNotEmpty) ...[
                const SizedBox(height: 24),
                const _Titulo('Notas del cliente'),
                _Tarjeta(hijos: [Text(dato.notas, style: archivo(18, 550, height: 1.35))]),
              ],
              if (dato.respuestas.isEmpty && dato.notas.isEmpty && dato.mensaje.isNotEmpty) ...[
                const SizedBox(height: 24),
                const _Titulo('Mensaje'),
                _Tarjeta(hijos: [Text(dato.mensaje, style: archivo(18, 550, height: 1.35))]),
              ],
              if (dato.fotos.isNotEmpty) ...[
                const SizedBox(height: 24),
                _Titulo('Fotos del cliente (${dato.fotos.length})'),
                SizedBox(
                  height: 140,
                  child: ListView.separated(
                    scrollDirection: Axis.horizontal,
                    clipBehavior: Clip.none,
                    itemCount: dato.fotos.length,
                    separatorBuilder: (_, _) => const SizedBox(width: 10),
                    itemBuilder: (context, index) => ClipRRect(
                      borderRadius: BorderRadius.circular(16),
                      child: SizedBox(width: 140, height: 140, child: FotoLlena(dato.fotos[index].url)),
                    ),
                  ),
                ),
              ],
              const SizedBox(height: 32),
              const _Titulo('¿Cómo va esta cotización?'),
              for (final accion in acciones) ...[
                SeimaButton(
                  label: etiquetaAccion(accion),
                  ink: accion != 'contactada',
                  onPressed: () async {
                    final mensaje = await ref.read(cotizacionProvider(dato.id).notifier).cambiarEstado(accion);
                    if (!context.mounted || mensaje == null) return;
                    ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(mensaje)));
                  },
                ),
                const SizedBox(height: 10),
              ],
            ],
          ),
          ),
        ),
      ],
    );
  }

  Future<void> _abrir(BuildContext context, Uri enlace, String fallo) async {
    final abrio = await launchUrl(enlace, mode: LaunchMode.externalApplication);
    if (!context.mounted || abrio) return;
    ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(fallo)));
  }
}

class _Titulo extends StatelessWidget {
  const _Titulo(this.texto);

  final String texto;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(left: 4, bottom: 10),
      child: Text(texto.toUpperCase(), style: archivo(14, 800, width: 112, height: 1.1, color: SeimaColors.muted).copyWith(letterSpacing: 1.2)),
    );
  }
}

class _Tarjeta extends StatelessWidget {
  const _Tarjeta({required this.hijos});

  final List<Widget> hijos;

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: double.infinity,
      child: DecoratedBox(
        decoration: BoxDecoration(color: SeimaColors.paper2, borderRadius: BorderRadius.circular(20)),
        child: Padding(
          padding: const EdgeInsets.all(18),
          child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: hijos),
        ),
      ),
    );
  }
}
