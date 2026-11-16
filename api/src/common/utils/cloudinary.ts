// Las fotos viven en Cloudinary; la base solo guarda el public_id. Aquí se arma la URL pública optimizada.
import { env } from '../../config/env';

const DEMO = 'demo/'; // los datos de prueba (seed:demo) no tienen foto real

export function imageUrl(cloudinaryId: string, opts: { width?: number } = {}): string | null {
  if (!env.CLOUDINARY_CLOUD_NAME || cloudinaryId.startsWith(DEMO)) return null;
  const transform = ['f_auto', 'q_auto', opts.width ? `w_${opts.width}` : null].filter(Boolean).join(',');
  return `https://res.cloudinary.com/${env.CLOUDINARY_CLOUD_NAME}/image/upload/${transform}/${cloudinaryId}`;
}
