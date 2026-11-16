// Firma de subidas directas a Cloudinary (signed upload). Sin SDK: la firma es SHA-1 de los parámetros
// ordenados alfabéticamente (clave=valor unidos con &) seguidos del API secret. El secret nunca sale del servidor.
import { createHash } from 'node:crypto';

export type SignableParams = Record<string, string | number>;

export function signParams(params: SignableParams, apiSecret: string): string {
  const base = Object.keys(params)
    .sort()
    .map((k) => `${k}=${params[k]}`)
    .join('&');
  return createHash('sha1')
    .update(base + apiSecret)
    .digest('hex');
}
