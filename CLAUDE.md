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
├── api/             # Express + TypeScript + TypeORM (backend; ver api/README.md)
└── app/             # Flutter + Riverpod (app Android de Luis: proyectos y cotizaciones; ver docs/plan-app-movil.md)
```

## Versionamiento

Repo en GitHub (`origin` = seroven/seima_web). Ramas: `main` (estable) y **`staging` (aquí se trabaja)**. Se pasa a `main` solo por merge/PR desde `staging`. No hagas commit ni push sin que Sebas lo pida.

### Formato de los commits (obligatorio)

**En inglés** y con esta estructura: `[proyecto] tipo: explicación`

- **`[proyecto]`** — qué parte toca: `[web]`, `[api]`, `[app]` (app móvil), `[docs]` (documentación, `STATE.md`, `CLAUDE.md`) o `[repo]` (cambios transversales: `.gitignore`, configuración raíz). Un commit toca **un solo proyecto**; si un cambio afecta a dos, son dos commits.
- **`tipo`** — `feat` (funcionalidad nueva), `fix` (corrección de un error), `refactor` (reestructura sin cambiar el comportamiento), `perf`, `style` (solo formato o estilos visuales sin lógica), `test`, `docs`, `chore` (configuración, dependencias, mantenimiento), `build`, `ci`.
- **`explicación`** — resumen en imperativo y en minúscula ("add", "fix", "remove"…), sin punto final, idealmente ≤ 72 caracteres en total. Qué se hizo, no cómo. Si hace falta el porqué, va en el cuerpo del commit (línea en blanco y párrafo).
- Commits **pequeños y lógicos**: una idea por commit. Incluir el trailer de atribución indicado por el entorno.
- Ejemplos: `[api] feat: add JWT login endpoint for the admin panel` · `[web] fix: keep focus ring from being clipped in quote steps` · `[docs] docs: record environment flags in STATE.md`.
- Los commits anteriores a esta regla (en español) no se reescriben.

**No hay panel web de administración.** El "panel" de Luis es la **app móvil Android** (`app/`): sube y oculta proyectos, fotos y videos, y atiende las cotizaciones con notificación push. Plan completo, requisitos y decisiones en `docs/plan-app-movil.md`; la web pública sigue sin login.

### Reglas de la app (`app/`)

- **Flutter + Riverpod** (`flutter_riverpod`, `AsyncNotifier`), solo Android, paquete `pe.seima.app`, nombre **SEIMA**, trato de **tú**.
- **La app nunca se conecta a la base de datos: todo pasa por la API.** Los archivos van directo a Cloudinary con firma que entrega la API.
- Configuración (URL de la API y Firebase) solo en `app/.env` (con `app/.env.example` al día); nunca en el código ni en git.
- Diseño igual a la web (colores, Archivo, controles sin borde) y **usabilidad para alguien sin conocimientos de tecnología**: una cosa por pantalla, botones ≥ 56 dp, palabras simples, sin gestos escondidos.
- Videos: subida en segundo plano y solo con Wi-Fi por defecto; recorte y compresión en el celular.
- **Cambiar el orden de una lista = arrastrar** desde un asa «⋮⋮» visible (no flechas ▲▼). Se ve al instante y se guarda después (si falla, se restaura y se avisa). Excepción por ahora: las fotos de cada etapa de una obra siguen con flechas.

## Stack

- **web/** — Astro + islas de React solo donde hay interactividad real (cotizador, filtros del catálogo). Todo lo demás, componentes `.astro`.
- **api/** — Express (Node) + **TypeScript** + **TypeORM** + PostgreSQL. Fotos en **Cloudinary**; la base de datos guarda solo public_ids. Arquitectura por módulos, migraciones automáticas y JWT para el panel (ver "API" más abajo y `api/README.md`).
- **app/** — Flutter + Riverpod (Android). Firebase Cloud Messaging para las notificaciones (la API las envía con `firebase-admin`).
- Hosting de pruebas: Render.
- La web pública no tiene autenticación; la app de Luis entra con usuario y contraseña (JWT con sesión larga) y huella opcional.

## API (reglas de arquitectura, obligatorias en `api/`)

- **Un módulo por entidad/área** en `api/src/modules/<nombre>/`, con capas: `entity` → `repository` → `service` → `controller` → `routes` (+ `schemas` Zod e `index.ts` que los arma). **Solo el repository usa TypeORM**; el service tiene la lógica de negocio y no conoce Express; el controller no tiene lógica.
- **TypeScript + TypeORM, sin SQL crudo** (QueryBuilder o repositorios). Cada `@Column` lleva su `type` explícito (`tsx` no emite metadatos de decoradores). Entidad nueva → añadirla a `database/entities.ts`.
- **La estructura de la base solo cambia por migraciones** generadas con `npm run migration:generate`. `synchronize` queda apagado siempre. Nunca se edita una migración ya aplicada: se crea otra.
- **Base y schema configurables por entorno:** `DB_NAME` + `DB_SCHEMA` (PostgreSQL; `public` por defecto) o `DATABASE_URL` + `DB_SCHEMA`. Las migraciones no escriben el schema a mano; `migration:run` crea el schema si falta.
- **Credenciales y secretos solo en archivos de entorno** (validados con Zod al arrancar), uno por entorno: `.env.dev`, `.env.qa`, `.env.pd`, `.env.test`; mantener sus `.example` al día. Nunca en el código ni en git.
- **Entornos con flag:** todos los comandos de `api/` aceptan `--env=dev|qa|pd` (`npm run migration:run -- --env=qa`); por defecto `dev`, o `APP_ENV` en Render. Los scripts pasan por `api/scripts/run.js`, que aplica guardas (en pd las escrituras piden `--yes` y los comandos destructivos están bloqueados). Un script nuevo debe usar ese ejecutor.
- **Rutas públicas de la web: sin JWT** (con validación Zod y límites de peticiones donde haya escritura). **Rutas del panel: `authenticate` + `requireRole`.**
- Validar TODO lo que entra con Zod; errores con `AppError` y el formato `{ error: { code, message, details } }`.
- Toda función o endpoint nuevo lleva su prueba en `api/tests`: **unitaria** (`tests/unit`, sin base de datos, repositorio simulado; `npm run test:unit`) para la lógica y de **integración** (`tests/integration`, con `.env.test` apuntando a una base de pruebas) para los endpoints. `npm test` corre ambas.

## Alcance de la etapa 1

1. Web pública: Inicio, Proyectos (catálogo con filtros), Ficha de proyecto, Empresas, Cotizador.
2. API mínima:
   - Todas bajo el prefijo `/api/v1`. Públicas (sin JWT):
   - `GET /categories`
   - `GET /projects?categoria=` (lista; `category` también vale)
   - `GET /projects/:slug` (ficha con fotos antes/durante/después)
   - `GET /quote-form` (servicios y preguntas del cotizador, desde la base)
   - `POST /quotes` (guarda la solicitud **como filas**: servicios, respuestas por pregunta, fotos y notas; devuelve `{ id, mensaje, creadaEn }`)
   - `POST /uploads/quote-photos/signature` (firma para que el navegador suba las fotos del cliente directo a Cloudinary)
   - Autenticación de la app: `POST /auth/login` (usuario `luis`), `POST /auth/refresh`, `POST /auth/logout`, `PATCH /auth/password`, `GET /auth/me`. El resto de rutas de la app van con `authenticate` + `requireRole`.
3. Script de **seed** para cargar proyectos (no hay panel todavía).

Modelo de datos orientativo (ajustable; **las decisiones sobre fotos están en `docs/modelo-datos.md`**: etapa, foto principal por etapa, galería): `categories`, `projects` (slug, título, distrito, área m², días, servicios, descripción, destacado, tipo de cliente; **de 1 a 4 categorías por obra** en la tabla de unión `project_categories`), `project_media` (foto o video por etapa, comparador y portada; `docs/modelo-datos.md` §4), `quotes` (tipo cliente, servicios, medidas, acabado, distrito, plazo, nombre, whatsapp, razón social/RUC opcionales, fotos [tabla `quote_photos`: public_id de Cloudinary + orden], consentimiento, estado, fecha). **Los servicios y las preguntas del cotizador son datos, no código:** tablas `services`, `questions`, `question_options`, `question_services`; cada cotización guarda `quote_services` y `quote_answers` (una fila por opción elegida, con `valor` para el dato extra que pida la opción) para poder filtrar en el panel. **Todo es pregunta → opciones → respuesta**: no se crean campos ni tablas por servicio (las medidas son la pregunta `area`; los contadores, opciones; "Otro", una opción que pide texto). Los tipos de trabajo, los servicios y las preguntas y opciones del cotizador **se gestionan desde la app de Luis** (Ajustes → «Lo que ofreces»; la base es la fuente de verdad). `catalog.data.ts` es solo el catálogo base para una base nueva y sus seeds únicamente agregan lo que falta, sin pisar lo editado.

## Reglas de contenido (no negociables)

- **Nada inventado como si fuera real**: ni testimonios, ni fotos de proyectos generadas con IA, ni cifras. Lo que falte va como placeholder visible: `[DATO REAL]`. **Excepción decidida por Sebas (2026-11-21):** el **área** y la **duración** de una obra son opcionales y, si no se cargaron, la ficha **no los muestra** (ni como `[DATO REAL]`).
- IA solo para texturas, fondos abstractos, íconos o la ilustración de la casa.
- **No mencionar facturación** (Luis tiene RUC pero no emite facturas).
- El número de WhatsApp va en variable de entorno, nunca hardcodeado.
- Textos de la interfaz en **español (Perú)**, tono cercano y profesional.
- **El cotizador habla en "nosotros"** (la marca en primera persona del plural: "te respondemos", "nos llega todo ordenado", "podemos ir a medir"). No nombra a Luis en tercera persona ahí. El nombre del dueño solo va donde corresponde (pie de página, datos de contacto).

## Dirección visual

- **Dirección C (mixta):** secciones de impacto en oscuro, catálogo y cotizador en claro.
  - Oscuro `#0E0E0E`, claro **neutro** `#FFFFFF` (grises `#F2F2F2` para superficies), rojo SEIMA `#E0283C` (texto rojo sobre claro: `#C81D30` para contraste). **Nada de crema/amarillento**: el logo es solo blanco, negro y rojo. (Antes el claro era `#F4F1EC`; cambiado el 2026-11-15.)
  - **Controles de formulario: usar el kit compartido** `web/src/components/ui` (Combobox, Field, TextInput, Chip, OptionCard, Stepper, Collapse). No crear controles nuevos desde cero. El anillo de foco (sombra roja `--ring`) **no debe recortarse**: sin `overflow` en contenedores de controles; en scrollers, dar padding para el anillo (ver STATE.md, lección 18).
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
- **El cotizador se envía con su botón "Enviar solicitud"** (no por WhatsApp): sube las fotos a Cloudinary y registra la solicitud vía `POST /quotes`; el panel la mostrará. WhatsApp es solo el canal de respuesta (botón opcional "Escríbenos" en la pantalla final). Exige aceptar el tratamiento de datos (enlace a `/privacidad`) y lleva un campo trampa anti-robots.

## Primera tarea sugerida

Una **rebanada vertical** para validar el estilo antes de construir todo: portada (casa capa por capa + títulos + tarjetas apiladas, con GSAP y Lenis reales) y una ficha de proyecto con la transición desde una tarjeta del catálogo. Datos de prueba locales; la API puede venir después.
