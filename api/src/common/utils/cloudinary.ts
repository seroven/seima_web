// Las fotos viven en Cloudinary; la base solo guarda el public_id. Aquí se arma la URL pública optimizada.
import { env } from '../../config/env';

const DEMO = 'demo/'; // los datos de prueba (seed:demo) no tienen foto real

export function imageUrl(cloudinaryId: string, opts: { width?: number } = {}): string | null {
  if (!env.CLOUDINARY_CLOUD_NAME || cloudinaryId.startsWith(DEMO)) return null;
  const transform = ['f_auto', 'q_auto', opts.width ? `w_${opts.width}` : null].filter(Boolean).join(',');
  return `https://res.cloudinary.com/${env.CLOUDINARY_CLOUD_NAME}/image/upload/${transform}/${cloudinaryId}`;
}

/** URL pública de una foto o un video de proyecto. */
export function mediaUrl(cloudinaryId: string, tipo: 'foto' | 'video'): string | null {
  if (!env.CLOUDINARY_CLOUD_NAME || cloudinaryId.startsWith(DEMO)) return null;
  const recurso = tipo === 'video' ? 'video' : 'image';
  return `https://res.cloudinary.com/${env.CLOUDINARY_CLOUD_NAME}/${recurso}/upload/f_auto,q_auto/${cloudinaryId}`;
}

/** Primer fotograma del video, para el póster. */
export function videoPoster(cloudinaryId: string): string | null {
  if (!env.CLOUDINARY_CLOUD_NAME || cloudinaryId.startsWith(DEMO)) return null;
  return `https://res.cloudinary.com/${env.CLOUDINARY_CLOUD_NAME}/video/upload/f_auto,q_auto,so_0/${cloudinaryId}.jpg`;
}
