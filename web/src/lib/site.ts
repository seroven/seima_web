/** Dirección pública de la web (definida con SITE_URL al construir) o, si falta, la del servidor actual. */
export function origenSitio(astro: { site?: URL; url: URL }): URL {
  return new URL(astro.site ?? astro.url.origin);
}

/** Enlace absoluto a una ruta de la web: lo que se comparte por WhatsApp y lo que ven los buscadores. */
export function enlaceAbsoluto(astro: { site?: URL; url: URL }, ruta: string = astro.url.pathname): string {
  return new URL(ruta, origenSitio(astro)).href;
}

/** Redes de SEIMA. TikTok es el canal de hoy; Facebook sale de PUBLIC_FACEBOOK_URL (si falta, se muestra como pendiente). */
export const TIKTOK_URL = 'https://www.tiktok.com/@seima.drywall';

export function facebookUrl(): string | null {
  const v = (import.meta.env.PUBLIC_FACEBOOK_URL as string | undefined)?.trim();
  return v && /^https?:\/\//.test(v) ? v : null;
}
