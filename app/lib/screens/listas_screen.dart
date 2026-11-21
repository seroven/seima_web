import 'package:flutter/material.dart';

import '../theme/seima_colors.dart';
import '../theme/seima_theme.dart';

class CotizacionesScreen extends StatelessWidget {
  const CotizacionesScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Cotizaciones')),
      body: const _Vacio(
        titulo: 'Cuando alguien cotice, aparece aquí',
        detalle: 'También te llega un aviso al celular, si las notificaciones están activas.',
      ),
    );
  }
}

class _Vacio extends StatelessWidget {
  const _Vacio({required this.titulo, required this.detalle});

  final String titulo;
  final String detalle;

  @override
  Widget build(BuildContext context) {
    return ListView(
      padding: const EdgeInsets.all(24),
      children: [
        Text(titulo, style: archivo(28, 800, width: 118, height: 1.1)),
        const SizedBox(height: 12),
        Text(detalle, style: archivo(18, 500, color: SeimaColors.muted)),
      ],
    );
  }
}
