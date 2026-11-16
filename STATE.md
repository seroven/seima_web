# STATE — estado e historial de la web SEIMA

> **Para qué sirve:** que cualquier agente nuevo sepa qué hay construido, qué se decidió y por qué, sin que haya que explicárselo desde cero.
> **Obligatorio:** se actualiza con **cada cambio y cada decisión** (ver `CLAUDE.md`, sección "Documentación viva"). Lo nuevo va **arriba** del historial, bajo su fecha.
> Complementa a `CLAUDE.md` (reglas), `docs/brief.md` (decisiones de producto) y `docs/modelo-datos.md` (base de datos).

Última actualización: **2026-11-15**

---

## 1. Estado actual (resumen vivo)

**Qué es:** web pública de SEIMA Servicios Generales (Luis Rodríguez). Portafolio/catálogo con cotizador guiado. Etapa 1.

**Stack real hoy**
- `web/` — Astro **7.4.12**, GSAP + ScrollTrigger (+ Flip), Lenis, fuente Archivo variable (`@fontsource-variable/archivo/wdth.css`). **React 19 + `@astrojs/react` + Motion (`motion/react`) solo para el cotizador** (isla `client:load`). El resto sigue siendo Astro/GSAP.
- `api/` — **no existe todavía** (Express + PostgreSQL + Cloudinary, ver `CLAUDE.md`).
- Node **≥ 22.23.4** (Astro 7 lo exige). Con `nvm use 22.23.4`.
- Correr: `cd web && npm run dev` → http://localhost:4321/ (si el `node` de la terminal es viejo: `nvm use 22.23.4`).

**Git:** remoto `origin` = https://github.com/seroven/seima_web.git. Ramas: `main` (estable) y **`staging` (donde se trabaja)**. Commits se hacen cuando Sebas lo pide. El push no es automático.

**Rutas que existen:** `/` (landing), `/proyectos` (catálogo), `/proyectos/[slug]` (ficha, 7 proyectos de prueba), `/cotizador` (cotizador de 6 pasos), `/empresas` (página para empresas), `404` (página de error).
**Rutas que faltan:** API.

**Datos:** `web/src/data/projects.ts` — 7 proyectos **de prueba** (todo `[DATO REAL]` / `[FOTO REAL]`). Se reemplaza por `GET /projects`.
**Entorno:** `PUBLIC_WHATSAPP_NUMBER` sin configurar → los botones de WhatsApp salen como placeholder punteado "[NÚMERO PENDIENTE]". `PUBLIC_API_URL` sin configurar → el cotizador no guarda la solicitud (no hay API aún) pero igual arma el mensaje. Ver `web/.env.example`.

### Mapa del código (`web/src/`)
| Archivo | Qué hace |
|---|---|
| `layouts/Base.astro` | HTML base, metadatos y Open Graph, `ClientRouter`, barra de progreso, carga `motion`, `nav` y `peek`. Pone la clase `motion` en `<html>` si no hay "reducir movimiento". |
| `pages/index.astro` | Landing: escenas (casa → zoom a la cocina → pared por oficios), marquesina, galería horizontal, cifras fijas, zona clara que se monta encima. |
| `pages/proyectos/index.astro` | Catálogo: título con contador, **fila de chips de ambiente con ícono, pegajosa bajo el header**, píldora oscura que se desliza (clip-path), línea de resultado con "Quitar filtro", bento y reacomodo animado (Flip) al filtrar. |
| `components/CategoryIcon.astro` | Íconos de línea 24×24 de cada ambiente (todos, cocinas, baños, departamentos, melamina, techos, cocheras/fachadas, remodelaciones, locales). |
| `pages/proyectos/[slug].astro` | Ficha: comparador antes/después, acciones, "El proyecto", **historia de la obra con una galería (mosaico) por etapa** y barra fija de etapas, CTA final. |
| `components/House.astro` | Casa en SVG de 3 capas (estructura/placas/acabado) + 6 ambientes clicables. |
| `components/Wall.astro` | Pared de cocina en SVG que se arma por oficios (drywall → enchape → electricidad → melamina → pintura). |
| `components/Words.astro` | Título que entra palabra por palabra (máscara). Prop `br` para saltar de línea antes del acento. |
| `components/Photo.astro` | Foto con tratamiento uniforme (duotono negro/rojo → color al interactuar). Placeholder visible si no hay `src`. Props `plain`, `fill`. |
| `components/ProjectCard.astro` | Tarjeta de proyecto; "después" por defecto, "antes" al pasar el mouse / mantener presionado. `transition:name` para la foto que vuela a la ficha. |
| `components/CompareSlider.astro` | Comparador antes/después (input range invisible encima; accesible con teclado). |
| `pages/cotizador.astro` | Página del cotizador (cabecera + isla `Quote`). Acepta `?categoria=`, `?proyecto=` y `?cliente=empresa|persona` (con `cliente` se salta la primera pregunta) para preseleccionar. |
| `pages/404.astro` | Página 404: "404" en contorno con el 0 en rojo, "Esta página sigue en obra", botones a inicio/proyectos y la **pared del cotizador a medias** (perfiles + algunas placas + rodillo detenido; `notFound()` en `motion.ts`, y sin JS se ve igual por CSS). Lleva `noindex` y no tiene canonical (prop `noindex` de `Base.astro`). Se genera como `404.html`. |
| `pages/empresas.astro` | Empresas: hero con plano de planta animado, capacidad en bento (12 col.), proyectos de escala (tarjetas del catálogo), cifras reales (+50 proyectos, +10 años, Lima), "Cómo trabajamos" (línea vertical que se llena con el scroll y pasos que se encienden, sin pin) y cierre "Solicitar propuesta" → `/cotizador?cliente=empresa`. |
| `components/Plan.astro` | Plano de planta SVG de 3 departamentos que se dibuja solo (`plan()` en `motion.ts`). |
| `components/quote/Quote.tsx` | **Isla de React** (Motion): estado del cotizador, navegación entre los 6 pasos con animación, validación, envío y pantalla final. Guarda el avance en `sessionStorage`. |
| `components/quote/Steps.tsx` | Los 6 pasos: cliente, servicios (multi-selección), espacio (medidas, acabado, extras de cocina y departamento), lugar/plazo/fotos, datos, resumen con burbuja de WhatsApp. |
| `components/quote/Summary.tsx`, `quote.css` | Resumen en vivo (columna fija en escritorio, barra inferior desplegable en celular) y estilos propios del cotizador (rejilla, tarjeta, resumen, chat). |
| `components/ui/*` | **Kit de componentes compartidos (React)** — importar desde `../ui`: `Combobox` (dropdown), `Field`, `TextInput` (con prefijo), `Chip`/`Chips`, `OptionCard`/`OptionGrid`, `Stepper`, `Collapse`, `Icon`. Estilos en `ui/ui.css` (clases `ui-*`, variable `--ring`). Reutilizar estos en cualquier formulario nuevo; no duplicar controles. |
| `lib/quote.ts` | Lógica pura del cotizador: tipos, opciones, validación, `buildMessage` (texto de WhatsApp), `waHref`, `submitQuote` (POST /quotes). |
| `components/Presentation.astro` | Visor a pantalla completa (`<dialog>`): todas las fotos ordenadas por etapa. Flechas laterales, arrastre (pointer events), teclado, animación de entrada/salida. Lo abren el botón "Modo presentación" y cualquier foto de la galería (`[data-shot]`, desde esa foto). Un solo listener global. |
| `components/BackButton.astro` | Botón "Volver" de la ficha (texto según origen). |
| `components/Cta.astro` | Botón de WhatsApp; sin número → placeholder. |
| `components/Header.astro` | Cabecera fija. En escritorio: enlaces + "Cotizar". En celular (≤720 px): logo + "Cotizar" + botón de menú que abre un **menú a pantalla completa** (`<dialog>`): círculo que crece desde el botón (`clip-path`), enlaces numerados que suben escalonados, página actual en rojo, "Arma tu cotización" y TikTok; cierra con X, Esc o al elegir un enlace, con animación inversa. |
| `components/Footer.astro` | Pie. |
| `scripts/motion.ts` | **Toda la coreografía** GSAP/ScrollTrigger/Lenis: escenas de la landing, galería horizontal, `story()` (barra fija de etapas + entrada de fotos, **sin pin**), comparador, reveals, contadores. |
| `scripts/nav.ts` | Memoria de scroll propia y origen de navegación (botón Volver). |
| `scripts/peek.ts` | Mantener presionado una tarjeta en celular → muestra el "antes". |
| `data/projects.ts` | Datos de prueba (7 proyectos, 2–10 fotos por etapa; uno sin "durante"). Tipo `Foto` (`etapa`, `principal`, `orden`, `pie`) y helpers `fotosDe`, `principal`, `fotosOrdenadas`. |
| `lib/whatsapp.ts` | Arma el enlace `wa.me` desde la variable de entorno. |
| `styles/global.css` | Variables (colores/tipografía), botones, foto con tratamiento, scroll continuo, reduced-motion. |

### Diseño y animación vigentes
- Paleta y tipografía según `CLAUDE.md` (oscuro `#0E0E0E`, claro **neutro** blanco `#FFFFFF` + grises `#F2F2F2`, rojo `#E0283C`, Archivo ancha). Chips y controles **sin borde** (estados con tono de fondo: variables `--tint` y `--tint-2`).
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
12. **Carruseles:** un contenedor con `overflow-x: auto` + scroll-snap solo se desliza con dedo/rueda; con mouse no se puede arrastrar. Para "deslizar" en escritorio hay que implementar arrastre con pointer events (y `touch-action: pan-y`). Un `<dialog>` modal no anima solo: animar la entrada con `@keyframes` en `[open]` y la salida con una clase `is-closing` antes de llamar a `close()` (e interceptar `cancel` para Esc).
13. Astro 7 exige Node ≥ 22.23.4; con `nvm use` en Windows la terminal ya abierta puede no tomar el cambio.
14. **Isla de React + SSR:** leer `location`/`sessionStorage` solo dentro de `useEffect` (tras montar) para no romper la hidratación; las variables `PUBLIC_*` se leen con `import.meta.env` también en el cliente.
15. **`window.open` para WhatsApp** debe llamarse dentro del clic (síncrono) o el navegador lo bloquea; el `POST /quotes` va aparte (fire-and-forget) y nunca debe impedir abrir WhatsApp.
16. **Pruebas con el navegador automatizado:** la herramienta bloquea imprimir URLs con query string (devuelve `[BLOCKED]`); no devolver `location.search`. Crear/borrar `.env` reinicia Vite y recarga la página (corta una prueba en curso).
18. **El anillo de foco se recorta con `overflow`:** cualquier ancestro con `overflow` ≠ `visible` (incluido `overflow-x:auto`, que fuerza también el vertical) corta el `outline`/`box-shadow` que sobresale. Reglas: (a) no poner `overflow:hidden` en contenedores de controles (el `fieldset` solo necesita `min-width:0`); (b) en scrollers, dar `padding` ≥ 8px y compensar con margen negativo; (c) animaciones de altura (`Collapse`) solo recortan mientras animan y terminan en `overflow: visible`; (d) en elementos pegados al borde, anillo hacia adentro (`outline-offset` negativo). Causa original: `.q-block { overflow:hidden }` del cotizador.
19. **Columnas de `1fr` con titulares largos:** `1fr` = `minmax(auto, 1fr)`, así que una palabra larga y grande ensancha su columna y aplasta a la otra. Usar `minmax(0, …fr)` y ajustar el tamaño del titular.
17. **Heredocs en bash** con comillas/`$`/plantillas fallan a veces: para archivos de código usar la herramienta Write.

---

## 3. Pendientes y próximos pasos

**Decidido, sin construir**
- Modelo de datos de fotos (etapa, principal, galería) en la API → `docs/modelo-datos.md`. (La parte visual ya está en la web con datos de prueba.)

**Por construir (orden acordado)**
1. **API: se define en una conversación aparte** (hay que acordar bien las bases antes de construir: modelo de datos, endpoints, hosting, Cloudinary). Cuando se haga: API Express (incluye `POST /quotes`: el cotizador ya lo llama si existe `PUBLIC_API_URL`; subida de fotos del cliente a Cloudinary) + PostgreSQL + seed + Cloudinary.
2. Calidad: Open Graph con imagen real, accesibilidad, prueba en celular real, despliegue en Render.

**Bloqueado por Luis (contenido real):** número de WhatsApp, fotos de 8–12 proyectos (antes/durante/después), cifras, testimonios, precios referenciales sí/no, equipo/"Nosotros". Ver `docs/fuentes/contexto-chat.md` §7.

**Pendiente de git:** subir a GitHub los commits locales de `staging`.

---

## 4. Historial (más reciente primero)

### 2026-11-15

**Decisiones**
- **La API se trata en una conversación aparte:** Sebas quiere definir bien las bases (modelo de datos, endpoints, hosting, Cloudinary) antes de construirla. Con esto se cierra el pulido pendiente de la web pública (lo único opcional que queda: ver lista de pendientes).
- **Pulido "otro nivel" del brainstorm:** botones magnéticos (los `.btn` se desplazan hasta 10 px × 8 px hacia el cursor y vuelven con rebote elástico) y cursor "Ver / Ampliar / Arrastra" sobre las fotos (burbuja roja que sigue al puntero y oculta el cursor nativo solo sobre esas zonas). **Solo puntero fino con hover y con movimiento permitido**: en celular/táctil no existen. Las islas de React (`.q`) y los diálogos quedan fuera del efecto magnético para no mezclar GSAP y Motion sobre el mismo `transform`.
- **404 "sigue en obra":** en vez de una pantalla de error genérica, reutiliza la pared del cotizador a medias (concepto "capa por capa"). Ofrece salidas claras (inicio, proyectos, Empresas, cotizador). `noindex` para que no se indexe. **Hosting:** Astro genera `dist/404.html`; al desplegar en Render hay que confirmar que el sitio estático lo sirva para rutas desconocidas.
- **Menú móvil a pantalla completa** (de la lista del brainstorm "menú que se abre a pantalla completa"): solo en celular (≤720 px). "Cotizar" se queda visible en el header (conversión) y el resto de enlaces pasan al menú. Mismo patrón que el visor de fotos: `<dialog>` modal (foco atrapado y Esc gratis), entrada/salida animadas y un solo listener global para abrirlo. Incluye enlace al TikTok oficial `@seima.drywall` (dato del brief).
- **Voz del cotizador: "nosotros"** (pedido de Sebas): se eliminan las menciones a Luis en tercera persona del cotizador (cabecera, ayudas, pantalla final, mensaje sin número, descripción SEO y la opción "Recomiéndame" → "Que ustedes me aconsejen"). Regla añadida a `CLAUDE.md` (reglas de contenido). El pie de página conserva "Luis Rodríguez".
- **Página Empresas** (según `docs/fuentes/contexto-chat.md` §4): hero propio con "Solicitar propuesta", capacidad, proceso de 4 pasos (visita técnica → propuesta por partidas → avance documentado → entrega y revisión). **Solo trabajos reales** (varios departamentos, obras de dos pisos, locales como tiendas y consultorios, solo mano de obra) y cifras reales (+50 proyectos, +10 años de experiencia, dato de Sebas). **Sin facturación ni nombres de clientes.** El proceso es un flujo de scroll normal (línea que se llena + pasos que se encienden), no un pin. En el header se añade el enlace "Empresas"; la tarjeta "Para empresas" de la landing ahora lleva a `/empresas`.
- **Kit de UI compartido (`components/ui`) y dropdown propio:** los controles del cotizador se extrajeron a componentes reutilizables y el `<datalist>` nativo del distrito se sustituyó por un **`Combobox`** con el estilo de la web: lista con **alto máximo** (15 rem; en celular máx. 38 % de la pantalla) y scroll fino estilizado, coincidencias resaltadas en rojo, opción activa sombreada, marca de la elegida, apertura **hacia arriba** si abajo no hay espacio, teclado completo (↑ ↓ Inicio Fin Enter Esc Tab; Enter elige sin enviar el formulario) y patrón ARIA combobox/listbox. Permite valores libres (`allowCustom`). **Anillo de foco:** se mantiene (sombra roja) pero ya no se recorta (ver lección 18); el recorte era un `overflow:hidden` propio del cotizador y también se corrigió en la barra de etapas de la ficha y en la galería horizontal de la landing.
- **Cotizador:** 6 pasos (cliente → qué necesita → espacio → dónde/cuándo → datos → resumen), una pregunta por paso, barra de progreso, resumen en vivo (lateral en escritorio; barra inferior en celular). **No muestra precios.** Medidas opcionales (largo × ancho, solo m², o "aún no lo sé"). Preguntas condicionales: acabado (si hay cocina/baño/enchape/departamento), mueble alto y estructura (cocina), n.º de ambientes (departamento). Empresa pide razón social (obligatoria) y RUC (opcional, 11 dígitos); no se menciona facturación. WhatsApp: 9 dígitos que empiezan con 9, con formato `9XX XXX XXX`. Al final: vista previa del mensaje como burbuja (con "escribiendo…"), botón "Enviar por WhatsApp" (abre `wa.me` con el texto) y "Copiar mensaje". **Fotos del cliente:** se pueden elegir (hasta 6, con vista previa) pero por ahora NO se suben (no hay API/Cloudinary): el mensaje dice "las adjunto por este chat" y las envía por WhatsApp. Los botones de cotizar de toda la web (header, portada, cierre, ficha) ahora llevan a `/cotizador`; "Cotizar algo así" en la ficha lo abre con la categoría y el proyecto ya marcados ("Basado en: …"). `components/Cta.astro` queda sin uso (se conserva por si se quiere un enlace directo a WhatsApp).
- **Se quita el marcador "01 Estructura · 02 Placas · 03 Acabado"** de la portada de la landing (pedido de Sebas): la casa se sigue construyendo igual, pero sin la etiqueta de etapas.
- **Datos reales confirmados por Sebas:** **+50 proyectos entregados** (aproximado) y **más de 10 años de experiencia** de Luis en el rubro. El +50 ya se muestra en la landing (cifras). Los 10 años **aún no se muestran** (dato guardado; candidato a cifra o a la página Empresas/Nosotros). Siguen sin dato: m² construidos, número de WhatsApp, testimonios.
- **Fondo claro neutro (blanco) en vez de crema, y controles sin borde:** el crema `#F4F1EC` se sentía amarillento y desentonaba con el logo (solo blanco, negro y rojo). Ahora `--paper: #FFFFFF`, `--paper-2: #F2F2F2` (superficies), grises neutros en textos secundarios. Las superficies claras que antes eran blancas sobre crema (p. ej. tarjeta "Para tu hogar") pasan a `--paper-2` para separarse del fondo. Los chips (catálogo, etapas de la ficha), el botón "Quitar filtro" y las flechas del visor ya no llevan borde: reposo = `--tint` (negro al 6 %), hover = `--tint-2` (11 %), activo = negro. Quedan como ghost con contorno solo los botones sobre fondo oscuro (`.btn--ghost`, Volver). Decisión de Sebas; actualizados `brief.md` y `CLAUDE.md`.
- **Filtros como chips (no cuadros):** las fichas cuadradas no gustaron; la forma buena es la del chip con ícono (la que se veía en la mini barra). Ahora esa es la forma por defecto y la propia fila se queda pegada bajo el header al bajar (se elimina la mini barra duplicada). El chip activo es una píldora oscura con borde rojo que se desliza con `clip-path` sobre una capa oscura idéntica (cumple la regla de solo transform/opacity/clip-path). Se quitaron los contadores de dentro de los chips (no cabían las 9 en una fila: 1467 px vs 1240 px); el número vive en el título y en "Mostrando N de M". Cuando hay más chips que ancho, un desvanecido a la derecha avisa que se puede deslizar.
- **Placeholders de foto en gama rojo/café** (matiz 8–33°): los de "antes" salían amarillo-oliva al pasar el mouse.
- *(histórico, reemplazado arriba)* **Filtros del catálogo rediseñados** (las píldoras se sentían sosas; el bento de tarjetas se queda como está): fichas por ambiente con ícono, cantidad de proyectos y un indicador oscuro con borde rojo que se desliza hasta la activa; línea "Mostrando N de M · Ambiente" con botón "Quitar filtro"; **mini barra fija** (con los mismos filtros) que aparece al bajar para no volver arriba. Los ambientes sin proyectos se muestran atenuados (0) y llevan al estado vacío. Se evaluó y dejó fuera por ahora un filtro extra "hogar / empresas".
- **Visor (modo presentación) rehecho:** el scroll nativo horizontal no se puede arrastrar con mouse y no era intuitivo. Ahora: flechas a los lados (en celular se montan sobre la foto), arrastre propio con pointer events (mouse y dedo, con resistencia en los extremos), teclado (← → Inicio Fin, Esc) y animaciones de entrada (zoom desde la foto tocada + fundido, elementos escalonados) y de salida (inversa). Con "reducir movimiento" abre y cierra sin animar.
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
- *(sin commit aún)* **Botones magnéticos y cursor personalizado** (`magnets()` y `cursorFx()` en `scripts/motion.ts`, estilos `.fx-cursor` en `global.css`, atributos `data-cursor` en `ProjectCard.astro` ("Ver"), `CompareSlider.astro` ("Arrastra") y los `.shot` de la ficha ("Ampliar"); el hover de `.btn` pasó de `transform` a `translate` para no chocar con GSAP). Probado con mouse real: la burbuja "Ver" aparece sobre la tarjeta del catálogo; el botón del hero de Empresas se desplaza (10 px, 6.8 px) cerca de su esquina y vuelve a `none` al salir; la burbuja se oculta al salir; tras 3 navegaciones con `ClientRouter` queda un solo cursor; `npm run build` correcto (12 páginas).
- `a149ad2` — **Página 404** (ver entrada siguiente; antes figuraba sin commit).
- `a149ad2` — **Página 404** (`pages/404.astro`, prop `noindex` en `layouts/Base.astro`, `notFound()` en `scripts/motion.ts`). Probado: en dev responde HTTP 404 con la página, `<meta robots noindex>` y sin canonical, animación (perfiles → placas → rodillo), celular sin desborde y `npm run build` genera `404.html` (12 páginas).
- `8db96ce` — **Menú móvil a pantalla completa** (ver entrada siguiente; antes figuraba sin commit).
- `8db96ce` — **Menú móvil a pantalla completa** (`components/Header.astro`, reglas de `global.css`): botón de tres líneas, diálogo con animación `clip-path` desde el botón, enlaces escalonados, foco en el diálogo al abrir (sin anillo sobre el logo), cierre con X/Esc/enlace, bloqueo de scroll (`html.menu-on`) y cierre automático si la pantalla pasa a escritorio. Sustituye el parche temporal que ocultaba "Inicio" ≤560 px. Probado en un iframe de 390 px: abre, foco correcto, cierra animado, navegar desde el menú cambia de página y libera el scroll; `npm run build` correcto (11 páginas).
- Push de `staging` a GitHub hecho (sincronizado hasta `88b6e9a`).
- *(sin commit aún)* **Cotizador en voz "nosotros":** 10 textos reescritos en `pages/cotizador.astro`, `components/quote/Quote.tsx`, `components/quote/Steps.tsx` y `lib/quote.ts`. Verificado en el navegador recorriendo los pasos (no queda "Luis" en el cotizador; el único en la página es el del pie).
- `f1f7896` — **Página Empresas** (ver entrada siguiente; antes figuraba sin commit).
- `f1f7896` — **Página Empresas** (`pages/empresas.astro`, `components/Plan.astro`, `plan()` y `proceso()` en `motion.ts`, enlace en `Header.astro`, tarjeta de la landing, `?cliente=` en `Quote.tsx`). Probado: hero con el plano dibujándose, bento sin textos cortados (se pasó a rejilla de 12 columnas), proceso con línea y pasos que se encienden, "Solicitar propuesta" abre el cotizador en el paso 2 con "Para: Empresa", celular sin desborde y `npm run build` correcto (11 páginas). Arreglos de paso: (a) el header no cabía en celular con el enlace nuevo → se oculta "Inicio" ≤560 px y se compacta; (b) los bloques que solo entran (`data-noexit`, p. ej. el cierre rojo) ahora terminan de aparecer antes de llegar al fondo de la página (`end: top 62%`).
- *(sin commit aún)* **Kit de UI + dropdown + anillo de foco** (`components/ui/*`, `quote/Steps.tsx` refactorizado, `quote.css` reducido, `Icon` movido a `ui/`, ajustes en `proyectos/[slug].astro` y `pages/index.astro`). Probado: apertura/filtrado/teclado/selección del dropdown, que Enter no avance el paso, anillo completo en chips, despliegues animados que terminan en `overflow: visible`, dropdown en celular (240 px, sin desborde) y `npm run build` correcto. Ajuste posterior: el ícono del check de `OptionCard` se veía rosa sobre el círculo rojo porque la regla de íconos de la tarjeta seleccionada lo pintaba de `#ff6b7a`; ahora el check va siempre en blanco (selector más específico en `ui.css`), círculo de 28 px e ícono de 16 px. **Lección:** una regla genérica sobre `.ui-icon` dentro de un contenedor afecta también a íconos anidados con otro fondo; fijar el color del ícono anidado explícitamente.
- *(sin commit aún)* **Cotizador de 6 pasos** (`pages/cotizador.astro`, `components/quote/*`, `lib/quote.ts`, `astro.config.mjs` con `@astrojs/react`, `tsconfig.json` con `jsx: react-jsx`, deps nuevas: `react`, `react-dom`, `@astrojs/react`, `motion`, `@types/react*`; `.env.example` con `PUBLIC_API_URL`). Probado en el navegador: validación por paso, resumen en vivo, bloques condicionales, flujo completo hasta el mensaje, enlace desde una ficha (preselección), envío con un número de prueba temporal (`wa.me/51900000000?text=…`, ya borrado), celular sin desborde (se corrigió el desborde de las tarjetas de servicios) y `npm run build` correcto (10 páginas).
- commit «Paleta neutra, chips sin borde, cifra +50 y portada sin marcador de etapas» — **Marcador de etapas fuera de la portada:** eliminados el `<ol class="steps">` y su CSS en `pages/index.astro`, y en `motion.ts` la variable `steps`, `setStep` y sus tres `tl.call`; el zoom a la cocina ahora desvanece solo los puntos (`spots`). Probado: la casa se construye, el scroll por las capas funciona y no hay errores en consola.
- commit «Paleta neutra, chips sin borde, cifra +50 y portada sin marcador de etapas» — **Cifra "+50 proyectos entregados"** en la landing (`pages/index.astro`): sustituye al placeholder `[DATO REAL]`; contador animado con prefijo `+` fijo (`prefix` en el arreglo `stats`). Probado: se lee "+50" tras la animación.
- commit «Paleta neutra, chips sin borde, cifra +50 y portada sin marcador de etapas» — **Paleta neutra y chips sin borde:** `global.css` (`--paper`, `--paper-2`, `--muted-*`, nuevas `--tint`/`--tint-2`), chips y "Quitar filtro" del catálogo, chips y barra de etapas de la ficha, flechas del visor, tarjeta clara de la landing, blancos de la casa; `brief.md` y `CLAUDE.md` actualizados.
- commit «Paleta neutra, chips sin borde, cifra +50 y portada sin marcador de etapas» — **Filtros como chips pegajosos** (`proyectos/index.astro`): fila de chips con ícono, capa oscura recortada con `clip-path` hasta el chip activo, `IntersectionObserver` con centinela para sombra al quedar pegada, desvanecido derecho cuando hay más por deslizar, mini barra eliminada; placeholders de `global.css` ajustados a rojo/café. Probado: pegado bajo el header (top 60 px), filtrar, quitar filtro, estado desde URL y celular sin desborde.
- *(reemplazado)* Primera versión con fichas cuadradas de ambiente: (`proyectos/index.astro`, `CategoryIcon.astro`): íconos propios, contadores, indicador deslizante (solo `translate`), entrada escalonada, mini barra con `inert` mientras está oculta, línea de resultado accesible (`role=status`), URL `?categoria=` sincronizada. Probado: filtrar, categoría vacía, quitar filtro, mini barra al bajar y filtrar desde ella, estado inicial desde la URL y celular sin desborde.
- `45a3cc7` — **Visor de fotos rehecho** (`components/Presentation.astro`): flechas laterales, arrastre con mouse/dedo, teclado, contador y pista de uso; animación de entrada (`pres-in`, origen en la foto tocada) y de salida (`is-closing` → `dialog.close()` al terminar). Probado: abre en la foto correcta, flecha siguiente, arrastre real con mouse (1→2), tecla →, Esc con animación (~360 ms) y celular.
- `53ac0df` — **Historia de la obra con galerías por etapa:** `data/projects.ts` pasa a varias fotos por etapa con `principal`/`orden` y helpers; la tarjeta del catálogo, el comparador y el `og:image` usan la **principal**; la ficha muestra un mosaico por etapa (bloques 4×2 que siempre cuadran) con barra fija de etapas (`story()` en `motion.ts`, sin pin); `Presentation.astro` reutilizado como visor desde cualquier foto. Probado: salto de etapa, etapa activa, visor en la foto correcta (16/23), proyecto sin "durante" y celular sin desborde.
- `53ac0df` — **Documentación:** creado `docs/modelo-datos.md` (fotos por etapa, foto principal, galería, forma de la API), creado este `STATE.md`, añadida a `CLAUDE.md` la sección "Documentación viva (obligatorio)" y "Versionamiento", y enlazados ambos documentos desde `docs/brief.md` §8.
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
