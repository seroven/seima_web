# Modelo de datos — puntos decididos para cuando armemos la API

> Complementa `CLAUDE.md` (modelo orientativo) y `docs/brief.md`. Aquí van las decisiones que afectan la base de datos y que salieron del diseño de la web.
> Estado: **implementado en `api/`** (migración `Inicial`, 2026-11-16). Las entidades están en `api/src/modules/**/*.entity.ts`; el detalle de endpoints y arquitectura, en `api/README.md`.

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

## 1.4 Cómo quedó implementado (api/)

- Tablas: `categories`, `projects`, `project_photos`, `quotes`, `quote_photos`, `admin_users` (+ `migrations`). IDs `uuid` (`gen_random_uuid()`, extensión pgcrypto). Columnas en `snake_case` (la API/entidades usan camelCase en español: `esPrincipal` → `es_principal`).
- `project_photos`: índice único parcial `uq_project_photos_principal` (una principal por proyecto y etapa) y único `(project_id, etapa, orden)`. Borrar un proyecto borra sus fotos (`ON DELETE CASCADE`).
- `projects.publicado`: el panel podrá despublicar sin borrar. ~~`projects.categoria_id`~~ pasó a la tabla de unión `project_categories` (ver §5): una categoría con obras sigue sin poderse borrar (`RESTRICT`).
- `GET /projects` entrega la **portada** por proyecto (`antes` y `despues`: la foto principal; si falta, la primera por orden) con una sola consulta extra (`DISTINCT ON`), sin mandar toda la galería. `GET /projects/:slug` entrega `fotos` agrupadas por etapa. Cada foto trae `cloudinaryId` y `url` (null si es de prueba: ids `demo/…`).
- `quotes`: datos generales (cliente, medidas, distrito, plazo, `notas`, contacto), un `mensaje` con el resumen en texto (el panel lo muestra y sirve para responder por WhatsApp), `estado` (`nueva` · `contactada` · `cerrada` · `descartada`) para que Luis las gestione desde el panel, y `proyecto_id` (`SET NULL` si borran el proyecto). **Lo específico de cada servicio ya no son columnas:** ver 1.5.
- `admin_users`: correo en minúsculas, hash bcrypt, rol, `activo` y `ultimo_acceso`.

## 1.5 Cotizador parametrizado en tablas (2026-11-16)

Decisión de Sebas: lo que el cliente elige en el cotizador debe guardarse como **campos y tablas** (no solo como texto) para **filtrar en el panel**, y el modelo debe ser **simple y fácil de mantener**, sin tablas ni campos para casos específicos, para poder agregar servicios desde el panel. Antes había columnas fijas en `quotes` (`servicios[]`, `acabado`, `mueble_alto`, `estructura`, `ambientes`, y las medidas) y el resto solo iba dentro del `mensaje`.

**Modelo final: todo es "pregunta → opciones → respuesta".** 8 tablas:

| Tabla | Columnas | Para qué |
|---|---|---|
| `services` | id, slug, nombre, icono, orden, activo | Servicios que se pueden pedir |
| `questions` | id, slug, texto, etiqueta, `tipo` (`unica` \| `multiple`), orden, activo | Preguntas |
| `question_options` | id, question_id, slug, etiqueta, descripcion, `tipo_entrada` (`ninguna` \| `texto` \| `numero`), `entrada_ayuda`, orden, activo | Opciones. Si `tipo_entrada` no es `ninguna`, al elegirla se pide un dato más (el campo aparece al tocarla y se valida) |
| `question_services` | question_id, service_id | En qué servicios se hace cada pregunta (N:M; una pregunta puede servir a varios) |
| `quotes` | id, cliente, distrito, plazo, notas, nombre, whatsapp, razon_social, ruc, proyecto_id, mensaje, consentimiento_en, estado, fechas | **Solo datos generales** (ni medidas ni nada de un servicio) |
| `quote_services` | quote_id, service_id | Servicios que pidió |
| `quote_answers` | id, quote_id, **option_id** (obligatorio), **valor** (texto) | Una fila por opción elegida; `valor` guarda el dato extra (texto o número como texto) si la opción lo pedía. La pregunta sale de la opción |
| `quote_photos` | id, quote_id, cloudinary_id, orden | Fotos |

**Cómo se resuelve lo que antes eran tipos especiales:** los contadores son opciones (baños: 1, 2, 3, 4 y "Más de 4" que pide el número); las **medidas** son la pregunta `area` ("Sé el área aproximada" → m², o "Aún no lo sé"), ligada a todos los servicios menos electricidad; "Otro" pide un texto (`melamina-muebles`, `local-tipo`). Validación (web y API, misma regla): `numero` = positivo, hasta 2 decimales, máx. 100000; `texto` = máx. 200 caracteres; la opción que pide un dato lo exige.

**La base garantiza:** un índice único `(quote_id, option_id)` impide repetir una opción en una cotización; `option_id` es obligatorio; borrar una cotización borra sus servicios, respuestas y fotos (`CASCADE`); no se puede borrar una opción con respuestas (`RESTRICT`: se desactiva con `activo`).

**Preguntas actuales (1 a 4 por servicio, con "No sé" donde aplica):** área (casi todos) · acabado (cocina, baño, enchapado, departamento) · cocina: mueble alto, estructura · baño: cuántos, retirar lo anterior (compartida con enchapado) · departamento: ambientes, vacío/habitado · divisiones: cuántas, puertas o ventanas · techo: liso/diseño, luces empotradas · enchapado: dónde · electricidad: tipo de trabajo, puntos · melamina: qué muebles (varias), diseño propio o a proponer · pintura: zona, estado de las paredes · local: tipo, en funcionamiento. Más el campo de **notas** libres (`quotes.notas`, 500 caracteres). Pendiente: que Luis revise la lista.

**Migraciones:** `CatalogAndQuoteAnswers` creó el catálogo y las respuestas y movió lo existente; `SimpleQuestionModel` simplificó el modelo (quitó `numero`/`min`/`max`, las medidas de `quotes` y `question_id` de las respuestas; agregó `tipo_entrada`, `entrada_ayuda` y `valor`) y **descartó datos de prueba que ya no caben** (respuestas numéricas y medidas). `npm run migration:run` además sincroniza el catálogo desde `api/src/database/seeds/catalog.data.ts`.

**Filtros para el panel:** `QuotesRepository.search` (estado, servicio, respuestas por pregunta + opción y/o dato extra).

**Pendiente al llegar el panel:** el seed del catálogo hoy actualiza lo existente; con panel debe limitarse a insertar lo que falta (si no, pisaría lo editado).

## 2. Resto del modelo (resumen, sin cambios)

- `categories`, `projects` (slug, título, categoría, distrito, área m², días, servicios, descripción, destacado, tipo de cliente) y `quotes` siguen como en `CLAUDE.md`.
- Las fotos que sube el cliente en el cotizador se guardan como enlaces dentro de `quotes`.
- Hasta que Luis tenga fotos reales, la web usa datos de prueba locales (`web/src/data/projects.ts`) con placeholders `[FOTO REAL]` / `[DATO REAL]`.
- Empezar con **8–12 proyectos bien documentados**, no con 100 (ver `docs/fuentes/contexto-chat.md`).

## 3. Pendiente de decidir

- Si `pie` se escribe por foto o solo por etapa.
- Límite en el panel: sugerido un tope blando de ~12 fotos por etapa (el mosaico está pensado para ≤10; con más habría que paginar).

~~Cuántas fotos de detalle por etapa~~ → resuelto: hasta ~10 (ver 1.2).

## 4. Cambios de la app móvil (2026-11-21, migrados)

La migración `AppMovil` ya aplica esto. `admin_users` ya tenía `nombre`: lo nuevo es `usuario` (único) y que el correo sea opcional.

Detalle y razones en `docs/plan-app-movil.md` §3.3. Resumen:

- `project_photos` → **`project_media`**: + `tipo` (`foto`|`video`), `duracion_ms`, `estado` (`subiendo`|`listo`), `es_portada` (solo foto de antes/después, una por proyecto y etapa). `es_principal` pasa a significar **comparador** (antes/después; mismo `tipo` y misma orientación, validado por la API). La orientación **se calcula** de `ancho`/`alto`, no se guarda.
- `projects.publicado` → **`projects.estado`** (`borrador`|`publicado`|`oculto`).
- `admin_users.usuario` (único; `luis`) y correo opcional (`nombre` ya existía). Tablas nuevas: **`refresh_tokens`** y **`device_tokens`** (Firebase).
- La **portada** del catálogo es una pareja (foto de antes + foto de después); no hay rotación.
- API pública: `fotos` → `medios`.

## 5. Varios tipos de trabajo por obra (2026-11-21)

Una obra puede tener **de 1 a 4 categorías** («Cocinas» y «Melamina»: es realista). Pedido de Sebas.

- **Tabla `project_categories`** (`project_id`, `category_id`, clave primaria compuesta), reemplaza a `projects.categoria_id` (migración `ProjectCategories`, que **mueve los datos**: cada obra conserva su categoría; el `down` devuelve la columna con la categoría principal).
- Llaves: `project_id → projects` **CASCADE** (al borrar la obra se van sus vínculos); `category_id → categories` **RESTRICT** (una categoría con obras no se borra; se desactiva con `activo`). El `RESTRICT` vive en `Category.proyectos`: en TypeORM el `onDelete` del lado propietario decide la llave de `project_id`, no la de `category_id` (ver STATE.md, lecciones).
- **Sin columna de orden:** la categoría **principal** es la primera por `categories.orden` (luego por nombre). No hay que elegirla.
- **API:** las obras traen `categorias` (todas) y `categoria` (la principal, por compatibilidad). `POST/PATCH /projects` reciben `categorias: string[]` (1 a 4, sin repetir, el campo `categoria` ya no se acepta). `GET /projects?categoria=x` devuelve las obras que tengan `x` entre las suyas y **no recorta** las categorías que se devuelven. Una obra solo sale en la web si tiene al menos una categoría activa.
- **Web:** el filtro del catálogo es por pertenencia (una obra aparece en cada filtro que tenga); la tarjeta y la ficha muestran «Cocinas · Melamina».
- **App:** el formulario deja marcar varios tipos de trabajo (tope de 4, con aviso).

## 6. Catálogo gestionado desde la app (2026-11-21)

Pedido de Sebas: poder gestionar desde la app de Luis los **tipos de trabajo**, los **servicios** del cotizador y las **preguntas y opciones** de cada servicio. No hay tablas nuevas (se usan `categories`, `services`, `questions`, `question_options`, `question_services`): lo que cambia es **quién manda**.

- **La base es la fuente de verdad.** Antes `catalog.data.ts` mandaba (el seed hacía `upsert` por `slug` y lo corría cada `migration:run`): editar desde la app habría sido pisado en la siguiente migración. Ahora los seeds (`categories`, `catalog`) **solo agregan lo que falta** por `slug`. Excepción: las filas que dejó una migración sin que nadie las tocara (`updated_at = created_at`) se completan con el catálogo base, porque las migraciones crean unas pocas preguntas con textos y orden provisionales (sin esto, una base nueva quedaba con órdenes repetidos).
- **Nada se borra:** hay obras, cotizaciones y respuestas que apuntan a estas filas. Se **desactiva** (`activo = false`).
- **El `slug` no cambia al renombrar** (la web, los enlaces `?categoria=` y las respuestas guardadas dependen de él). Se genera del nombre, sin tildes, con `-2`, `-3`… si ya existe.
- **Nombres sin repetir** (sin importar mayúsculas) entre tipos, entre servicios y entre las opciones de una misma pregunta.
- **Orden:** `orden` por tabla; las opciones se ordenan dentro de su pregunta. Las preguntas tienen un orden **global** (así se ven en el cotizador) y se acomodan **por servicio**: se reparten los mismos números de orden entre las preguntas movidas, de modo que las de otros servicios no se mueven.
- **Qué ve el cliente:** `GET /quote-form` solo trae servicios activos y preguntas activas **con al menos una opción activa**; una pregunta sin opciones no se muestra (así crear una pregunta en la app no deja un callejón sin salida).
- **Desactivar un tipo de trabajo:** una obra solo sale en la web si tiene al menos un tipo **activo**; la app avisa cuántas obras lo usan antes de desactivarlo.
- **Íconos de servicio:** la web solo dibuja los que conoce (`cocinas`, `banos`, `departamentos`, `divisiones`, `techos`, `enchapado`, `electricidad`, `melamina`, `remodelaciones`, `locales`); un servicio nuevo usa `generico` (tres capas) y la web dibuja ese mismo para cualquier ícono desconocido. Igual para un tipo de trabajo nuevo en los filtros del catálogo.
- **Limitación conocida:** la web preselecciona el servicio al venir desde una obra con un mapa fijo de slugs (`CATEGORIA_A_SERVICIO` en `web/src/lib/quote.ts`); los tipos y servicios nuevos no se preseleccionan.

## 7. Mediciones de la web (2026-11-22)

Plan completo en `docs/plan-analiticas.md`. Una tabla nueva, **`visits`** (migración `Analytics`), una fila por página vista o por toque importante de la web pública:

- `created_at` (`timestamptz`), `tipo` (`pagina` | `whatsapp` | `compartir`), `ruta` (normalizada: sin parámetros ni barra final), `proyecto_slug` (de `/proyectos/<slug>`; **sin llave foránea** para que borrar una obra no rompa el historial), `visitante`, `origen`, `pais` (ISO de 2 letras), `ciudad`, `dispositivo` (`movil` | `escritorio` | `tablet`).
- **Sin IP y sin cookies.** `visitante` = hash(secreto + fecha de Lima + IP + navegador) cortado a 32 caracteres: cambia cada día, no se puede deshacer. País y ciudad salen de la IP con una base que viaja dentro de la API (`geoip-lite`, datos MaxMind GeoLite, licencia CC BY-SA 4.0); la IP solo vive en memoria durante la petición.
- Índices: `idx_visits_creado` (`created_at`) e `idx_visits_proyecto_creado` (`proyecto_slug`, `created_at`).
- Los días se agrupan en **hora de Lima** (`America/Lima`). Se borran las filas de **más de 18 meses** cada vez que arranca la API.
- Las **cotizaciones** que se muestran en el resumen salen de `quotes` (no de `visits`).
