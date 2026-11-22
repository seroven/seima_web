import 'package:flutter/material.dart';

import '../theme/seima_colors.dart';
import '../theme/seima_theme.dart';
import 'toque.dart';

/// Bloque de un formulario: título grande, una línea de ayuda y el contenido.
class SeccionForm extends StatelessWidget {
  const SeccionForm({super.key, required this.titulo, this.ayuda, required this.hijo});

  final String titulo;
  final String? ayuda;
  final Widget hijo;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 32),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(titulo, style: archivo(22, 850, width: 118, height: 1.12)),
          if (ayuda != null) ...[
            const SizedBox(height: 4),
            Text(ayuda!, style: archivo(16, 500, height: 1.25, color: SeimaColors.muted)),
          ],
          const SizedBox(height: 14),
          hijo,
        ],
      ),
    );
  }
}

/// Opción grande con ícono (para pocas opciones: tipo de trabajo, persona o empresa).
class TarjetaEleccion extends StatelessWidget {
  const TarjetaEleccion({super.key, required this.texto, required this.activo, required this.onTap, this.icono});

  final String texto;
  final bool activo;
  final VoidCallback onTap;
  final IconData? icono;

  @override
  Widget build(BuildContext context) {
    return Semantics(
      button: true,
      selected: activo,
      label: texto,
      child: TarjetaToque(
        onTap: onTap,
        child: AnimatedContainer(
          duration: const Duration(milliseconds: 180),
          constraints: const BoxConstraints(minHeight: 104),
          padding: const EdgeInsets.all(14),
          decoration: BoxDecoration(color: activo ? SeimaColors.ink : SeimaColors.paper2, borderRadius: BorderRadius.circular(18)),
          // Ícono arriba y texto abajo con todo el ancho: así no se parten las palabras largas.
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            mainAxisSize: MainAxisSize.min,
            children: [
              Row(
                children: [
                  if (icono != null) Icon(icono, size: 30, color: activo ? Colors.white : SeimaColors.ink),
                  const Spacer(),
                  AnimatedOpacity(
                    duration: const Duration(milliseconds: 180),
                    opacity: activo ? 1 : 0,
                    child: const DecoratedBox(
                      decoration: BoxDecoration(color: SeimaColors.red, shape: BoxShape.circle),
                      child: Padding(padding: EdgeInsets.all(3), child: Icon(Icons.check, size: 18, color: Colors.white)),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 10),
              Text(texto, style: archivo(17, 750, height: 1.15, color: activo ? Colors.white : SeimaColors.ink)),
            ],
          ),
        ),
      ),
    );
  }
}

/// Opción corta que se puede marcar varias veces (servicios).
class ChipEleccion extends StatelessWidget {
  const ChipEleccion({super.key, required this.texto, required this.activo, required this.onTap});

  final String texto;
  final bool activo;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Semantics(
      button: true,
      selected: activo,
      label: texto,
      child: Material(
        color: activo ? SeimaColors.ink : SeimaColors.paper2,
        borderRadius: BorderRadius.circular(999),
        child: InkWell(
          borderRadius: BorderRadius.circular(999),
          onTap: onTap,
          child: ConstrainedBox(
            constraints: const BoxConstraints(minHeight: 52),
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 12),
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  if (activo) ...[const Icon(Icons.check, size: 20, color: Colors.white), const SizedBox(width: 8)],
                  Text(texto, style: archivo(17, 650, height: 1.1, color: activo ? Colors.white : SeimaColors.ink)),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}

/// Ícono de cada tipo de trabajo (por el identificador que manda la API).
IconData iconoDeCategoria(String slug) => switch (slug) {
  'cocinas' => Icons.kitchen,
  'banos' => Icons.bathtub_outlined,
  'departamentos' => Icons.apartment,
  'melamina' => Icons.weekend_outlined,
  'techos' => Icons.roofing,
  'cocheras-fachadas' => Icons.garage_outlined,
  'remodelaciones' => Icons.construction,
  'locales' => Icons.storefront,
  _ => Icons.home_work_outlined,
};
