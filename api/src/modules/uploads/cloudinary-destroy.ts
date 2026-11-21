// Borra un archivo de Cloudinary. Los de prueba (`demo/…`) no existen allá y se saltan.
// En las pruebas automáticas tampoco se llama a Cloudinary: el secreto es falso.
import { serviceUnavailable } from '../../common/errors/app-error';
import { logger } from '../../common/logger';
import { env } from '../../config/env';
import { signParams } from './cloudinary-signature';

export async function borrarDeCloudinary(publicId: string, tipo: 'foto' | 'video'): Promise<void> {
  if (publicId.startsWith('demo/')) return;
  const { CLOUDINARY_CLOUD_NAME: cloud, CLOUDINARY_API_KEY: apiKey, CLOUDINARY_API_SECRET: secret } = env;
  if (!cloud || !apiKey || !secret) throw serviceUnavailable('No se puede borrar el archivo por ahora');
  if (env.isTest) return;

  const timestamp = Math.floor(Date.now() / 1000);
  const signature = signParams({ public_id: publicId, timestamp }, secret);
  const body = new URLSearchParams({ public_id: publicId, api_key: apiKey, timestamp: String(timestamp), signature });
  const recurso = tipo === 'video' ? 'video' : 'image';
  const res = await fetch(`https://api.cloudinary.com/v1_1/${cloud}/${recurso}/destroy`, { method: 'POST', body });
  if (!res.ok) {
    logger.warn({ status: res.status, publicId }, 'Cloudinary no pudo borrar el archivo');
    throw serviceUnavailable('No se pudo borrar el archivo. Inténtalo de nuevo.');
  }
}
