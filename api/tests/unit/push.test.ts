import { describe, expect, it } from 'vitest';
import { canalAvisos, enviarAvisoCotizacion, mensajeDeAviso, textoAviso } from '../../src/modules/notifications/push';

describe('aviso de cotización', () => {
  it('el texto no lleva teléfono ni nombre', () => {
    expect(textoAviso({ id: '1', servicio: 'Cocina', distrito: 'Miraflores' })).toBe('Nueva cotización: Cocina, Miraflores');
    expect(textoAviso({ id: '1', servicio: 'Cocina', distrito: '' })).toBe('Nueva cotización: Cocina');
  });

  it('el aviso de Android usa el canal de alta importancia', () => {
    const mensaje = mensajeDeAviso({ id: 'q1', servicio: 'Cocina', distrito: 'Miraflores' }, ['token']);
    expect(mensaje.android.notification.channelId).toBe(canalAvisos);
    expect(mensaje.android.priority).toBe('high');
    expect(mensaje.data.quoteId).toBe('q1');
  });

  it('sin celulares registrados no intenta enviar', async () => {
    await expect(enviarAvisoCotizacion({ id: '1', servicio: 'Cocina', distrito: 'Miraflores' }, [])).resolves.toBeUndefined();
  });

  it('sin credenciales de Firebase no rompe el envío de la cotización', async () => {
    await expect(enviarAvisoCotizacion({ id: '1', servicio: 'Cocina', distrito: 'Miraflores' }, ['token-falso'])).resolves.toBeUndefined();
  });
});
