# SEIMA Servicios Generales — Web

Web pública del negocio de **Luis Rodríguez** (SEIMA): drywall, enchapado, electricidad, melamina y pintura en Lima y provincias. Es un **portafolio/catálogo de proyectos con un cotizador guiado**, no una landing genérica.

**Antes de construir cualquier cosa, lee `docs/brief.md` y `STATE.md`.** El brief tiene las decisiones (objetivo, público, servicios, estilo, stack); `STATE.md` tiene el estado real del proyecto, el historial y las lecciones técnicas. Material de referencia en `docs/fuentes/`. Si algo del brief contradice este archivo, manda el brief y avisa.

## Documentación viva (obligatorio)

`STATE.md` (raíz) es la memoria del proyecto: permite que un agente nuevo sepa todo lo hecho sin que se lo expliquen desde cero.

- **En cada interacción en la que cambies algo o se tome una decisión, actualiza `STATE.md` antes de dar la tarea por terminada.** No es opcional ni se deja "para después".
- Qué registrar, bajo la **fecha del día** (formato `AAAA-MM-DD`, lo más reciente arriba en el Historial):
  - **Decisiones** (qué se decidió y por qué, incluidas las que descartamos) y **Cambios** (qué se construyó, archivos clave, hash del commit si lo hay).
  - Si cambia el estado: actualiza también la sección "Estado actual" (rutas, componentes, stack) y "Pendientes".
  - Errores que costaron tiempo → sección "Lecciones técnicas".
- Si una decisión afecta la base de datos, anótala además en `docs/modelo-datos.md`; si afecta producto, en `docs/brief.md` (solo lo decidido).
- Un cambio sin su entrada en `STATE.md` cuenta como incompleto.

## Estructura del repo

```
seima_web/
├── CLAUDE.md
├── STATE.md         # estado e historial vivo (se actualiza siempre)
├── docs/            # brief.md (fuente de verdad), modelo-datos.md + fuentes/
├── web/             # Astro (web pública)
└── api/             # Express (backend)
```

## Versionamiento

Repo en GitHub (`origin` = seroven/seima_web). Ramas: `main` (estable) y **`staging` (aquí se trabaja)**. Se pasa a `main` solo por merge/PR desde `staging`. No hagas commit ni push sin que Sebas lo pida. Commits en español, con el trailer de atribución indicado por el entorno.

El **panel administrativo es un proyecto aparte y está fuera de alcance** en esta etapa. No crear login ni rutas de administración.

## Stack

- **web/** — Astro + islas de React solo donde hay interactividad real (cotizador, filtros del catálogo). Todo lo demás, componentes `.astro`.
- **api/** — Express (Node) + PostgreSQL. Fotos en **Cloudinary**; la base de datos guarda solo URLs/public_ids.
- Hosting de pruebas: Render.
- Sin autenticación.

## Alcance de la etapa 1

1. Web pública: Inicio, Proyectos (catálogo con filtros), Ficha de proyecto, Empresas, Cotizador.
2. API mínima:
   - `GET /categories`
   - `GET /projects?category=` (lista)
   - `GET /projects/:slug` (ficha con fotos antes/durante/después)
   - `POST /quotes` (guarda la solicitud y devuelve el texto para WhatsApp)
3. Script de **seed** para cargar proyectos (no hay panel todavía).

Modelo de datos orientativo (ajustable; **las decisiones sobre fotos están en `docs/modelo-datos.md`**: etapa, foto principal por etapa, galería): `categories`, `projects` (slug, título, categoría, distrito, área m², días, servicios, descripción, destacado, tipo de cliente), `project_photos` (project_id, etapa: antes|durante|después, cloudinary_id, orden), `quotes` (tipo cliente, servicios, medidas, acabado, distrito, plazo, nombre, whatsapp, razón social/RUC opcionales, fotos, fecha).

## Reglas de contenido (no negociables)

- **Nada inventado como si fuera real**: ni testimonios, ni fotos de proyectos generadas con IA, ni cifras. Lo que falte va como placeholder visible: `[DATO REAL]`.
- IA solo para texturas, fondos abstractos, íconos o la ilustración de la casa.
- **No mencionar facturación** (Luis tiene RUC pero no emite facturas).
- El número de WhatsApp va en variable de entorno, nunca hardcodeado.
- Textos de la interfaz en **español (Perú)**, tono cercano y profesional.

## Dirección visual

- **Dirección C (mixta):** secciones de impacto en oscuro, catálogo y cotizador en claro.
  - Oscuro `#0E0E0E`, claro **neutro** `#FFFFFF` (grises `#F2F2F2` para superficies), rojo SEIMA `#E0283C` (texto rojo sobre claro: `#C81D30` para contraste). **Nada de crema/amarillento**: el logo es solo blanco, negro y rojo. (Antes el claro era `#F4F1EC`; cambiado el 2026-11-15.)
  - **Chips y controles sin borde:** los estados (reposo, hover, activo) se resuelven con sombreado/tono del fondo, no con líneas de borde (se ven toscas).
  - Títulos: Archivo ancha y pesada (`font-stretch` ~118%, peso 800–900). Ajustable.
- Concepto: **"Construimos tu espacio, capa por capa."** La portada muestra una casa que se arma (estructura → placas → acabado) con ambientes clicables que filtran el catálogo.
- Fotos de obra no profesionales → **tratamiento uniforme** (tono negro/rojo que pasa a color al interactuar, mismos recortes y radios).
- Evitar el look "hecho por IA": nada de degradados morados, hero centrado genérico, tres tarjetas iguales, glassmorphism por todos lados ni animaciones infinitas en todo.
- Referencia del prototipo (estructura y estilo, no código a copiar): https://claude.ai/artifact/Amrrkc17uniixx4JQQCYKa (fila "Versión 2").

## Animación

| Uso | Herramienta |
|---|---|
| Coreografía y scroll (casa, tarjetas apiladas, galería horizontal, textos) | GSAP + ScrollTrigger |
| Scroll suave | Lenis |
| Microinteracciones dentro de islas React | Motion o React Bits |
| Transición catálogo → ficha (foto que se agranda) | View Transitions de Astro (`ClientRouter`, `transition:name`) |

Reglas:
- **Nunca GSAP y Motion en el mismo componente.**
- Animar solo `transform`, `opacity` y `clip-path`. Duraciones de UI 200–600 ms.
- Respetar `prefers-reduced-motion` (sin animaciones, contenido visible igual).
- Con `ClientRouter`: inicializar y limpiar GSAP/ScrollTrigger/Lenis en `astro:page-load` / `astro:before-swap`. Las islas se recrean al navegar; usar `transition:persist` si deben conservar estado.
- Cargar librerías pesadas en diferido. Nada de 3D salvo que se pida.

## Calidad

- **Móvil primero**: Luis enseña la web desde su celular y muchos clientes entran con datos móviles. Probar en ancho de celular siempre.
- Cada ficha de proyecto debe tener **Open Graph propio** (título, descripción, imagen) para que se vea bien al compartir por WhatsApp.
- Imágenes de Cloudinary con transformaciones (formato/calidad automáticos, tamaños responsivos).
- Accesible: HTML semántico, foco visible, contraste AA, `alt` en fotos.
- El cotizador termina abriendo WhatsApp con el resumen y además guarda la solicitud vía `POST /quotes`.

## Primera tarea sugerida

Una **rebanada vertical** para validar el estilo antes de construir todo: portada (casa capa por capa + títulos + tarjetas apiladas, con GSAP y Lenis reales) y una ficha de proyecto con la transición desde una tarjeta del catálogo. Datos de prueba locales; la API puede venir después.
