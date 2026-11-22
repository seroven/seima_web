// Mediciones de visitas: avisa a nuestra API (POST /analytics/hit) en cada página vista y en los toques de WhatsApp.
// SIN cookies, SIN localStorage y sin identificar a nadie (el código anónimo lo fabrica la API). Plan: docs/plan-analiticas.md.
//
// No mide: en local (localhost) salvo PUBLIC_ANALYTICS_LOCAL=1 para probar, ni a quien tiene activado «No rastrear».
// Nunca debe estorbar a quien navega: todo es en segundo plano y los errores se ignoran.

const api = (import.meta.env.PUBLIC_API_URL as string | undefined)?.replace(/\/$/, '') || null;
const LOCAL = new Set(['localhost', '127.0.0.1', '[::1]']);

const medible = () => {
  if (!api) return false;
  if (navigator.doNotTrack === '1') return false;
  if (LOCAL.has(location.hostname) && import.meta.env.PUBLIC_ANALYTICS_LOCAL !== '1') return false;
  return true;
};

type Tipo = 'pagina' | 'whatsapp' | 'compartir';

function enviar(cuerpo: { tipo: Tipo; ruta: string; referrer?: string; utm?: string }) {
  try {
    void fetch(`${api}/analytics/hit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(cuerpo),
      keepalive: true, // que salga aunque la persona cambie de página enseguida
      credentials: 'omit',
    }).catch(() => {});
  } catch {
    /* sin medición no pasa nada */
  }
}

let primera = true;
let ultima = { ruta: '', en: 0 };

/** Una página vista. El origen (de dónde llegó) solo cuenta en la primera de la visita y si viene de OTRO sitio. */
function paginaVista() {
  if (!medible()) return;
  const ruta = location.pathname;
  const ahora = Date.now();
  if (ruta === ultima.ruta && ahora - ultima.en < 1500) return; // misma página disparada dos veces seguidas
  ultima = { ruta, en: ahora };

  const cuerpo: { tipo: Tipo; ruta: string; referrer?: string; utm?: string } = { tipo: 'pagina', ruta };
  if (primera) {
    const utm = new URLSearchParams(location.search).get('utm_source');
    if (utm) cuerpo.utm = utm.slice(0, 60);
    try {
      if (document.referrer && new URL(document.referrer).host !== location.host) cuerpo.referrer = document.referrer.slice(0, 300);
    } catch {
      /* referrer ilegible: se cuenta como directo */
    }
  }
  primera = false;
  enviar(cuerpo);
}

// Toques que importan: cualquier enlace con data-evento="whatsapp" | "compartir"
document.addEventListener('click', (e) => {
  if (!medible()) return;
  const el = (e.target as Element | null)?.closest?.('[data-evento]');
  const tipo = el?.getAttribute('data-evento');
  if (tipo === 'whatsapp' || tipo === 'compartir') enviar({ tipo, ruta: location.pathname });
});

// Con las transiciones de Astro, `astro:page-load` salta en la carga inicial y en cada navegación.
document.addEventListener('astro:page-load', paginaVista);
