// Coreografía global: GSAP + ScrollTrigger + Lenis.
// - Se carga en diferido (import dinámico) y se inicializa/limpia por navegación (ClientRouter).
// - Con "reducir movimiento" no se anima nada y el contenido queda visible.
// - Solo se animan transform, opacity y clip-path.
// - ORDEN: primero los pines (en el orden del documento) y después todo lo demás; si no, ScrollTrigger
//   calcula las posiciones sin contar el espacio de los pines y las animaciones se disparan antes de tiempo.

import { takeRestoreY, finishRestore } from "./nav";

type Cleanup = () => void;

let cleanups: Cleanup[] = [];
let token = 0;
let lenisRef: any = null;

const prefersReduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
const $ = <T extends Element = HTMLElement>(sel: string, root: ParentNode = document) => root.querySelector<T>(sel);
const $$ = <T extends Element = HTMLElement>(sel: string, root: ParentNode = document) => [...root.querySelectorAll<T>(sel)];

async function init() {
  const mine = ++token;
  const root = document.documentElement;

  if (prefersReduced()) {
    root.classList.remove('motion');
    const y = takeRestoreY();
    if (y !== null) window.scrollTo(0, y);
    finishRestore();
    return;
  }
  root.classList.add('motion');

  try {
    const [{ gsap }, { ScrollTrigger }, { default: Lenis }] = await Promise.all([
      import('gsap'),
      import('gsap/ScrollTrigger'),
      import('lenis'),
    ]);
    if (mine !== token) return; // el usuario ya navegó a otra página

    gsap.registerPlugin(ScrollTrigger);

    const lenis = new Lenis({ lerp: 0.1 });
    lenisRef = lenis;
    lenis.on('scroll', ScrollTrigger.update);
    const tick = (time: number) => lenis.raf(time * 1000);
    gsap.ticker.add(tick);
    gsap.ticker.lagSmoothing(0);

    const ctx = gsap.context(() => {
      // 1) Pines, en orden de aparición
      scenes(gsap);
      gallery(gsap);
      // 2) Resto
      story(gsap, ScrollTrigger);
      heroIn(gsap);
      heroIntro(gsap);
      plan(gsap);
      notFound(gsap);
      magnets(gsap);
      cursorFx(gsap);
      proceso(gsap, ScrollTrigger);
      compare(gsap);
      words(gsap);
      reveals(gsap);
      curtains(gsap);
      counters(gsap);
    });

    cleanups.push(() => {
      ctx.revert();
      gsap.ticker.remove(tick);
      lenis.destroy();
      lenisRef = null;
    });

    ScrollTrigger.refresh();
    // Restaurar el scroll ahora que las escenas fijas ya existen (volver desde una ficha / recargar)
    const y = takeRestoreY();
    if (y !== null) {
      lenis.resize(); // el límite de Lenis se calculó antes de que existieran los espacios de los pines
      window.scrollTo(0, y);
      lenis.scrollTo(y, { immediate: true, force: true });
      ScrollTrigger.update();
      ScrollTrigger.getAll().forEach((st: any) => {
        try { st.getTween?.()?.progress(1); } catch { /* sin scrub */ }
      });
    }
    finishRestore();
  } catch (err) {
    // Si falla la carga de las librerías, que el contenido se vea igual.
    console.warn('[motion] animaciones desactivadas', err);
    root.classList.remove('motion');
    const y = takeRestoreY();
    if (y !== null) window.scrollTo(0, y);
    finishRestore();
  }
}

function cleanup() {
  token++;
  cleanups.forEach((fn) => fn());
  cleanups = [];
}

/* =====================================================================
   ESCENAS: portada → zoom a la cocina → la pared se arma por oficios
   ===================================================================== */

// Pasos de la pared: qué capa entra con cada servicio.
function wallSteps(gsap: any, tl: any, t0: number) {
  const svcs = $$('[data-svc]');
  const ticks = $$('[data-rail] i');
  const w = (name: string) => $$(`[data-w="${name}"]`);
  const studs = $$('[data-w="studs"] rect');
  const STEP = 1.3;

  tl.fromTo(studs, { scaleY: 0, transformOrigin: '50% 100%' }, { scaleY: 1, duration: 0.7, stagger: 0.05, ease: 'power3.out' }, t0 + 0.15);
  tl.fromTo(w('boards'), { clipPath: 'inset(0% 100% 0% 0%)' }, { clipPath: 'inset(0% 0% 0% 0%)', duration: 0.7, ease: 'power2.inOut' }, t0 + 0.7);
  tl.fromTo(w('tile'), { clipPath: 'inset(0% 100% 0% 0%)' }, { clipPath: 'inset(0% 0% 0% 0%)', duration: 0.9, ease: 'power2.inOut' }, t0 + STEP + 0.1);
  tl.fromTo(w('power'), { clipPath: 'inset(0% 100% 0% 0%)' }, { clipPath: 'inset(0% 0% 0% 0%)', duration: 0.8, ease: 'none' }, t0 + STEP * 2 + 0.1);
  tl.fromTo(w('led'), { opacity: 0 }, { opacity: 1, duration: 0.4 }, t0 + STEP * 2 + 0.75);
  tl.fromTo(w('cabinets'), { clipPath: 'inset(100% 0% 0% 0%)', y: 24 }, { clipPath: 'inset(0% 0% 0% 0%)', y: 0, duration: 0.9, ease: 'power3.out' }, t0 + STEP * 3 + 0.1);
  tl.fromTo(w('paint'), { clipPath: 'inset(0% 100% 0% 0%)' }, { clipPath: 'inset(0% 0% 0% 0%)', duration: 1, ease: 'none' }, t0 + STEP * 4 + 0.1);
  tl.fromTo(w('roller'), { x: 0, opacity: 1 }, { x: 640, duration: 1, ease: 'none' }, t0 + STEP * 4 + 0.1);
  tl.to(w('roller'), { opacity: 0, duration: 0.15 }, t0 + STEP * 4 + 0.95);

  svcs.forEach((svc, i) => {
    const t = t0 + STEP * i;
    tl.fromTo(svc, { autoAlpha: 0, y: 50 }, { autoAlpha: 1, y: 0, duration: 0.45, ease: 'power2.out' }, t);
    if (i < svcs.length - 1) tl.to(svc, { autoAlpha: 0, y: -50, duration: 0.35, ease: 'power2.in' }, t + STEP - 0.4);
    tl.fromTo(ticks[i], { scaleX: 0 }, { scaleX: 1, duration: STEP * 0.9, ease: 'none' }, t);
  });

  return t0 + STEP * svcs.length; // fin del último paso
}

function scenes(gsap: any) {
  const root = $('[data-scenes]');
  if (!root) return;
  const hero = $('.scene--hero', root)!;
  const layers = $('.scene--layers', root)!;
  const mm = gsap.matchMedia();

  // Escritorio: un solo escenario; la casa hace zoom a la cocina y se vuelve la pared.
  mm.add('(min-width: 900px) and (min-height: 560px)', () => {
    root.classList.add('is-master');
    layers.classList.add('is-scrub');

    const house = $('[data-house]', hero)!;
    const spots = $('.house__spots', hero);
    const copy = $('[data-hero-copy]', hero)!;
    const kx = 295 / 600;
    const ky = 310 / 440; // centro de la cocina dentro del dibujo
    const target = () => {
      const h = house.getBoundingClientRect();
      const s = root.getBoundingClientRect();
      return { dx: s.left + s.width / 2 - (h.left + h.width * kx), dy: s.top + s.height / 2 - (h.top + h.height * ky) };
    };

    gsap.set(layers, { autoAlpha: 0 });
    const tl = gsap.timeline({
      defaults: { ease: 'none' },
      scrollTrigger: {
        trigger: root,
        start: 'top top+=60',
        end: () => '+=' + window.innerHeight * 4.6,
        pin: true,
        scrub: 0.6,
        anticipatePin: 1,
        invalidateOnRefresh: true,
      },
    });

    tl.to({}, { duration: 0.5 }, 0); // la casa se termina de construir antes de moverse
    tl.to(copy, { y: -90, autoAlpha: 0, duration: 0.7, ease: 'power2.in' }, 0.5);
    tl.to(spots, { opacity: 0, duration: 0.3 }, 0.5);
    tl.fromTo(
      house,
      { scale: 1, x: 0, y: 0, transformOrigin: `${kx * 100}% ${ky * 100}%` },
      { scale: 6, x: () => target().dx, y: () => target().dy, duration: 1.3, ease: 'power2.in' },
      0.6,
    );
    tl.to(house, { autoAlpha: 0, duration: 0.35 }, 1.55);
    tl.fromTo(layers, { autoAlpha: 0, scale: 0.9 }, { autoAlpha: 1, scale: 1, duration: 0.6, ease: 'power2.out' }, 1.5);
    const end = wallSteps(gsap, tl, 2.3);
    tl.to($('.layers__copy', layers), { autoAlpha: 0, y: -40, duration: 0.4, ease: 'power2.in' }, end + 0.15);
    tl.to($('.layers__art', layers), { scale: 0.94, y: -30, duration: 0.5, ease: 'power2.in' }, end + 0.15);
    tl.to({}, { duration: 0.25 }, end + 0.7);

    return () => {
      root.classList.remove('is-master');
      layers.classList.remove('is-scrub');
    };
  });

  // Celular / pantallas bajas: la portada va normal y solo la pared se fija.
  mm.add('(max-width: 899px), (max-height: 559px)', () => {
    layers.classList.add('is-scrub', 'is-solo');
    const tl = gsap.timeline({
      defaults: { ease: 'none' },
      scrollTrigger: {
        trigger: layers,
        start: 'top top+=60',
        end: () => '+=' + window.innerHeight * 3.4,
        pin: true,
        scrub: 0.6,
        anticipatePin: 1,
        invalidateOnRefresh: true,
      },
    });
    wallSteps(gsap, tl, 0.1);
    return () => layers.classList.remove('is-scrub', 'is-solo');
  });

  cleanups.push(() => mm.revert());
}

/* ---------- Entrada de textos de cabecera (cualquier página) ---------- */
function heroIn(gsap: any) {
  if (!$$('[data-hero-in]').length) return;
  gsap.fromTo('[data-hero-in]', { y: 28, opacity: 0 }, { y: 0, opacity: 1, duration: 0.9, ease: 'power3.out', stagger: 0.14, delay: 0.7 });
}

/* ---------- Portada: la casa se construye sola al cargar ---------- */
function heroIntro(gsap: any) {
  const art = $('.hero__art');
  if (!art) return;
  const studs = $$('[data-stud]', art);
  const cols = studs.filter((s) => s.hasAttribute('data-col'));
  const thin = studs.filter((s) => !s.hasAttribute('data-col'));
  const tracks = $$('[data-track]', art);
  const structure = $('[data-layer=structure]', art);
  const plates = $$('[data-plate]', art);
  const finish = $('[data-layer=finish]', art);
  const spots = $$('.spot', art);

  const tl = gsap.timeline({ delay: 0.3, defaults: { ease: 'power3.out' } });
  tl.fromTo(tracks, { scaleX: 0, transformOrigin: '0% 50%' }, { scaleX: 1, duration: 0.7, stagger: 0.08 }, 0);
  tl.fromTo(cols, { scaleY: 0, transformOrigin: '50% 100%' }, { scaleY: 1, duration: 0.8, stagger: 0.07 }, 0.15);
  tl.fromTo(thin, { scaleY: 0, transformOrigin: '50% 100%' }, { scaleY: 1, duration: 0.7, stagger: 0.025 }, 0.4);
  tl.fromTo(plates, { clipPath: 'inset(0% 100% 0% 0%)' }, { clipPath: 'inset(0% 0% 0% 0%)', duration: 0.7, ease: 'power3.inOut', stagger: 0.16 }, 1.5);
  tl.to(structure, { opacity: 0.4, duration: 0.6 }, 2.3);
  tl.fromTo(finish, { clipPath: 'inset(0% 100% 0% 0%)', opacity: 0.4 }, { clipPath: 'inset(0% 0% 0% 0%)', opacity: 1, duration: 1.1, ease: 'power2.inOut' }, 2.7);
  tl.fromTo(spots, { autoAlpha: 0, scale: 0.6 }, { autoAlpha: 1, scale: 1, duration: 0.45, ease: 'back.out(2)', stagger: 0.1 }, 3.5);
}

/* ---------- Botones magnéticos: siguen al cursor con suavidad (solo puntero fino) ---------- */
function magnets(gsap: any) {
  if (!matchMedia("(hover: hover) and (pointer: fine)").matches) return;
  let cur: HTMLElement | null = null;
  const sel = ".btn:not(.btn--off)";
  const reset = (el: HTMLElement) => gsap.to(el, { x: 0, y: 0, duration: 0.7, ease: "elastic.out(1, 0.4)", overwrite: "auto" });

  const move = (e: PointerEvent) => {
    const el = (e.target as Element).closest?.(sel) as HTMLElement | null;
    // Dentro de islas de React (Motion) y diálogos no se aplica: dos motores sobre el mismo transform chocarían
    const ok = el && !el.closest(".q, dialog");
    if (cur && cur !== el) {
      reset(cur);
      cur = null;
    }
    if (!el || !ok) return;
    cur = el;
    const r = el.getBoundingClientRect();
    const dx = e.clientX - (r.left + r.width / 2);
    const dy = e.clientY - (r.top + r.height / 2);
    gsap.to(el, { x: gsap.utils.clamp(-10, 10, dx * 0.25), y: gsap.utils.clamp(-8, 8, dy * 0.35), duration: 0.35, ease: "power3.out", overwrite: "auto" });
  };
  const out = (e: PointerEvent) => {
    if (cur && !cur.contains(e.relatedTarget as Node | null)) {
      reset(cur);
      cur = null;
    }
  };
  document.addEventListener("pointermove", move, { passive: true });
  document.addEventListener("pointerout", out);
  cleanups.push(() => {
    document.removeEventListener("pointermove", move);
    document.removeEventListener("pointerout", out);
    if (cur) gsap.set(cur, { clearProps: "x,y" });
  });
}

/* ---------- Cursor "Ver / Ampliar / Arrastra" sobre las fotos (solo puntero fino) ---------- */
function cursorFx(gsap: any) {
  if (!matchMedia("(hover: hover) and (pointer: fine)").matches) return;
  const dot = document.createElement("div");
  dot.className = "fx-cursor";
  dot.setAttribute("aria-hidden", "true");
  document.body.appendChild(dot);
  document.documentElement.classList.add("fx-on");

  const qx = gsap.quickTo(dot, "x", { duration: 0.35, ease: "power3.out" });
  const qy = gsap.quickTo(dot, "y", { duration: 0.35, ease: "power3.out" });
  let active: Element | null = null;

  const show = (el: Element) => {
    active = el;
    dot.textContent = (el as HTMLElement).dataset.cursor ?? "";
    gsap.to(dot, { scale: 1, opacity: 1, duration: 0.3, ease: "back.out(2)", overwrite: "auto" });
  };
  const hide = () => {
    active = null;
    gsap.to(dot, { scale: 0, opacity: 0, duration: 0.2, ease: "power2.in", overwrite: "auto" });
  };
  const move = (e: PointerEvent) => {
    qx(e.clientX);
    qy(e.clientY);
    const el = (e.target as Element).closest?.("[data-cursor]") ?? null;
    if (el && el !== active) show(el);
    else if (!el && active) hide();
  };
  const leave = () => active && hide();
  document.addEventListener("pointermove", move, { passive: true });
  document.documentElement.addEventListener("pointerleave", leave);
  cleanups.push(() => {
    document.removeEventListener("pointermove", move);
    document.documentElement.removeEventListener("pointerleave", leave);
    document.documentElement.classList.remove("fx-on");
    dot.remove();
  });
}

/* ---------- 404: la pared queda a medias (perfiles + algunas placas + el rodillo detenido) ---------- */
function notFound(gsap: any) {
  const root = $("[data-nf]");
  if (!root) return;
  const studs = $$('[data-w="studs"] rect', root);
  const boards = $('[data-w="boards"]', root);
  const roller = $('[data-w="roller"]', root);
  const tl = gsap.timeline({ delay: 0.3, defaults: { ease: "power3.out" } });
  tl.fromTo(studs, { scaleY: 0, transformOrigin: "50% 100%" }, { scaleY: 1, duration: 0.7, stagger: 0.05 }, 0);
  tl.fromTo(boards, { clipPath: "inset(0% 100% 0% 0%)" }, { clipPath: "inset(0% 38% 0% 0%)", duration: 1.3, ease: "power2.inOut" }, 0.7);
  tl.fromTo(roller, { x: 0, opacity: 0 }, { x: 400, opacity: 1, duration: 1.3, ease: "power2.inOut" }, 0.7);
}

/* ---------- Empresas: el plano de planta se dibuja solo ---------- */
function plan(gsap: any) {
  const svg = $(".plan");
  if (!svg) return;
  const q = (name: string) => $$(`[data-plan="${name}"]`, svg);
  const tl = gsap.timeline({ delay: 0.4, defaults: { ease: "power3.out" } });
  tl.fromTo(q("shell"), { clipPath: "inset(0% 100% 0% 0%)" }, { clipPath: "inset(0% 0% 0% 0%)", duration: 1.1, ease: "power2.inOut" }, 0);
  tl.fromTo(q("floor"), { opacity: 0 }, { opacity: 1, duration: 0.6, stagger: 0.1 }, 0.9);
  tl.fromTo(q("part"), { clipPath: "inset(100% 0% 0% 0%)" }, { clipPath: "inset(0% 0% 0% 0%)", duration: 0.7, ease: "power2.inOut", stagger: 0.22 }, 1.1);
  tl.fromTo(q("details"), { opacity: 0 }, { opacity: 0.8, duration: 0.5 }, 2.0);
  tl.fromTo(q("labels"), { opacity: 0 }, { opacity: 1, duration: 0.6 }, 2.2);
}

/* ---------- Empresas: la línea del proceso se llena con el scroll y cada paso se enciende (sin pin) ---------- */
function proceso(gsap: any, ScrollTrigger: any) {
  const root = $("[data-proc]");
  if (!root) return;
  const list = $("[data-proc-list]", root);
  const fill = $("[data-proc-fill]", root);
  const steps = $$("[data-pstep]", root);
  if (!list) return;

  if (fill) {
    gsap.fromTo(
      fill,
      { scaleY: 0 },
      { scaleY: 1, ease: "none", scrollTrigger: { trigger: list, start: "top 65%", end: "bottom 65%", scrub: 0.4 } },
    );
  }
  steps.forEach((el) => {
    ScrollTrigger.create({
      trigger: el,
      start: "top 65%",
      onEnter: () => el.classList.add("is-on"),
      onLeaveBack: () => el.classList.remove("is-on"),
    });
  });
}

/* ---------- Galería horizontal: el scroll vertical la desplaza (solo escritorio) ---------- */
function gallery(gsap: any) {
  const section = $('[data-gallery]');
  const view = $('[data-gallery-view]');
  const track = $('[data-gallery-track]');
  if (!section || !view || !track) return;

  // Fotos con efecto cortina al entrar la sección
  gsap.fromTo(
    $$('.pcard__media', track),
    { clipPath: 'inset(100% 0% 0% 0%)' },
    {
      clipPath: 'inset(0% 0% 0% 0%)',
      duration: 1,
      ease: 'power3.inOut',
      stagger: 0.12,
      clearProps: 'clipPath',
      scrollTrigger: { trigger: section, start: 'top 75%', once: true },
    },
  );

  const mm = gsap.matchMedia();
  mm.add('(min-width: 900px)', () => {
    section.classList.add('is-pinned');
    const dist = () => Math.max(0, track.scrollWidth - view.clientWidth);
    gsap.to(track, {
      x: () => -dist(),
      ease: 'none',
      scrollTrigger: {
        trigger: section,
        start: 'top top+=60',
        end: () => '+=' + dist(),
        pin: true,
        scrub: true,
        invalidateOnRefresh: true,
        anticipatePin: 1,
      },
    });
    return () => section.classList.remove('is-pinned');
  });
  cleanups.push(() => mm.revert());
}

/* ---------- Ficha: historia de la obra (SIN pin: el scroll sigue libre) ----------
   Barra fija con las etapas: la línea roja se llena con el avance y el botón activo sigue al bloque que estás viendo.
   Los botones saltan al bloque. Las fotos entran suaves al aparecer. */
function story(gsap: any, ScrollTrigger: any) {
  const root = $("[data-story]");
  if (!root) return;
  const stages = $$("[data-stage-block]", root);
  const chips = $$("[data-story-chip]", root);
  const fill = $("[data-story-fill]", root);
  const nav = $("[data-story-nav]", root);

  const setActive = (id: string) => chips.forEach((c) => c.setAttribute("aria-current", String(c.dataset.stage === id)));

  stages.forEach((el) => {
    ScrollTrigger.create({
      trigger: el,
      start: "top 45%",
      end: "bottom 45%",
      onToggle: (self: any) => self.isActive && setActive(el.dataset.stageBlock as string),
    });
  });

  if (fill) {
    gsap.fromTo(
      fill,
      { scaleX: 0 },
      { scaleX: 1, ease: "none", scrollTrigger: { trigger: root, start: "top 40%", end: "bottom 70%", scrub: 0.4 } },
    );
  }

  // Salto suave a la etapa (con Lenis); sin Lenis queda el ancla nativa
  chips.forEach((c) => {
    c.addEventListener("click", (e) => {
      const target = $("#etapa-" + c.dataset.stage);
      if (!target || !lenisRef) return;
      e.preventDefault();
      const offset = -((nav?.offsetHeight ?? 0) + 60 + 12);
      lenisRef.scrollTo(target, { offset, duration: 1.1 });
      setActive(c.dataset.stage as string);
    });
  });

  // Las fotos entran suaves, en tandas, al aparecer (solo entrada: no hay coreografía de scroll)
  ScrollTrigger.batch($$("[data-shot]", root), {
    start: "top 92%",
    once: true,
    onEnter: (batch: any[]) =>
      gsap.fromTo(
        batch,
        { opacity: 0, y: 36, clipPath: "inset(12% 0% 0% 0% round 14px)" },
        { opacity: 1, y: 0, clipPath: "inset(0% 0% 0% 0% round 14px)", duration: 0.7, ease: "power3.out", stagger: 0.07, clearProps: "clipPath" },
      ),
  });
}

/* ---------- Ficha: el comparador hace un barrido de bienvenida ---------- */
function compare(gsap: any) {
  $$("[data-compare]").forEach((el) => {
    const input = $<HTMLInputElement>(".cmp__range", el);
    const o = { v: 0 };
    const set = () => el.style.setProperty("--p", o.v.toFixed(1));
    set(); // arranca mostrando solo el "después" (igual que la foto de la tarjeta)
    const tl = gsap.timeline({ delay: 0.9, onUpdate: set, onComplete: () => input && (input.value = "50") });
    tl.to(o, { v: 82, duration: 0.9, ease: "power2.inOut" }).to(o, { v: 50, duration: 0.8, ease: "power2.inOut" });
    (el as any)._intro = tl;
  });
}

/* ---------- Títulos: palabra por palabra (entrada) y salida al subir ---------- */
function words(gsap: any) {
  $$('[data-words]').forEach((el) => {
    const items = $$('[data-word]', el);
    if (!items.length) return;
    const inHero = !!el.closest('.scene--hero');
    const inScene = !!el.closest('[data-scenes]');
    gsap.fromTo(
      items,
      { yPercent: 115, opacity: 1 },
      {
        yPercent: 0,
        duration: 0.8,
        ease: 'power3.out',
        stagger: 0.07,
        delay: inHero ? 0.15 : 0,
        scrollTrigger: inHero || inScene ? undefined : { trigger: el, start: 'top 88%', once: true },
      },
    );
    // Salida: el título se va con el scroll (solo fuera de las escenas fijas)
    const box = el.parentElement;
    if (box && !el.closest('[data-scenes],[data-gallery],.closing')) {
      gsap.to(box, {
        y: -50,
        opacity: 0,
        ease: 'none',
        scrollTrigger: { trigger: box, start: 'bottom 22%', end: 'bottom -5%', scrub: true },
      });
    }
  });
}

/* ---------- Bloques: entran al subir y salen al irse (ligado al scroll) ---------- */
function reveals(gsap: any) {
  $$('[data-reveal]').forEach((el) => {
    const curtain = el.dataset.reveal === 'curtain';
    const noExit = el.hasAttribute('data-noexit');
    const tl = gsap.timeline({
      defaults: { ease: 'none' },
      scrollTrigger: { trigger: el, start: 'top 94%', end: noExit ? 'top 62%' : 'bottom 6%', scrub: 0.4 },
    });
    if (curtain) {
      tl.fromTo(el, { clipPath: 'inset(18% 0% 0% 0% round 28px)', y: 70, opacity: 0 }, { clipPath: 'inset(0% 0% 0% 0% round 28px)', y: 0, opacity: 1, duration: noExit ? 1 : 0.22 });
    } else {
      tl.fromTo(el, { y: 50, opacity: 0 }, { y: 0, opacity: 1, duration: noExit ? 1 : 0.2 });
    }
    if (!noExit) tl.to(el, { y: -40, opacity: 0, duration: 0.2 }, 0.8);
  });
}

/* ---------- Fotos con revelado tipo cortina ---------- */
function curtains(gsap: any) {
  $$('[data-curtain]').forEach((el, i) => {
    gsap.fromTo(
      el,
      { clipPath: 'inset(0% 0% 100% 0%)' },
      {
        clipPath: 'inset(0% 0% 0% 0%)',
        duration: 0.9,
        ease: 'power3.inOut',
        delay: (i % 3) * 0.08,
        scrollTrigger: { trigger: el, start: 'top 88%', once: true },
      },
    );
  });
}

/* ---------- Contadores ---------- */
function counters(gsap: any) {
  $$('[data-count]').forEach((el) => {
    const to = Number(el.dataset.count);
    const dec = Number(el.dataset.dec ?? 0);
    const state = { v: 0 };
    const paint = () => (el.textContent = state.v.toFixed(dec));
    paint();
    gsap.to(state, {
      v: to,
      duration: 2.2,
      ease: 'power3.out',
      onUpdate: paint,
      scrollTrigger: { trigger: el, start: 'top 85%', once: true },
    });
  });
}

document.addEventListener('astro:page-load', init);
document.addEventListener('astro:before-swap', (e) => {
  cleanup();
  // La página nueva llega sin la clase: se la ponemos antes de pintarla para evitar un parpadeo.
  if (!prefersReduced()) (e as any).newDocument.documentElement.classList.add('motion');
});
