import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import type { AppError } from '../../src/common/errors/app-error';
import { env } from '../../src/config/env';
import { signParams } from '../../src/modules/uploads/cloudinary-signature';
import { FORMATOS_FOTO, UploadsService } from '../../src/modules/uploads/uploads.service';
import { thrown } from './fakes';

describe('signParams (firma de Cloudinary)', () => {
  it('ordena los parámetros alfabéticamente y añade el secret al final antes de aplicar SHA-1', () => {
    const firma = signParams({ timestamp: 1700000000, folder: 'a/b', allowed_formats: 'jpg' }, 'secreto');
    const esperado = createHash('sha1').update('allowed_formats=jpg&folder=a/b&timestamp=1700000000secreto').digest('hex');
    expect(firma).toBe(esperado);
  });

  it('coincide con el ejemplo oficial de la documentación de Cloudinary', () => {
    const firma = signParams({ eager: 'w_400,h_300,c_pad|w_260,h_200,c_crop', public_id: 'sample_image', timestamp: 1315060510 }, 'abcd');
    expect(firma).toBe('bfd09f95f331f558cbd1320e67aa8d488770583e');
  });

  it('cualquier cambio de parámetro o de secret cambia la firma', () => {
    const base = signParams({ folder: 'a', timestamp: 1 }, 's');
    expect(signParams({ folder: 'b', timestamp: 1 }, 's')).not.toBe(base);
    expect(signParams({ folder: 'a', timestamp: 2 }, 's')).not.toBe(base);
    expect(signParams({ folder: 'a', timestamp: 1 }, 'otro')).not.toBe(base);
  });
});

describe('UploadsService.signQuotePhotos', () => {
  const svc = new UploadsService();

  it('entrega lo necesario para subir directo a Cloudinary, con firma válida', () => {
    const ahora = Date.UTC(2026, 0, 1, 12, 0, 0);
    const r = svc.signQuotePhotos(ahora);
    expect(r).toMatchObject({
      uploadUrl: 'https://api.cloudinary.com/v1_1/demo-cloud/image/upload',
      cloudName: 'demo-cloud',
      apiKey: '123456789012345',
      timestamp: Math.floor(ahora / 1000),
      folder: 'seima/quotes',
      allowedFormats: FORMATOS_FOTO,
      maxFiles: 6,
    });
    expect(r.signature).toBe(signParams({ allowed_formats: FORMATOS_FOTO, folder: 'seima/quotes', timestamp: r.timestamp }, env.CLOUDINARY_API_SECRET!));
  });

  it('NUNCA expone el API secret', () => {
    expect(JSON.stringify(svc.signQuotePhotos())).not.toContain(env.CLOUDINARY_API_SECRET!);
  });

  it('sin credenciales de Cloudinary → 503 (no revienta ni firma con undefined)', () => {
    const previo = env.CLOUDINARY_API_SECRET;
    (env as { CLOUDINARY_API_SECRET?: string }).CLOUDINARY_API_SECRET = undefined;
    try {
      const e = thrown(() => svc.signQuotePhotos()) as AppError;
      expect(e.status).toBe(503);
      expect(e.code).toBe('SERVICE_UNAVAILABLE');
    } finally {
      (env as { CLOUDINARY_API_SECRET?: string }).CLOUDINARY_API_SECRET = previo;
    }
  });
});
