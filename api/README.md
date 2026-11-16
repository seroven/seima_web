# SEIMA — API

Backend de la web de SEIMA Servicios Generales. **Node + Express 5 + TypeScript + TypeORM + PostgreSQL.**
Sirve los proyectos, categorías y fotos a la web, recibe las cotizaciones y tiene lista la autenticación JWT para el panel administrativo (que es un proyecto aparte).

## Puesta en marcha

Requisitos: Node ≥ 22.12 (usar el mismo que la web: 22.23.4) y un PostgreSQL ≥ 13 (para `gen_random_uuid()`).

```bash
cd api
npm install
cp .env.dev.example .env.dev  # y completar: credenciales de la base, JWT_SECRET, etc.
createdb seima_dev            # o desde pgAdmin: una base vacía con el nombre de DB_NAME

npm run migration:run         # crea TODA la estructura de la base a partir de las migraciones
npm run seed:categories       # categorías del catálogo de proyectos
npm run seed:admin            # usuario del panel (ADMIN_EMAIL / ADMIN_PASSWORD del .env)
npm run seed:demo             # (opcional) 7 proyectos de PRUEBA con fotos ficticias

npm run dev                   # http://localhost:4000/api/v1   (recarga al guardar)
```

`DB_SCHEMA` es el schema de PostgreSQL donde se crean las tablas (por defecto `public`). Si no existe, `migration:run` lo crea solo.

`JWT_SECRET` (mín. 32 caracteres): `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"`

## Entornos: dev · qa · pd (y test)

Cada entorno tiene **su propio archivo** (todos fuera de git; cada uno tiene su `.example` como modelo):

| Entorno | Archivo | Para qué | `NODE_ENV` derivado |
|---|---|---|---|
| `dev` | `.env.dev` | Tu PC (es el predeterminado) | development |
| `qa` | `.env.qa` | Pruebas con Luis / staging en Render | production |
| `pd` | `.env.pd` | Producción | production |
| `test` | `.env.test` | Pruebas automáticas (`npm test`) | test |

**Cómo elegir el entorno en cualquier comando:** flag `--env` (después de `--` en `npm run`).

```bash
npm run dev                                  # dev (por defecto)
npm run migration:run -- --env=qa            # migraciones en QA
npm run migration:run -- --env=pd --yes      # producción exige --yes
npm run env:check -- --env=qa                # ¿qué entorno/base es? ¿conecta? ¿hay migraciones pendientes?
```

- **Prioridad:** flag `--env` → variable `APP_ENV` (así lo define Render) → `dev`. Alias: `prod`/`production` = pd, `staging` = qa.
- **Qué se lee:** `.env.<entorno>` y, si existe, `.env` como base común (el del entorno gana). Las variables ya definidas en el sistema (Render, CI) **mandan sobre los archivos**.
- **Banner:** cada comando imprime en qué entorno y contra qué base (host/nombre, sin clave) va a trabajar. Revísalo antes de cualquier cosa sensible.
- **Guardas** para no romper datos por accidente:

| Tipo | Comandos | dev | qa | pd |
|---|---|---|---|---|
| consulta | `dev`, `start`, `migration:generate`, `migration:show`, `env:check` | libre | libre | libre |
| escritura | `migration:run`, `migration:revert`, `seed`, `seed:categories`, `seed:catalog`, `seed:admin` | libre | libre | **exige `--yes`** |
| destructivo | `db:reset`, `seed:demo` | libre | **exige `--yes`** | **bloqueado** |

- Si falta o está mal una variable, la app no arranca y dice cuál (y qué archivo se leyó).
- `npm test` siempre corre con `--env=test`.

## Scripts

| Comando | Qué hace |
|---|---|
| `npm run dev` | Servidor en desarrollo con recarga |
| `npm run build` / `npm start` | Compila a `dist/` / arranca lo compilado (producción) |
| `npm run typecheck` | Revisa los tipos sin compilar |
| `npm test` | Todas las pruebas: unitarias + integración (esta parte necesita `.env.test`, ver abajo) |
| `npm run test:unit` | Solo unitarias: **sin base de datos**, ~2 s |
| `npm run test:integration` | Solo integración (API real contra la base de pruebas) |
| `npm run test:watch` | Unitarias en modo observador (se repiten al guardar) |
| `npm run migration:generate -- src/database/migrations/Nombre` | **Genera una migración comparando las entidades con la base** |
| `npm run migration:run` | Crea el schema (`DB_SCHEMA`) si falta, aplica las migraciones pendientes y **sincroniza el catálogo del cotizador** (servicios y preguntas) |
| `npm run db:schema` | Solo crea el schema si no existe |
| `npm run migration:revert` | Revierte la última migración |
| `npm run migration:show` | Muestra cuáles están aplicadas |
| `npm run migration:create -- src/database/migrations/Nombre` | Migración vacía (para datos o SQL a mano) |
| `npm run migration:run:prod -- --yes` | Igual que `migration:run` pero sobre `dist/` (despliegue; con `APP_ENV=pd` pide `--yes`) |
| `npm run env:check` | Muestra entorno/base activos y prueba la conexión |
| `npm run db:reset` | **Borra todo** y vuelve a crear la estructura (solo desarrollo) |
| `npm run seed` · `seed:categories` · `seed:catalog` · `seed:admin` · `seed:demo` | Cargas de datos (se pueden repetir sin duplicar) |

## Cómo cambiar la base de datos (flujo de trabajo)

La estructura de la base **solo cambia por migraciones** (`synchronize` está apagado siempre). Nunca se edita una migración ya aplicada.

1. Cambia una entidad (`src/modules/**/*.entity.ts`): agregar una columna, una tabla nueva…
2. Si es una entidad **nueva**, añádela a `src/database/entities.ts`.
3. `npm run migration:generate -- src/database/migrations/AgregarCampoX` → TypeORM escribe la migración con el SQL necesario.
4. **Revisa** el archivo generado.
5. `npm run migration:run` → se aplica. (En producción corre `migration:run:prod` antes de arrancar.)

> **Schema:** las tablas, los enums y la tabla `migrations` viven en `DB_SCHEMA`. Las migraciones **no deben escribir el schema a mano** (nada de `"public"."tabla"`): se aplican en el schema configurado mediante el `search_path` de la conexión. Una prueba lo vigila.

> Las entidades llevan siempre el `type` de cada columna explícito (`@Column({ type: 'varchar', length: 60 })`): `tsx` no emite metadatos de decoradores.

## Arquitectura

```
src/
  config/env.ts            Variables de entorno validadas con Zod (si algo falta, no arranca y lo dice)
  database/
    data-source.ts         Conexión TypeORM (nombres en snake_case, sin synchronize)
    entities.ts            Lista de entidades
    migrations/            Migraciones (generadas por el CLI)
    seeds/                 categories · admin · demo
  common/                  AppError · validate (Zod) · error-handler · rate-limit · logger · utilidades
  modules/<módulo>/
    <x>.entity.ts          La tabla
    <x>.repository.ts      ÚNICO lugar que usa TypeORM: consultas y escrituras
    <x>.service.ts         Lógica de negocio (no sabe de Express ni de TypeORM)
    <x>.controller.ts      Capa HTTP: lee lo validado, llama al servicio, responde JSON
    <x>.routes.ts          Rutas + validación + límites de peticiones
    <x>.schemas.ts         Esquemas Zod de entrada
    index.ts               build<Módulo>Module(dataSource): arma repositorio → servicio → controlador → rutas
  app.ts                   Ensambla Express (helmet, CORS, límites, módulos, errores)
  server.ts                Conecta la base, abre el puerto, cierre ordenado
```

Módulos: `categories`, `projects` (incluye `project_photos`), `quotes`, `auth` (usuarios del panel + JWT), `health`.

**Para crear un módulo nuevo:** copia la estructura de `categories` (el más simple), registra su `build…Module` en `app.ts` y, si tiene entidad, sigue el flujo de migraciones de arriba.

## Endpoints (todos bajo `API_PREFIX`, por defecto `/api/v1`)

### Públicos — los usa la web, **sin JWT**
| Método y ruta | Descripción |
|---|---|
| `GET /health` | Estado de la API y la base (también existe sin prefijo: `/health`) |
| `GET /categories` | Categorías activas, en orden |
| `GET /projects?categoria=&destacado=&page=&limit=` | Proyectos publicados, destacados primero. `category` también vale como alias. Cada uno trae su **portada** (`antes` y `despues`: la foto principal de la etapa). `limit` máx. 100 (por defecto 50) |
| `GET /projects/:slug` | Ficha completa: `fotos` agrupadas por etapa (`antes`, `durante`, `despues`), cada etapa ordenada, más la `portada` |
| `GET /quote-form` | **El formulario del cotizador:** los servicios activos y las preguntas de cada uno (con sus opciones). La web lo pide al cargar y arma el formulario con esto; ver "Cotizador parametrizado" |
| `POST /quotes` | Guarda la cotización **como filas** (ver abajo) y devuelve `{ id, mensaje, creadaEn }` (`mensaje` = resumen en texto). Cuerpo: `servicios` (slugs), `respuestas` (`{ pregunta: opción \| número \| [opciones] }`), `notas` (hasta 500 caracteres), `fotos` (public_id ya subidos, máx. 6), `consentimiento: true` obligatorio, `website` (campo trampa: si viene lleno se descarta en silencio). Servicios o respuestas que no existen en el catálogo → 422. Límite por IP (10/hora por defecto) |
| `POST /uploads/quote-photos/signature` | Devuelve la firma para subir las fotos **directo a Cloudinary** (`uploadUrl`, `apiKey`, `timestamp`, `folder`, `allowedFormats`, `signature`…). El API secret nunca sale del servidor. 503 si faltan las credenciales de Cloudinary. Límite por IP (20/hora) |

Cada foto: `{ id, etapa, orden, esPrincipal, pie, ancho, alto, cloudinaryId, url }`. `url` es la URL pública de Cloudinary (`f_auto,q_auto`) o `null` en los datos de prueba (ids `demo/…`).

### Cotizador parametrizado (servicios y preguntas en tablas)

Nada de lo que pregunta el cotizador está escrito en el código de la web: vive en la base, para poder filtrar cotizaciones en el panel.

| Tabla | Qué guarda |
|---|---|
| `services` | Servicios que se pueden pedir (cocina, baño…) |
| `questions` | Preguntas (`tipo`: `unica`, `multiple` o `numero`; `etiqueta` corta para resúmenes; `min`/`max` si es número) |
| `question_options` | Opciones de cada pregunta |
| `question_services` | En qué servicios se hace cada pregunta (una pregunta puede servir a varios: el acabado se pregunta una sola vez) |
| `quote_services` | Servicios que pidió cada cotización |
| `quote_answers` | **Una fila por respuesta**: cotización + pregunta + opción (o `valor_numero`). Una pregunta múltiple genera una fila por opción |
| `quote_photos` | Fotos de cada cotización |
| `quotes` | Datos generales: cliente, medidas, distrito, plazo, `notas`, contacto, estado, resumen en texto |

**Cambiar una pregunta, opción o servicio:** edita `src/database/seeds/catalog.data.ts` y corre `npm run migration:run` (o `seed:catalog`). Es idempotente: actualiza lo que existe y agrega lo nuevo por `slug`; **no borra** (hay respuestas guardadas que apuntan a esas filas; para retirar algo, `activo = false`). El formulario de la web lo toma solo, sin tocar su código. Una prueba (`tests/unit/catalog.test.ts`) revisa que el catálogo sea coherente.

**Filtrar para el panel:** `QuotesRepository.search({ estado, servicio, respuestas: [{ pregunta, opcion | valor }], page, limit })`. Ejemplos: cocinas con mueble alto → `{ servicio: 'cocina', respuestas: [{ pregunta: 'mueble-alto', opcion: 'si' }] }`; baños de 2 → `{ respuestas: [{ pregunta: 'cantidad-banos', valor: 2 }] }`. `findByIdFull(id)` trae una cotización con servicios, respuestas (pregunta y opción), y fotos.

**Fotos del cotizador:** la web pide la firma, sube cada foto a Cloudinary (`multipart` a `uploadUrl` con `file`, `api_key`, `timestamp`, `folder`, `allowed_formats`, `signature`) y luego manda los `public_id` que devuelve Cloudinary en `POST /quotes`. Requiere `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY` y `CLOUDINARY_API_SECRET` en el `.env` del entorno.

### Autenticación del panel
| Método y ruta | Descripción |
|---|---|
| `POST /auth/login` | `{ email, password }` → `{ token, tokenType: "Bearer", expiresIn, usuario }`. Límite contra fuerza bruta (10 cada 15 min) |
| `GET /auth/me` | Requiere `Authorization: Bearer <token>`. Ejemplo de ruta protegida |

**Proteger una ruta del panel:**
```ts
router.get('/quotes', auth.authenticate, requireRole('admin'), controller.list);
```
El JWT (HS256) lleva `sub` (id), `rol`, `iss` y `aud`; se verifica firma, vencimiento, emisor y audiencia, y además se consulta que el usuario siga **activo** (si lo desactivan, su token deja de servir al instante).

### Formato de respuestas
- Éxito: `{ "data": … }` (las listas añaden `meta: { page, limit, total, totalPages }`).
- Error: `{ "error": { "code": "VALIDATION_ERROR", "message": "…", "details": [...] } }`. Códigos: `BAD_REQUEST` 400 · `UNAUTHORIZED` 401 · `FORBIDDEN` 403 · `NOT_FOUND` 404 · `VALIDATION_ERROR` 422 · `RATE_LIMITED` 429 · `INTERNAL_ERROR` 500.

## Seguridad
- **Secretos solo en `.env`** (nunca en el código ni en git; `.env.example` es el modelo).
- `helmet`, CORS con lista blanca (`CORS_ORIGINS`), cuerpo máx. 100 kB, límites de peticiones en `/quotes` y `/auth/login`.
- Todo lo que llega se valida con Zod; las contraseñas se guardan con bcrypt; el login no revela si el correo existe; los logs ocultan tokens y contraseñas.
- En producción los errores 500 no muestran detalles internos.

## Pruebas

Dos proyectos de Vitest (`vitest.config.mts`):

| | `tests/unit` | `tests/integration` |
|---|---|---|
| Qué prueba | Una pieza aislada: servicios, mapper, esquemas Zod, JWT, middlewares, mensaje de WhatsApp, ejecutor de entornos | La API completa (HTTP → base real) |
| Base de datos | **No** (repositorios simulados) | Sí, la de `.env.test` |
| Configuración | Ninguna: `tests/unit/setup.ts` fija lo mínimo y **no lee ningún `.env`** | `.env.test` |

Reglas: toda función o endpoint nuevo lleva su prueba. La lógica (service, mapper, esquemas, utilidades) se prueba **unitariamente** con un repositorio falso (ver `tests/unit/fakes.ts` y los ejemplos en `quotes.test.ts`); los endpoints, además, en integración.

### Pruebas de integración
```bash
cp .env.test.example .env.test   # (npm test corre con --env=test) apuntar a una base DISTINTA, con "test" en el nombre (se BORRA en cada ejecución)
createdb seima_test
npm test
```
Cada ejecución vacía la base de pruebas, la reconstruye con `migration:run` y carga datos mínimos: así se comprueba también la automatización de la base. Se niega a correr si el nombre de la base no contiene `test`.

## Despliegue (Render) — pendiente de configurar
- Un servicio de Render por entorno (qa y pd), cada uno con su base y sus variables definidas en el panel (no se sube ningún `.env`).
- Build: `npm install && npm run build` · Pre-deploy: `npm run migration:run:prod -- --yes` · Start: `npm start`
- Variables: `APP_ENV=qa` (o `pd`), `DATABASE_URL` (la entrega Render), `DB_SSL=true`, `TRUST_PROXY=true`, `JWT_SECRET`, `CORS_ORIGINS` (URL de la web), `CLOUDINARY_CLOUD_NAME`.
- Health check: `/health`.

## Pendiente (ver `STATE.md`)
Endpoints del panel (CRUD de proyectos, subida de fotos a Cloudinary, revisión de cotizaciones), conectar la web a la API, refresh tokens si hacen falta, despliegue.
