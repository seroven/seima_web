// @ts-check
import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import { loadEnv } from 'vite';

// Dirección pública de la web (ej. https://seima-web.onrender.com o el dominio propio). Sin ella, los enlaces absolutos
// (compartir por WhatsApp, canonical, imagen al compartir) salen con la dirección del servidor donde se construyó
// (localhost en tu PC). Se define en el hosting como SITE_URL; en Render, RENDER_EXTERNAL_URL sirve de respaldo.
const env = { ...loadEnv(process.env.NODE_ENV ?? 'production', process.cwd(), ''), ...process.env };
const site = (env.SITE_URL || env.RENDER_EXTERNAL_URL || '').trim().replace(/\/+$/, '') || undefined;

// React solo para islas con interactividad real (el cotizador).
export default defineConfig({
  site,
  integrations: [react()],
});
