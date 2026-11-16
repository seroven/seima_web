import { describe, expect, it } from 'vitest';
import { env } from '../../src/config/env';
import { signParams } from '../../src/modules/uploads/cloudinary-signature';
import { API, agent, useDatabase } from './helpers';

useDatabase();

describe('POST /uploads/quote-photos/signature (público)', () => {
  it('entrega la firma para subir fotos directo a Cloudinary, sin exponer el secret', async () => {
    const res = await agent().post(`${API}/uploads/quote-photos/signature`);
    expect(res.status).toBe(200);
    const d = res.body.data;
    expect(d).toMatchObject({ cloudName: env.CLOUDINARY_CLOUD_NAME, apiKey: env.CLOUDINARY_API_KEY, folder: env.CLOUDINARY_QUOTES_FOLDER, maxFiles: 6 });
    expect(d.signature).toBe(signParams({ allowed_formats: d.allowedFormats, folder: d.folder, timestamp: d.timestamp }, env.CLOUDINARY_API_SECRET!));
    expect(JSON.stringify(res.body)).not.toContain(env.CLOUDINARY_API_SECRET!);
  });

  it('sin credenciales de Cloudinary → 503 con el formato de error de la API', async () => {
    const previo = env.CLOUDINARY_API_KEY;
    (env as { CLOUDINARY_API_KEY?: string }).CLOUDINARY_API_KEY = undefined;
    try {
      const res = await agent().post(`${API}/uploads/quote-photos/signature`);
      expect(res.status).toBe(503);
      expect(res.body.error.code).toBe('SERVICE_UNAVAILABLE');
    } finally {
      (env as { CLOUDINARY_API_KEY?: string }).CLOUDINARY_API_KEY = previo;
    }
  });

  it('solo acepta POST', async () => {
    expect((await agent().get(`${API}/uploads/quote-photos/signature`)).status).toBe(404);
  });
});
