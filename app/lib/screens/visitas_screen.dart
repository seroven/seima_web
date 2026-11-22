import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../theme/seima_colors.dart';
import '../theme/seima_theme.dart';
import '../visitas/visitas.dart';
import '../visitas/visitas_controller.dart';
import '../widgets/cabecera_seima.dart';
import '../widgets/capas_marca.dart';
import '../widgets/seima_button.dart';
import '../widgets/toque.dart';

/// La pestaña «Visitas»: cuántas personas entran a la web, de dónde vienen y qué obras miran.
class VisitasScreen extends ConsumerWidget {
  const VisitasScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final periodo = ref.watch(periodoVisitasProvider);
    final resumen = ref.watch(resumenVisitasProvider);

    return Scaffold(
      body: RefreshIndicator(
        color: SeimaColors.red,
        onRefresh: () async => ref.invalidate(resumenVisitasProvider),
        child: CustomScrollView(
          physics: const AlwaysScrollableScrollPhysics(),
          slivers: [
            SliverCabeceraSeima(
              titulo: 'Visitas',
              subtitulo: 'Personas que entran a tu web',
              alturaExpandida: 120,
              // Los periodos se quedan a la vista aunque se baje.
              alturaPie: 76,
              pie: SingleChildScrollView(
                scrollDirection: Axis.horizontal,
                padding: const EdgeInsets.fromLTRB(24, 8, 24, 16),
                child: Row(
                  children: [
                    for (final p in periodosVisitas)
                      Padding(
                        padding: const EdgeInsets.only(right: 8),
                        child: _ChipPeriodo(
                          texto: etiquetaPeriodo(p),
                          activo: p == periodo,
                          onTap: () => ref.read(periodoVisitasProvider.notifier).elegir(p),
                        ),
                      ),
                  ],
                ),
              ),
            ),
            ...resumen.when(
              loading: () => [const SliverFillRemaining(hasScrollBody: false, child: Center(child: CircularProgressIndicator(color: SeimaColors.red)))],
              error: (error, _) => [
                SliverFillRemaining(
                  hasScrollBody: false,
                  child: _Mensaje(
                    titulo: 'No se pudieron cargar las visitas',
                    detalle: error.toString(),
                    accion: 'Reintentar',
                    onPressed: () => ref.invalidate(resumenVisitasProvider),
                  ),
                ),
              ],
              data: (datos) => datos.vacio
                  ? [
                      SliverFillRemaining(
                        hasScrollBody: false,
                        child: _Mensaje(
                          titulo: 'Todavía no hay visitas',
                          detalle: periodo == 'hoy'
                              ? 'Hoy nadie ha entrado a la web. Prueba con «7 días» o «30 días».'
                              : 'Cuando alguien entre a la web, lo vas a ver aquí.',
                        ),
                      ),
                    ]
                  : [SliverPadding(padding: const EdgeInsets.fromLTRB(16, 20, 16, 32), sliver: _Contenido(datos: datos, periodo: periodo))],
            ),
          ],
        ),
      ),
    );
  }
}

class _Contenido extends StatelessWidget {
  const _Contenido({required this.datos, required this.periodo});

  final ResumenVisitas datos;
  final String periodo;

  @override
  Widget build(BuildContext context) {
    final totalDispositivos = datos.movil + datos.escritorio + datos.tablet;
    final obraMax = _maximo(datos.obras.map((o) => o.visitas));
    final origenMax = _maximo(datos.origenes.map((o) => o.visitas));
    final lugarMax = _maximo(datos.lugares.map((o) => o.visitas));
    final paginaMax = _maximo(datos.paginas.map((o) => o.visitas));
    final comparado = comparadoCon(periodo);

    final secciones = <Widget>[
      _Cifras(datos: datos, comparado: comparado),
      if (datos.porDia.length > 1) _SeccionBarras(dias: datos.porDia),
      _Seccion(
        titulo: 'Obras más vistas',
        vacio: 'Todavía nadie abrió una obra en este periodo.',
        filas: [for (final o in datos.obras) _Fila(o.titulo, o.visitas, obraMax, detalle: visitasTexto(o.visitas))],
      ),
      _Seccion(
        titulo: 'De dónde llegan',
        vacio: 'Todavía no sabemos de dónde llegan.',
        filas: [for (final o in datos.origenes) _Fila(o.origen, o.visitas, origenMax, detalle: visitasTexto(o.visitas))],
        nota: '«Directo» es quien escribió la dirección o llegó desde un enlace sin origen, como los de WhatsApp.',
      ),
      _Seccion(
        titulo: 'Ciudades',
        vacio: 'Todavía no hay ciudades.',
        filas: [for (final l in datos.lugares) _Fila(lugarTexto(l), l.visitas, lugarMax, detalle: visitasTexto(l.visitas))],
        nota: 'La ciudad es aproximada: con datos del celular a veces sale otra ciudad.',
      ),
      if (totalDispositivos > 0)
        _Seccion(
          titulo: 'Con qué entran',
          vacio: '',
          filas: [
            if (datos.movil > 0) _Fila('Celular', datos.movil, totalDispositivos, detalle: '${porcentajeDe(datos.movil, totalDispositivos)} %'),
            if (datos.escritorio > 0) _Fila('Computadora', datos.escritorio, totalDispositivos, detalle: '${porcentajeDe(datos.escritorio, totalDispositivos)} %'),
            if (datos.tablet > 0) _Fila('Tableta', datos.tablet, totalDispositivos, detalle: '${porcentajeDe(datos.tablet, totalDispositivos)} %'),
          ],
        ),
      if (datos.paginas.isNotEmpty)
        _Seccion(
          titulo: 'Páginas más vistas',
          vacio: '',
          filas: [for (final p in datos.paginas) _Fila(p.nombre, p.visitas, paginaMax, detalle: visitasTexto(p.visitas))],
        ),
      Text(
        'Las personas se cuentan una vez por cada día que entran. No guardamos nombres, teléfonos ni direcciones IP.',
        style: archivo(14, 500, height: 1.35, color: SeimaColors.muted),
      ),
    ];

    return SliverList.separated(
      itemCount: secciones.length,
      separatorBuilder: (_, _) => const SizedBox(height: 24),
      itemBuilder: (context, i) => Aparece(indice: i, child: secciones[i]),
    );
  }
}

int _maximo(Iterable<int> valores) => valores.fold(0, (m, v) => v > m ? v : m);

// ---------------------------------------------------------------------------------------------
// Cifras grandes
// ---------------------------------------------------------------------------------------------

class _Cifras extends StatelessWidget {
  const _Cifras({required this.datos, required this.comparado});

  final ResumenVisitas datos;
  final String comparado;

  @override
  Widget build(BuildContext context) {
    final tarjetas = [
      _TarjetaCifra(titulo: 'Visitas', cifra: datos.visitas, comparado: comparado),
      _TarjetaCifra(titulo: 'Personas', cifra: datos.visitantes, comparado: comparado),
      _TarjetaCifra(titulo: 'Cotizaciones', cifra: datos.cotizaciones, comparado: comparado, resaltada: true),
      _TarjetaCifra(titulo: 'Tocaron WhatsApp', cifra: datos.whatsapp, comparado: comparado),
      _TarjetaCifra(titulo: 'Compartieron una obra', cifra: datos.compartidos, comparado: comparado),
    ];
    return LayoutBuilder(
      builder: (context, caja) {
        final ancho = (caja.maxWidth - 12) / 2;
        return Wrap(spacing: 12, runSpacing: 12, children: [for (final t in tarjetas) SizedBox(width: ancho, child: t)]);
      },
    );
  }
}

class _TarjetaCifra extends StatelessWidget {
  const _TarjetaCifra({required this.titulo, required this.cifra, required this.comparado, this.resaltada = false});

  final String titulo;
  final Cifra cifra;
  final String comparado;
  final bool resaltada;

  @override
  Widget build(BuildContext context) {
    final v = variacion(cifra);
    final fondo = resaltada ? SeimaColors.ink : SeimaColors.paper2;
    final texto = resaltada ? Colors.white : SeimaColors.ink;
    final suave = resaltada ? SeimaColors.onInkMuted : SeimaColors.muted;
    return Semantics(
      container: true,
      label: '$titulo: ${cifra.actual}${v == null ? '' : ', ${v.texto} que $comparado'}',
      child: ExcludeSemantics(
        child: DecoratedBox(
          decoration: BoxDecoration(color: fondo, borderRadius: BorderRadius.circular(20)),
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(titulo, maxLines: 2, style: archivo(16, 650, height: 1.15, color: suave)),
                const SizedBox(height: 6),
                Text(miles(cifra.actual), style: archivo(40, 850, width: 112, height: 1, color: texto)),
                const SizedBox(height: 8),
                if (v != null) _LineaVariacion(variacion: v, comparado: comparado, sobreOscuro: resaltada) else const SizedBox(height: 18),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class _LineaVariacion extends StatelessWidget {
  const _LineaVariacion({required this.variacion, required this.comparado, required this.sobreOscuro});

  final Variacion variacion;
  final String comparado;
  final bool sobreOscuro;

  @override
  Widget build(BuildContext context) {
    final (icono, color) = switch (variacion.tendencia) {
      Tendencia.sube => (Icons.arrow_upward, sobreOscuro ? Colors.white : SeimaColors.ink),
      Tendencia.baja => (Icons.arrow_downward, sobreOscuro ? const Color(0xFFFF8A97) : SeimaColors.redText),
      Tendencia.igual => (Icons.drag_handle, sobreOscuro ? SeimaColors.onInkMuted : SeimaColors.muted),
      Tendencia.nuevo => (Icons.fiber_new, sobreOscuro ? Colors.white : SeimaColors.ink),
    };
    final texto = switch (variacion.tendencia) {
      Tendencia.nuevo => 'nuevo, antes no había',
      Tendencia.igual => 'igual que $comparado',
      _ => '${variacion.texto} que $comparado',
    };
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Icon(icono, size: 18, color: color),
        const SizedBox(width: 4),
        Expanded(child: Text(texto, style: archivo(14, 650, height: 1.2, color: color))),
      ],
    );
  }
}

// ---------------------------------------------------------------------------------------------
// Barras por día
// ---------------------------------------------------------------------------------------------

class _SeccionBarras extends StatelessWidget {
  const _SeccionBarras({required this.dias});

  final List<VisitasDia> dias;

  @override
  Widget build(BuildContext context) {
    final maximo = _maximo(dias.map((d) => d.visitas));
    final mejor = dias.fold<VisitasDia?>(null, (m, d) => m == null || d.visitas > m.visitas ? d : m);
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text('Visitas por día', style: archivo(22, 800, width: 112, height: 1.1)),
        const SizedBox(height: 12),
        Semantics(
          label: 'Gráfico de visitas por día. El día con más visitas fue ${diaCorto(mejor?.fecha ?? '')}, con ${mejor?.visitas ?? 0}.',
          child: ExcludeSemantics(
            child: DecoratedBox(
              decoration: BoxDecoration(color: SeimaColors.paper2, borderRadius: BorderRadius.circular(20)),
              child: Padding(
                padding: const EdgeInsets.fromLTRB(16, 16, 16, 12),
                child: Column(
                  children: [
                    SizedBox(
                      height: 110,
                      child: Row(
                        crossAxisAlignment: CrossAxisAlignment.end,
                        children: [
                          for (final d in dias)
                            Expanded(
                              child: Padding(
                                padding: EdgeInsets.symmetric(horizontal: dias.length > 14 ? 1 : 3),
                                child: FractionallySizedBox(
                                  heightFactor: maximo == 0 ? 0.03 : (d.visitas / maximo).clamp(0.03, 1.0),
                                  alignment: Alignment.bottomCenter,
                                  child: DecoratedBox(
                                    decoration: BoxDecoration(
                                      color: d.visitas == maximo && maximo > 0 ? SeimaColors.red : SeimaColors.ink,
                                      borderRadius: BorderRadius.circular(3),
                                    ),
                                  ),
                                ),
                              ),
                            ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 8),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text(diaCorto(dias.first.fecha), style: archivo(14, 600, color: SeimaColors.muted)),
                        if (mejor != null && mejor.visitas > 0) Text('Más visitas: ${diaCorto(mejor.fecha)} (${mejor.visitas})', style: archivo(14, 700, color: SeimaColors.redText)),
                        Text(diaCorto(dias.last.fecha), style: archivo(14, 600, color: SeimaColors.muted)),
                      ],
                    ),
                  ],
                ),
              ),
            ),
          ),
        ),
      ],
    );
  }
}

// ---------------------------------------------------------------------------------------------
// Listas con barra
// ---------------------------------------------------------------------------------------------

class _Fila {
  const _Fila(this.texto, this.valor, this.maximo, {required this.detalle});

  final String texto;
  final int valor;
  final int maximo;
  final String detalle;
}

class _Seccion extends StatelessWidget {
  const _Seccion({required this.titulo, required this.vacio, required this.filas, this.nota});

  final String titulo;
  final String vacio;
  final List<_Fila> filas;
  final String? nota;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(titulo, style: archivo(22, 800, width: 112, height: 1.1)),
        const SizedBox(height: 12),
        DecoratedBox(
          decoration: BoxDecoration(color: SeimaColors.paper2, borderRadius: BorderRadius.circular(20)),
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: filas.isEmpty
                ? Text(vacio, style: archivo(16, 500, height: 1.35, color: SeimaColors.muted))
                : Column(
                    children: [
                      for (var i = 0; i < filas.length; i++) ...[
                        if (i > 0) const SizedBox(height: 14),
                        _FilaBarra(fila: filas[i]),
                      ],
                    ],
                  ),
          ),
        ),
        if (nota != null && filas.isNotEmpty) ...[
          const SizedBox(height: 8),
          Padding(padding: const EdgeInsets.symmetric(horizontal: 4), child: Text(nota!, style: archivo(14, 500, height: 1.35, color: SeimaColors.muted))),
        ],
      ],
    );
  }
}

class _FilaBarra extends StatelessWidget {
  const _FilaBarra({required this.fila});

  final _Fila fila;

  @override
  Widget build(BuildContext context) {
    final fraccion = fila.maximo <= 0 ? 0.0 : (fila.valor / fila.maximo).clamp(0.0, 1.0);
    return Semantics(
      container: true,
      label: '${fila.texto}: ${fila.detalle}',
      child: ExcludeSemantics(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Expanded(child: Text(fila.texto, maxLines: 2, overflow: TextOverflow.ellipsis, style: archivo(17, 700, height: 1.2))),
                const SizedBox(width: 12),
                Text(fila.detalle, style: archivo(16, 600, height: 1.2, color: SeimaColors.muted)),
              ],
            ),
            const SizedBox(height: 6),
            ClipRRect(
              borderRadius: BorderRadius.circular(4),
              child: Stack(
                children: [
                  Container(height: 8, color: SeimaColors.tint2),
                  FractionallySizedBox(widthFactor: fraccion == 0 ? 0.02 : fraccion, child: Container(height: 8, color: SeimaColors.red)),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

// ---------------------------------------------------------------------------------------------
// Piezas sueltas
// ---------------------------------------------------------------------------------------------

class _ChipPeriodo extends StatelessWidget {
  const _ChipPeriodo({required this.texto, required this.activo, required this.onTap});

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
        color: activo ? Colors.white : SeimaColors.ink3,
        borderRadius: BorderRadius.circular(999),
        child: InkWell(
          borderRadius: BorderRadius.circular(999),
          onTap: onTap,
          child: ConstrainedBox(
            constraints: const BoxConstraints(minHeight: 48, minWidth: 72),
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 20),
              child: Center(child: Text(texto, style: archivo(16, 750, height: 1.1, color: activo ? SeimaColors.ink : Colors.white))),
            ),
          ),
        ),
      ),
    );
  }
}

class _Mensaje extends StatelessWidget {
  const _Mensaje({required this.titulo, required this.detalle, this.accion, this.onPressed});

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
