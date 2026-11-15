# Modelo de datos — puntos decididos para cuando armemos la API

> Complementa `CLAUDE.md` (modelo orientativo) y `docs/brief.md`. Aquí van las decisiones que afectan la base de datos y que salieron del diseño de la web.
> Estado: **decidido en conversación (2026-11-15), todavía sin implementar** (la API aún no existe).

## 1. Fotos de proyecto

Cada proyecto tiene **muchas fotos**, y cada foto pertenece a una etapa: `antes`, `durante` o `despues`.

### Tabla `project_photos`

| Campo | Tipo | Notas |
|---|---|---|
| `id` | PK | |
| `project_id` | FK → `projects` | |
| `etapa` | enum `antes` \| `durante` \| `despues` | |
| `cloudinary_id` | texto | solo el `public_id`; las transformaciones (formato, calidad, tamaños) las arma la web |
| `orden` | entero | orden dentro de (proyecto, etapa) |
| `es_principal` | booleano, por defecto `false` | ver 1.1 |
| `pie` | texto, opcional | descripción corta; sirve de `alt` y pie de foto |
| `ancho`, `alto` | enteros, opcionales | evitan saltos de diseño al cargar el mosaico |
| `created_at` | fecha | |

Restricciones:
- **Una sola principal por proyecto y etapa:** índice único parcial sobre `(project_id, etapa)` donde `es_principal` es verdadero.
- Orden sin repetir: único `(project_id, etapa, orden)`.

### 1.1 Foto principal vs. fotos de detalle

- **Principal** (`es_principal = true`): la foto importante o general de esa etapa. Alimenta las piezas "de escaparate":
  - el **comparador antes/después** de la ficha (principal de `antes` + principal de `despues`);
  - la **tarjeta del catálogo** y la galería de la portada (`despues` por defecto; `antes` al pasar el mouse o mantener presionado);
  - la **imagen de portada** de la ficha y su `og:image` para compartir por WhatsApp (`despues`).
- **De detalle** (el resto): muestran el trabajo a detalle. Solo aparecen en la **galería de la etapa** dentro de "La historia de la obra".
- **Quién elige la principal:** Luis, desde el panel administrativo (cuando exista). Mientras tanto, el **seed** la marca explícitamente.
- **Si falta una principal:** la web usa la primera foto de esa etapa por `orden`. Si no hay fotos de `antes` o de `despues`, no se muestra el comparador (solo la foto disponible).
- Un proyecto puede no tener fotos de `durante`; la web debe tolerarlo (se oculta esa etapa).

### 1.2 Cómo se muestran las fotos en la ficha

- **"Historia de la obra":** tres bloques seguidos (Antes → Durante → Después), cada uno con la **galería completa de su etapa** (la principal incluida), ordenada por `orden`, en un mosaico de tamaños variados. **Sin scroll atrapado ni coreografía**: scroll normal, con una barra fija de etapas arriba (los botones saltan al bloque).
- No hay una foto principal destacada dentro de esa sección; las principales cumplen su papel en el comparador y la portada.
- Al tocar una foto se abre el **visor a pantalla completa** con todas las fotos del proyecto ordenadas por etapa y `orden`, empezando en la que se tocó (se puede seguir deslizando hacia las otras etapas). El **Modo presentación** abre ese mismo visor desde la primera foto.
- **Cantidad esperada: hasta ~10 fotos por etapa** (dato de Sebas, 2026-11-15). La web las muestra todas, sin paginar ni "+N más". Si una etapa no tiene fotos (p. ej. `durante`), el bloque y su botón no se muestran.

### 1.3 Forma sugerida de la API

- `GET /projects` (lista): por proyecto solo lo necesario para la tarjeta → `portada_despues` y `portada_antes` (public_id de las principales). No enviar todas las fotos.
- `GET /projects/:slug` (ficha): las fotos agrupadas por etapa, cada una con `id`, `cloudinary_id`, `orden`, `es_principal`, `pie`, `ancho`, `alto`:
  ```json
  { "fotos": { "antes": [ ... ], "durante": [ ... ], "despues": [ ... ] } }
  ```
- El **panel** (fuera de alcance por ahora) necesitará: subir varias fotos a una etapa, reordenar, marcar la principal y borrar.

## 2. Resto del modelo (resumen, sin cambios)

- `categories`, `projects` (slug, título, categoría, distrito, área m², días, servicios, descripción, destacado, tipo de cliente) y `quotes` siguen como en `CLAUDE.md`.
- Las fotos que sube el cliente en el cotizador se guardan como enlaces dentro de `quotes`.
- Hasta que Luis tenga fotos reales, la web usa datos de prueba locales (`web/src/data/projects.ts`) con placeholders `[FOTO REAL]` / `[DATO REAL]`.
- Empezar con **8–12 proyectos bien documentados**, no con 100 (ver `docs/fuentes/contexto-chat.md`).

## 3. Pendiente de decidir

- Si `pie` se escribe por foto o solo por etapa.
- Límite en el panel: sugerido un tope blando de ~12 fotos por etapa (el mosaico está pensado para ≤10; con más habría que paginar).

~~Cuántas fotos de detalle por etapa~~ → resuelto: hasta ~10 (ver 1.2).
