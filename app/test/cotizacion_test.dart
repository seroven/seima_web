import 'package:flutter_test/flutter_test.dart';
import 'package:seima/quotes/cotizacion.dart';

void main() {
  test('lee la lista y el detalle de una cotización', () {
    final lista = cotizacionesDesde({
      'data': [
        {
          'id': 'a1',
          'estado': 'nueva',
          'cliente': 'persona',
          'nombre': 'Ana',
          'distrito': 'Surco',
          'servicios': [
            {'slug': 'drywall', 'nombre': 'Drywall'},
          ],
          'creadaEn': '2026-11-21T15:00:00.000Z',
        },
        {'id': '', 'nombre': 'se descarta'},
      ],
    });
    expect(lista, hasLength(1));
    expect(lista.first.servicios, ['Drywall']);
    expect(contarNuevas(lista), 1);

    final detalle = cotizacionDesde({
      'data': {
        'id': 'a1',
        'estado': 'nueva',
        'nombre': 'Ana',
        'whatsapp': '987654321',
        'plazo': 'asap',
        'respuestas': [
          {'preguntaEtiqueta': 'Medidas', 'opcionEtiqueta': 'm²', 'valor': '12'},
        ],
        'fotos': [
          {'id': 'f1', 'url': 'https://ejemplo.test/foto.jpg'},
          {'id': 'f2', 'url': ''},
        ],
      },
    });
    expect(detalle.respuestas.single.valor, '12');
    expect(detalle.fotos, hasLength(1));
    expect(detalle.conEstado('contactada').estado, 'contactada');
  });

  test('prepara el celular de Perú para WhatsApp y para llamar', () {
    expect(celularPeru('987 654 321'), '51987654321');
    expect(celularPeru('+51 987 654 321'), '51987654321');
    expect(celularPeru('12345'), isNull);
    expect(celularVisible('987654321'), '987 654 321');
    expect(enlaceCliente('51987654321').path, '/51987654321');
    expect(enlaceLlamada('51987654321').toString(), 'tel:+51987654321');
  });

  test('dice qué botones ofrece cada estado', () {
    expect(etiquetaEstado('nueva'), 'Nueva');
    expect(accionesDeEstado('nueva'), ['contactada', 'cerrada', 'descartada']);
    expect(etiquetaAccion('descartada'), 'Descartar');
    expect(accionesDeEstado('cerrada'), ['contactada']);
    expect(plazoLegible('1mes'), 'En 1 mes');
    expect(insigniaNuevas(12), '9+');
    expect(fechaCorta('2026-11-21T15:00:00.000Z'), contains('2026'));
  });
}
