import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:url_launcher/url_launcher.dart';

import '../quotes/cotizacion.dart';
import '../quotes/cotizaciones_controller.dart';
import '../theme/seima_colors.dart';
import '../theme/seima_theme.dart';
import '../widgets/foto_llena.dart';
import '../widgets/seima_button.dart';

class CotizacionScreen extends ConsumerWidget {
  const CotizacionScreen({super.key, required this.id});

  final String id;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final cotizacion = ref.watch(cotizacionProvider(id));
    return Scaffold(
      appBar: AppBar(title: const Text('Cotización')),
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
    final lineas = <String>[
      if (dato.cliente == 'empresa') 'Empresa${dato.razonSocial.isEmpty ? '' : ': ${dato.razonSocial}'}',
      if (dato.cliente != 'empresa') 'Persona',
      if (dato.ruc.isNotEmpty) 'RUC ${dato.ruc}',
      if (dato.distrito.isNotEmpty) dato.distrito,
      if (dato.plazo.isNotEmpty) plazoLegible(dato.plazo),
      if (dato.servicios.isNotEmpty) dato.servicios.join(', '),
    ];
    return ListView(
      padding: const EdgeInsets.fromLTRB(24, 8, 24, 32),
      children: [
        Text(dato.nombre, style: archivo(28, 800, width: 118, height: 1.05)),
        const SizedBox(height: 8),
        Text(
          [etiquetaEstado(dato.estado), if (fechaCorta(dato.creadaEn).isNotEmpty) fechaCorta(dato.creadaEn)].join(' · '),
          style: archivo(18, 650, color: dato.estado == 'nueva' ? SeimaColors.redText : SeimaColors.muted),
        ),
        if (numero != null) ...[
          const SizedBox(height: 8),
          Text(celularVisible(dato.whatsapp), style: archivo(20, 700)),
        ],
        const SizedBox(height: 16),
        for (final linea in lineas) Padding(padding: const EdgeInsets.only(bottom: 6), child: Text(linea, style: archivo(18, 550))),
        for (final respuesta in dato.respuestas) ...[
          const SizedBox(height: 10),
          Text(respuesta.pregunta, style: archivo(16, 650, color: SeimaColors.muted)),
          Text(respuesta.valor, style: archivo(18, 600)),
        ],
        if (dato.notas.isNotEmpty) ...[
          const SizedBox(height: 16),
          Text('Notas', style: archivo(16, 650, color: SeimaColors.muted)),
          Text(dato.notas, style: archivo(18, 550, height: 1.3)),
        ],
        if (dato.respuestas.isEmpty && dato.notas.isEmpty && dato.mensaje.isNotEmpty) ...[
          const SizedBox(height: 16),
          Text(dato.mensaje, style: archivo(18, 550, height: 1.3)),
        ],
        if (dato.fotos.isNotEmpty) ...[
          const SizedBox(height: 16),
          SizedBox(
            height: 120,
            child: ListView.separated(
              scrollDirection: Axis.horizontal,
              itemCount: dato.fotos.length,
              separatorBuilder: (_, _) => const SizedBox(width: 10),
              itemBuilder: (context, index) => ClipRRect(
                borderRadius: BorderRadius.circular(12),
                child: SizedBox(width: 120, height: 120, child: FotoLlena(dato.fotos[index].url)),
              ),
            ),
          ),
        ],
        const SizedBox(height: 24),
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
        const SizedBox(height: 20),
        for (final accion in accionesDeEstado(dato.estado)) ...[
          SeimaButton(
            label: etiquetaAccion(accion),
            ink: accion != 'contactada',
            onPressed: () async {
              final mensaje = await ref.read(cotizacionProvider(dato.id).notifier).cambiarEstado(accion);
              if (!context.mounted || mensaje == null) return;
              ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(mensaje, style: archivo(16, 600))));
            },
          ),
          const SizedBox(height: 10),
        ],
      ],
    );
  }

  Future<void> _abrir(BuildContext context, Uri enlace, String fallo) async {
    final abrio = await launchUrl(enlace, mode: LaunchMode.externalApplication);
    if (!context.mounted || abrio) return;
    ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(fallo, style: archivo(16, 600))));
  }
}
