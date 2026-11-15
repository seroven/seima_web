// @ts-check
import { defineConfig } from 'astro/config';
import react from '@astrojs/react';

// React solo para islas con interactividad real (el cotizador).
export default defineConfig({
  integrations: [react()],
});
