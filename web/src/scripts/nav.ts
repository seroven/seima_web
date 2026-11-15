// Navegación: (1) de dónde vengo, para el botón "Volver" de la ficha;
// (2) memoria de scroll propia. El navegador/Astro restauran el scroll ANTES de que GSAP arme las escenas fijas
// (la página aún es más corta) y caen en un punto equivocado; por eso restauramos nosotros cuando todo está listo.
// Con ClientRouter este módulo vive entre navegaciones.

type Loc = { pathname: string; search: string };
const KEY = (u: Loc) => 'seima:scroll:' + u.pathname + u.search;
const read = (u: Loc) => {
  try {
    const s = sessionStorage.getItem(KEY(u));
    return s === null ? null : Number(s);
  } catch {
    return null;
  }
};
const write = (u: Loc, y: number) => {
  try {
    sessionStorage.setItem(KEY(u), String(Math.round(y)));
  } catch {
    /* modo privado */
  }
};

const html = document.documentElement;
let prev: string | null = null;
let restoreY: number | null = null;

if ('scrollRestoration' in history) history.scrollRestoration = 'manual';

// Primera carga directa
try {
  const r = new URL(document.referrer);
  if (r.origin === location.origin) prev = r.pathname + r.search;
} catch {
  /* sin referrer */
}
const navType = (performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming | undefined)?.type;
if (navType === 'reload') restoreY = 0; // recargar = empezar arriba
else if (navType === 'back_forward') restoreY = read(location);
if (restoreY && restoreY > 0) {
  html.classList.add('restoring');
  setTimeout(finishRestore, 3000); // red de seguridad
}

document.addEventListener('astro:before-preparation', (e) => {
  const ev = e as any;
  // OJO: en un "atrás" el navegador ya cambió `location` al destino; la página que dejamos es `ev.from`.
  const from: Loc = ev.from ?? location;
  write(from, scrollY); // posición de la página que dejamos
  const traverse = ev.navigationType === 'traverse';
  prev = traverse ? null : from.pathname + from.search;
  restoreY = traverse && ev.to ? read(ev.to) : null;
});

document.addEventListener('astro:before-swap', (e) => {
  // Oculta la página nueva hasta colocarla en su posición (evita ver un salto)
  if (restoreY && restoreY > 0) (e as any).newDocument.documentElement.classList.add('restoring');
});

/** motion.ts lo llama cuando las escenas ya están armadas. */
export function takeRestoreY(): number | null {
  const y = restoreY;
  restoreY = null;
  return y;
}
export function finishRestore() {
  html.classList.remove('restoring');
}

/* ---------- Botón "Volver" de la ficha ---------- */
function label(from: string | null) {
  if (from === null) return 'Ver todos los proyectos';
  if (from === '/' || from === '') return 'Volver al inicio';
  if (from.startsWith('/proyectos')) return 'Volver al catálogo';
  return 'Volver';
}

function setup() {
  const btn = document.querySelector<HTMLAnchorElement>('[data-back]');
  if (!btn) return;
  const text = btn.querySelector('[data-back-label]');
  if (text) text.textContent = label(prev);
  if (prev !== null) {
    btn.href = prev;
    btn.addEventListener('click', (ev) => {
      // Historial real: reproduce la transición de la foto al revés y deja el scroll donde estaba.
      if (ev.metaKey || ev.ctrlKey || ev.shiftKey || ev.button !== 0) return;
      ev.preventDefault();
      history.back();
    });
  }
}

document.addEventListener('astro:page-load', setup);
