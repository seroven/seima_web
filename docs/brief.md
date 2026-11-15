# Brief — Seima Web

> Fuente única de verdad del proyecto. Aquí solo va lo **decidido**.
> Lo que sigue en discusión va en "Pendientes". Claude Code lee este archivo antes de construir.
> Material de referencia: `docs/fuentes/tiktok-analisis.md`.

## 1. Negocio
- Nombre en la web: **SEIMA Servicios Generales** (en TikTok aparece como SEIMA Drywall; logo rojo/blanco sobre negro)
- Formalidad: tiene RUC, **no emite facturas** (la web no debe prometer facturación)
- Rubro: servicios generales de construcción y acabados — hace de todo
- Dueño: **Luis Rodríguez**. Trabaja de forma independiente: toma proyectos directamente (no es subcontratista de una empresa)
- Antes se promocionaba como "Acabados Finos Luisito"; hoy la marca es SEIMA
- Cobertura: Lima y provincias
- Canal principal hoy: TikTok @seima.drywall (~7.3K seguidores)

## 2. Objetivo de la web
1. **Portafolio profesional** (más serio que TikTok) que Luis pueda mostrar en persona a un cliente: "¿quieres una cocina? mira aquí".
2. **Catálogo de proyectos**, no una landing simple con cosas sueltas.
3. **Cotizador guiado**: en vez de un formulario de texto libre, el cliente elige opciones y arma su solicitud; a Luis le llega todo ordenado para revisar.

## 3. Público
- **Personas naturales** (casas, departamentos, cocinas, baños, remodelaciones).
- **Empresas** con proyectos importantes (locales comerciales, varios departamentos, obras).
- Los mini departamentos los encarga público variado.

## 4. Servicios
Hace de todo; confirmado hasta ahora:
- Drywall (incluye **mini departamentos completos**, que suele hacer él solo)
- Enchapado (porcelanato: cocinas, baños, cocheras, fachadas)
- Electricidad
- Muebles de melamina
- Pintura y remodelaciones

_Detalle de trabajos vistos en `docs/fuentes/tiktok-analisis.md`; falta validar la lista final con él._

## 5. Secciones de la web
_por definir_

## 6. Tono y estilo visual
- Limpio, moderno y muy profesional, **pero no una landing común**: con animaciones, transiciones y elementos modernos.
- **Dirección C (mixta):** secciones de impacto en oscuro (#0E0E0E + rojo SEIMA), catálogo y cotizador en claro cálido (#F4F1EC) para leer y llenar datos fácil.
- Concepto: **"construimos tu espacio, capa por capa"**: la portada muestra una casa que se arma (estructura → placas → acabado) con ambientes clicables.
- Fotos de obra (no profesionales) con **tratamiento uniforme**: tono negro/rojo que pasa a color al interactuar; recortes y marcos consistentes.
- Movimiento con propósito: títulos que entran palabra por palabra, marquesina de servicios, tarjetas apiladas al hacer scroll, galería horizontal, revelado tipo cortina, contadores, transición foto → ficha, microinteracciones en el cotizador.
- Rendimiento primero: animaciones nativas del navegador (scroll-driven / view transitions), nada de 3D pesado; respetar "reducir movimiento".
- Tipografía de prueba: Archivo (ancha y pesada en títulos).
- Prototipo v2: https://claude.ai/artifact/Amrrkc17uniixx4JQQCYKa (fila "Versión 2")

## 7. Decisiones técnicas
**Arquitectura:** tres proyectos separados que comparten un backend.

| Parte | Stack | Por qué |
|---|---|---|
| Web pública | **Astro** + islas de React | Contenido casi todo estático: carga rápida en celular, SEO local y vista previa propia por proyecto al compartir por WhatsApp (Open Graph en el HTML). |
| Panel administrativo | **React (Vite)**, proyecto aparte | Solo lo usa Luis; no necesita SEO ni vistas previas. Ahí sube proyectos y revisa cotizaciones. Fuera del alcance de la web. |
| Backend | **Express** (Node) | Fácil de desplegar. Dueño de los datos: proyectos, categorías, fotos y cotizaciones. Lo consumen la web y el panel. |

**Animación y UI (web pública):**
- GSAP + ScrollTrigger: coreografía y scroll (casa capa por capa, tarjetas apiladas, galería horizontal, textos).
- Lenis: scroll suave.
- Motion (ex Framer Motion) y/o React Bits: solo dentro de islas de React (cotizador, filtros). Nunca GSAP y Motion en el mismo componente.
- View Transitions de Astro (`ClientRouter`, `transition:name`) para la transición foto → ficha.
- Ojo en Astro: re-inicializar GSAP/Lenis en `astro:page-load`; las islas se recrean al navegar (usar `transition:persist` si deben conservar estado).
- Animar solo transform/opacity/clip-path; respetar `prefers-reduced-motion`; cargar librerías pesadas en diferido.

**Datos y servicios:**
- Base de datos: **PostgreSQL**.
- Fotos: **Cloudinary**; la base de datos guarda solo los enlaces.
- Sin login: es solo una web pública.
- Hosting: lo maneja Sebastian; pruebas en **Render**.

**Alcance de la etapa 1:** web pública (Astro) + backend Express con lo que la web necesita (leer proyectos/categorías, recibir cotizaciones). El **panel administrativo no se toca en esta etapa**; mientras tanto los proyectos se cargan con un script de seed.

**Se decide al llegar al panel:** cómo se actualiza la web cuando Luis publica un proyecto (rebuild por webhook vs. páginas generadas al vuelo).

## 8. Fuentes
- `docs/fuentes/librerias-animacion.md` — librerías de animación y cómo se hacen las webs "hechas con Claude"
- `docs/fuentes/ideas-navegacion.md` — ideas de navegación investigadas + enlace al prototipo boceto
- `docs/fuentes/tiktok-analisis.md` — revisión del TikTok (servicios, videos top, comentarios, precios mencionados)
- `docs/fuentes/contexto-chat.md` — contexto del brainstorm (técnicas por sección, cotizador, Empresas, pendientes con Luis)
- `docs/modelo-datos.md` — decisiones de base de datos (fotos por etapa, foto principal, galería)
- `STATE.md` (raíz) — estado actual e historial de cambios y decisiones de la web

## 9. Pendientes
- Testimonios: deben ser reales (frases de clientes con su permiso); fotos con clientes también requieren su autorización
- Definir objetivo principal de la web
- Confirmar lista de servicios y si se publican precios referenciales
- Confirmar canal de contacto (WhatsApp, teléfono)
