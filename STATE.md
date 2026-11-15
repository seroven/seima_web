# STATE — estado e historial de la web SEIMA

> **Para qué sirve:** que cualquier agente nuevo sepa qué hay construido, qué se decidió y por qué, sin que haya que explicárselo desde cero.
> **Obligatorio:** se actualiza con **cada cambio y cada decisión** (ver `CLAUDE.md`, sección "Documentación viva"). Lo nuevo va **arriba** del historial, bajo su fecha.
> Complementa a `CLAUDE.md` (reglas), `docs/brief.md` (decisiones de producto) y `docs/modelo-datos.md` (base de datos).

Última actualización: **2026-11-15**

---

## 1. Estado actual (resumen vivo)

**Qué es:** web pública de SEIMA Servicios Generales (Luis Rodríguez). Portafolio/catálogo con cotizador guiado. Etapa 1.

**Stack real hoy**
- `web/` — Astro **7.4.12**, GSAP + ScrollTrigger (+ Flip), Lenis, fuente Archivo variable (`@fontsource-variable/archivo/wdth.css`). **Sin React todavía** (la isla de React se reserva para el cotizador).
- `api/` — **no existe todavía** (Express + PostgreSQL + Cloudinary, ver `CLAUDE.md`).
- Node **≥ 22.23.4** (Astro 7 lo exige). Con `nvm use 22.23.4`.
- Correr: `cd web && npm run dev` → http://localhost:4321/ (si el `node` de la terminal es viejo: `nvm use 22.23.4`).

**Git:** remoto `origin` = https://github.com/seroven/seima_web.git. Ramas: `main` (estable) y **`staging` (donde se trabaja)**. Commits se hacen cuando Sebas lo pide. El push no es automático.

**Rutas que existen:** `/` (landing), `/proyectos` (catálogo), `/proyectos/[slug]` (ficha, 7 proyectos de prueba).
**Rutas que faltan:** `/cotizador`, `/empresas`, 404, menú móvil, API.

**Datos:** `web/src/data/projects.ts` — 7 proyectos **de prueba** (todo `[DATO REAL]` / `[FOTO REAL]`). Se reemplaza por `GET /projects`.
**Entorno:** `PUBLIC_WHATSAPP_NUMBER` sin configurar → los botones de WhatsApp salen como placeholder punteado "[NÚMERO PENDIENTE]". Ver `web/.env.example`.

### Mapa del código (`web/src/`)
| Archivo | Qué hace |
|---|---|
| `layouts/Base.astro` | HTML base, metadatos y Open Graph, `ClientRouter`, barra de progreso, carga `motion`, `nav` y `peek`. Pone la clase `motion` en `<html>` si no hay "reducir movimiento". |
| `pages/index.astro` | Landing: escenas (casa → zoom a la cocina → pared por oficios), marquesina, galería horizontal, cifras fijas, zona clara que se monta encima. |
| `pages/proyectos/index.astro` | Catálogo: título con contador, bento, filtros con reacomodo animado (Flip). |
| `pages/proyectos/[slug].astro` | Ficha: comparador antes/después, acciones, "El proyecto", **historia de la obra con una galería (mosaico) por etapa** y barra fija de etapas, CTA final. |
| `components/House.astro` | Casa en SVG de 3 capas (estructura/placas/acabado) + 6 ambientes clicables. |
| `components/Wall.astro` | Pared de cocina en SVG que se arma por oficios (drywall → enchape → electricidad → melamina → pintura). |
| `components/Words.astro` | Título que entra palabra por palabra (máscara). Prop `br` para saltar de línea antes del acento. |
| `components/Photo.astro` | Foto con tratamiento uniforme (duotono negro/rojo → color al interactuar). Placeholder visible si no hay `src`. Props `plain`, `fill`. |
| `components/ProjectCard.astro` | Tarjeta de proyecto; "después" por defecto, "antes" al pasar el mouse / mantener presionado. `transition:name` para la foto que vuela a la ficha. |
| `components/CompareSlider.astro` | Comparador antes/después (input range invisible encima; accesible con teclado). |
| `components/Presentation.astro` | Visor a pantalla completa (`<dialog>`): todas las fotos ordenadas por etapa. Lo abren el botón "Modo presentación" y cualquier foto de la galería (`[data-shot]`, desde esa foto). Un solo listener global. |
| `components/BackButton.astro` | Botón "Volver" de la ficha (texto según origen). |
| `components/Cta.astro` | Botón de WhatsApp; sin número → placeholder. |
| `components/Header.astro`, `Footer.astro` | Cabecera fija y pie. |
| `scripts/motion.ts` | **Toda la coreografía** GSAP/ScrollTrigger/Lenis: escenas de la landing, galería horizontal, `story()` (barra fija de etapas + entrada de fotos, **sin pin**), comparador, reveals, contadores. |
| `scripts/nav.ts` | Memoria de scroll propia y origen de navegación (botón Volver). |
| `scripts/peek.ts` | Mantener presionado una tarjeta en celular → muestra el "antes". |
| `data/projects.ts` | Datos de prueba (7 proyectos, 2–10 fotos por etapa; uno sin "durante"). Tipo `Foto` (`etapa`, `principal`, `orden`, `pie`) y helpers `fotosDe`, `principal`, `fotosOrdenadas`. |
| `lib/whatsapp.ts` | Arma el enlace `wa.me` desde la variable de entorno. |
| `styles/global.css` | Variables (colores/tipografía), botones, foto con tratamiento, scroll continuo, reduced-motion. |

### Diseño y animación vigentes
- Paleta y tipografía según `CLAUDE.md` (oscuro `#0E0E0E`, claro `#F4F1EC`, rojo `#E0283C`, Archivo ancha).
- **Landing = una sola escena continua:** la casa se construye sola al cargar; al hacer scroll hace **zoom a la cocina** y se convierte en una **pared** que se arma por oficios (cada servicio = una capa). En celular no hay zoom: la portada va normal y solo la pared se fija.
- Barra de scroll **oculta** (solo con movimiento activo) + línea roja de progreso arriba (CSS nativo `animation-timeline: scroll()`).
- Todo con `prefers-reduced-motion`: sin animaciones, contenido visible.

---

## 2. Lecciones técnicas (no repetir estos errores)

1. **Orden de ScrollTrigger:** crear primero los pines, en el orden del documento, y después las animaciones normales (`reveals`, `words`…). Si no, las posiciones se calculan sin el espacio de los pines y todo se dispara antes de tiempo.
2. **Nunca bajar la opacidad de elementos apilados** que se solapan (se mezclan las letras). Usar escala u overlay opaco.
3. **Restauración de scroll:** el navegador/Astro restauran el scroll antes de que GSAP arme los pines. Por eso `nav.ts` guarda la posición y `motion.ts` la restaura **después** del `refresh`, llamando antes a `lenis.resize()` (si no, Lenis recorta a su límite viejo). En recarga se empieza arriba.
4. **En un "atrás" con `ClientRouter`, `location` ya es el destino** cuando salta `astro:before-preparation`; la página que se deja es `event.from`.
5. **GSAP pisa `transform` de CSS:** para centrar o hacer hover en elementos animados por GSAP, usar la propiedad `translate`/`scale` individual en CSS, no `transform`.
6. **`String.replace` en JS interpreta `$$` como `$`** (rompió un selector `$$`). Para ediciones con `$` usar la herramienta Edit, no scripts con `replace`.
7. **`$` vs `$$` en `motion.ts`:** `$` devuelve un elemento (o null), `$$` una lista.
8. Solo animar `transform`, `opacity` y `clip-path` (excepción consciente: el marquee y los puntos que laten usan transform/opacity también).
9. **Probar en celular:** la ventana del navegador de pruebas no se redimensiona; se simula con un `<iframe style="width:390px">` (los media queries leen el ancho del iframe). Comprobar que `scrollWidth === clientWidth`.
10. **Scripts con `node -e '...'` en bash:** las comillas simples del código (p. ej. `['antes']`) cierran la comilla de bash y se pierden. Para archivos con comillas, `$` o plantillas usar Write/Edit o un script escrito a archivo.
11. **Mosaico con huecos:** con `grid-auto-flow: dense` y tamaños por posición queda una última fila coja. Solución: construir el mosaico por **bloques que cuadran** (4×2) según la cantidad de fotos.
12. Astro 7 exige Node ≥ 22.23.4; con `nvm use` en Windows la terminal ya abierta puede no tomar el cambio.

---

## 3. Pendientes y próximos pasos

**Decidido, sin construir**
- Modelo de datos de fotos (etapa, principal, galería) en la API → `docs/modelo-datos.md`. (La parte visual ya está en la web con datos de prueba.)

**Por construir (orden acordado)**
1. Cotizador de 6 pasos (isla de React, Motion) con preselección desde "Cotizar algo así".
2. Página Empresas + "Cómo trabajamos".
3. Detalles globales: menú móvil a pantalla completa, botones magnéticos, cursor "ver", 404.
4. API Express + PostgreSQL + seed + Cloudinary.
5. Calidad: Open Graph con imagen real, accesibilidad, prueba en celular real, despliegue en Render.

**Bloqueado por Luis (contenido real):** número de WhatsApp, fotos de 8–12 proyectos (antes/durante/después), cifras, testimonios, precios referenciales sí/no, equipo/"Nosotros". Ver `docs/fuentes/contexto-chat.md` §7.

**Pendiente de git:** subir a GitHub los commits locales de `staging`.

---

## 4. Historial (más reciente primero)

### 2026-11-15

**Decisiones**
- **Historia de la obra SIN coreografía de scroll:** se descartó el scroll atrapado que "regresa al inicio" para cambiar de etapa. Queda un flujo vertical normal con tres bloques (Antes/Durante/Después), cada uno con su galería, y una barra fija de etapas (botones que saltan + línea roja de avance). Las fotos solo tienen una entrada suave. *(Recomendación mía; Sebas ya había dicho que no quería coreografía ahí.)*
- **Hasta ~10 fotos por etapa** (dato de Sebas): se muestran todas, sin paginar. Etapas sin fotos se ocultan.
- **El visor** abre todas las fotos del proyecto (ordenadas por etapa) empezando en la tocada, en vez de limitarse a una etapa; el Modo presentación es el mismo visor desde la primera foto.
- **Fotos por proyecto con etapa y principal:** cada foto es `antes|durante|despues`; hay **una principal por proyecto y etapa** (la elige Luis en el panel; el seed la marca mientras tanto). La principal alimenta comparador, tarjeta del catálogo y `og:image`; el resto son fotos de detalle. Detalle en `docs/modelo-datos.md`.
- **"Historia de la obra" cambia:** en vez de una foto por etapa, cada etapa muestra una **galería** (sin foto principal en esa zona). Se saltó la idea de "scroll atrapado que regresa al inicio"; recomendación propuesta: flujo vertical normal con tres bloques + barra fija de etapas con línea roja de progreso + visor a pantalla completa. *(Pendiente de confirmar por Sebas.)*
- **Documentación viva:** se crea este `STATE.md` y se vuelve obligatorio actualizarlo (regla en `CLAUDE.md`).
- **Versionamiento:** repo en GitHub, `main` + `staging`; se trabaja en `staging`.
- **Astro 7 (no 6):** se instaló Node 22.23.4 con nvm para poder usar Astro 7.
- Los filtros del catálogo se hacen con JS simple en la página (no isla de React); la isla de React queda para el cotizador.
- El CTA principal de la landing es "Ver proyectos"; "Cotizar por WhatsApp" es secundario hasta que exista el cotizador.
- La barra de scroll se oculta solo con movimiento activo, y se compensa con la línea de progreso.

**Cambios**
- *(sin commit aún)* **Historia de la obra con galerías por etapa:** `data/projects.ts` pasa a varias fotos por etapa con `principal`/`orden` y helpers; la tarjeta del catálogo, el comparador y el `og:image` usan la **principal**; la ficha muestra un mosaico por etapa (bloques 4×2 que siempre cuadran) con barra fija de etapas (`story()` en `motion.ts`, sin pin); `Presentation.astro` reutilizado como visor desde cualquier foto. Probado: salto de etapa, etapa activa, visor en la foto correcta (16/23), proyecto sin "durante" y celular sin desborde.
- *(sin commit aún)* **Documentación:** creado `docs/modelo-datos.md` (fotos por etapa, foto principal, galería, forma de la API), creado este `STATE.md`, añadida a `CLAUDE.md` la sección "Documentación viva (obligatorio)" y "Versionamiento", y enlazados ambos documentos desde `docs/brief.md` §8.
- `4df01ae` — **Catálogo y ficha al nivel del v2:**
  - Catálogo: título gigante con contador, bento (tarjetas de distinto tamaño), reacomodo animado con GSAP Flip al filtrar, "antes" al pasar el mouse o mantener presionado (`peek.ts`).
  - Ficha: comparador antes/después con barrido de bienvenida, historia de la obra fijada con scroll (3 etapas, botones que saltan), "Compartir por WhatsApp" (no necesita el número), Modo presentación (`<dialog>`).
  - Corregido selector `data-hero-in` que dejaba textos invisibles fuera de la landing.
- `c2d33d1` — **Botón Volver y memoria de scroll:** botón "Volver al inicio / al catálogo" según el origen; `nav.ts` guarda/restaura el scroll tras armar los pines; recargar empieza arriba.
- `110e6f9` — **Rebanada vertical inicial** (primer commit en `main`): landing, catálogo, ficha, datos de prueba.
- Landing reconstruida como **escena continua** (sin lista de servicios): casa que se construye al cargar → zoom a la cocina → pared armada por oficios; galería horizontal fijada; cifras fijas con zona clara que se monta encima; entradas y salidas ligadas al scroll. Corregidos: letras mezcladas en tarjetas apiladas (opacidad) y animaciones que se disparaban antes (orden de pines).
- Primera versión de la landing (descartada por simple) y análisis del **prototipo v2** (claude.ai artifact `Amrrkc17uniixx4JQQCYKa`, carpeta `project/v2/`), que pasó a ser la referencia visual.
- Scaffold de `web/` (Astro), tipografía, componentes base, datos de prueba.
- Lectura de `docs/brief.md`, `CLAUDE.md` y `docs/fuentes/contexto-chat.md` (brainstorm: cotizador de 6 pasos, página Empresas, modo presentación, etc.).
