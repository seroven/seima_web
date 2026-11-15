// En celular no hay hover: mantener presionada una tarjeta muestra el "antes" mientras se sostiene.
const HOLD_MS = 320;
let timer: ReturnType<typeof setTimeout> | undefined;
let held: Element | null = null;
let blockClickUntil = 0;

const card = (t: EventTarget | null) => (t as Element | null)?.closest?.('.pcard') ?? null;

document.addEventListener('pointerdown', (e) => {
  if (e.pointerType === 'mouse') return;
  const c = card(e.target);
  if (!c) return;
  clearTimeout(timer);
  timer = setTimeout(() => {
    c.classList.add('is-peek');
    held = c;
  }, HOLD_MS);
});

const end = () => {
  clearTimeout(timer);
  if (held) {
    held.classList.remove('is-peek');
    held = null;
    blockClickUntil = performance.now() + 450; // el "click" que sigue al soltar no debe abrir la ficha
  }
};
document.addEventListener('pointerup', end);
document.addEventListener('pointercancel', end);

document.addEventListener(
  'click',
  (e) => {
    if (performance.now() < blockClickUntil && card(e.target)) {
      e.preventDefault();
      e.stopPropagation();
    }
  },
  true,
);
document.addEventListener('contextmenu', (e) => {
  if (card(e.target) && (e as PointerEvent).pointerType !== 'mouse') e.preventDefault();
});
