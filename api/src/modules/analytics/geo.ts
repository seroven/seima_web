import geoip from 'geoip-lite';

export interface Ubicacion {
  pais: string | null;
  ciudad: string | null;
}

/**
 * País y ciudad aproximados de una IP, con una base de datos que viaja DENTRO de la API (`geoip-lite`):
 * la IP no sale a ningún servicio externo. Datos MaxMind GeoLite (licencia CC BY-SA 4.0).
 * Una IP local o desconocida da todo en null.
 */
export function ubicarIp(ip: string): Ubicacion {
  const dato = geoip.lookup(ip.replace(/^::ffff:/, ''));
  return { pais: dato?.country || null, ciudad: dato?.city || null };
}
