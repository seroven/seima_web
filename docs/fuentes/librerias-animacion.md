# Librerías y técnicas de animación (investigación 2026-11-15)

> Propuesta, pendiente de confirmar con Sebastian. Lo decidido pasa a `docs/brief.md`.

## Cómo se hacen las webs "hechas con Claude" que se ven increíbles
1. **Prompts largos y específicos** (hero, nav, transiciones, scroll, parallax, rendimiento, móvil) + iterar varias veces.
2. **Assets generados con IA** (video/imagen: Higgsfield, Seedance, Kling, Nano Banana). Gran parte del "wow" viene de ahí, no del código.
3. **Componentes animados ya hechos** (21st.dev, React Bits, Aceternity UI, Magic UI) que Claude Code adapta.
4. **Skills de Claude Code** que traen las buenas prácticas de cada librería (GSAP oficial, Three.js, Lottie/motion design, skills "anti-slop" de diseño).

## Propuesta para SEIMA
| Capa | Herramienta | Uso |
|---|---|---|
| Coreografía y scroll | **GSAP + ScrollTrigger** (gratis desde 2024) | Casa que se arma capa por capa, tarjetas apiladas, galería horizontal, textos que entran |
| Scroll suave | **Lenis** | Sensación premium al bajar; se integra con ScrollTrigger |
| UI e interacciones | **Motion** (ex Framer Motion) o View Transitions nativas | Cotizador, filtros del catálogo, foto que "vuela" a la ficha |
| Efectos puntuales | **React Bits** (respeta "reducir movimiento") | Textos animados, marquesina, contadores |
| Ilustración interactiva (opcional) | **Rive** o SVG + GSAP | La casa con ambientes que reaccionan al mouse/toque |
| 3D (opcional, 1 solo momento) | Three.js / R3F | Solo si no afecta rendimiento en celular |

Reglas: un solo motor por componente (no mezclar GSAP y Motion en el mismo), cargar librerías pesadas en diferido, animar solo transform/opacity/clip-path, respetar prefers-reduced-motion.

## Sobre IA para imágenes/video
- OK: texturas, fondos abstractos, la ilustración de la casa, íconos.
- NO: "proyectos" o fotos de obra generadas con IA presentadas como trabajos reales de Luis.
