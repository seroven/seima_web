# Plan — App móvil para Luis (proyectos y cotizaciones)

> Estado: **plan aprobado el 2026-11-21** (secciones 10 y 11 resueltas). Fases 0 y 1 (API) hechas; la migración ya corrió en la base local. En la app ya hay login, fotos, videos, comparación y portada. Faltan el recorte, la subida en segundo plano y el deslizador.
> Es la parte importante: Luis (no Sebas) sube los proyectos, fotos y videos, y atiende las cotizaciones. Reemplaza al "panel administrativo" que el brief dejaba fuera de alcance (la app **es** el panel de Luis).
> Lo decidido ya está reflejado en `docs/brief.md`, `docs/modelo-datos.md` §4 y `CLAUDE.md` (alcance, carpeta `app/`, etiqueta de commit `[app]`).

## 1. Objetivo y criterio de éxito

Luis, sin conocimientos de tecnología, **crea y publica un proyecto con fotos y videos desde su celular, solo y sin ayuda**, y **se entera y responde a las cotizaciones que le llegan**.

Criterio de éxito (se prueba con él, mirándolo sin intervenir): publica un proyecto completo en menos de 10 minutos la primera vez, y abre una cotización nueva desde la notificación sin que nadie le explique.

## 2. Requisitos

1. App **Android** (solo Android), en **Flutter + Riverpod**, con el diseño de la web y muy fácil de usar. Se instala por APK, **no va a Play Store**. Nombre: **SEIMA**.
2. **Toda comunicación de datos pasa por la API.** La app **nunca** se conecta a la base de datos. (Los archivos de foto/video van directo a Cloudinary, firmados por la API; ver 3.5.)
3. Subir proyectos: datos, descripción, fotos **y videos**, por etapa (antes / durante / después). Los videos pueden estar también en las galerías.
4. La orientación de cada foto o video **se calcula** (Luis no elige nada).
5. **Comparación antes/después (principal):** puede ser de fotos o de videos, con recorte de video. **Restricción:** los dos son ambos fotos o ambos videos, y ambos verticales u ambos horizontales.
6. **Comparador en la web según orientación:** vertical (foto o video) → **lado a lado**; horizontal (foto o video) → **deslizador**.
7. **Portada** (la que se ve en la tarjeta del catálogo y de la portada de la landing): Luis **elige obligatoriamente una foto para "antes" y una para "después"**. Solo fotos. **Ya no hay rotación.**
8. **Mínimo para publicar:** comparación hecha + al menos un archivo en cada etapa (antes, durante y después) + portada elegida.
9. **Usuario y contraseña** al entrar (`luis`), sesión larga y **huella** opcional.
10. **Ocultar proyectos:** siguen visibles en la app con la etiqueta "Oculto"; en la web no se muestran ni se renderizan.
11. **Cotizaciones en la app:** ver, filtrar, cambiar de estado, escribir al cliente por WhatsApp, y **notificación push** cuando llega una nueva (Firebase).
12. **Subidas de video en segundo plano** y **solo con Wi-Fi** por defecto (se puede cambiar en Ajustes).
13. Videos: comparador ≤ 15 s, galería ≤ 60 s, ≤ 50 MB tras comprimir; si el video excede el tope, la app **obliga a recortarlo** hasta que entre.
14. Cloudinary: plan gratuito por ahora (por eso los topes).

## 3. Decisiones de diseño técnico

### 3.1 Orientación: se saca del código
- Cloudinary devuelve `width` y `height` (foto y video); la app también los lee antes de subir.
- `orientacion` = `horizontal` si ancho ≥ alto (el cuadrado cuenta como horizontal), `vertical` si no. **Se calcula**, no se guarda como campo (no puede contradecirse).
- Los videos de celular traen una rotación en los metadatos: se usan las dimensiones **ya rotadas** y se prueba con un video grabado en vertical.

### 3.2 Recorte y compresión de video: en el celular, antes de subir *(propuesta; ver duda B)*
- Como la app es **solo Android**, el recorte y la compresión se hacen **en un solo paso nativo** (Media3 Transformer, con aceleración por hardware, expuesto a Flutter con un canal de plataforma en Kotlin). Sale un archivo ya recortado y comprimido (máx. 1080p, bitrate acotado).
- La interfaz de recorte es propia (reproductor + barra con dos manijas grandes + "Probar"). Si el video supera el tope (15 s o 60 s), el rango **queda limitado** y Luis solo puede mover la ventana hasta que entre.
- Ventajas: sube solo lo útil (menos datos y almacenamiento del plan gratuito), la web no necesita transformaciones de recorte, no depende de FFmpeg (`ffmpeg_kit` fue retirado).
- Costo: el recorte **no se puede cambiar después** sin volver a elegir el video original del teléfono (el servidor solo tiene el tramo).
- Si los dos videos del comparador duran distinto, la app propone por defecto la **misma duración** (para que el bucle se vea sincronizado).

### 3.3 Modelo de datos (migraciones, nunca a mano)
- **`project_photos` → `project_media`**. Campos: `etapa`, `tipo` (`foto` | `video`), `cloudinary_id`, `orden`, `pie`, `ancho`, `alto`, `duracion_ms` (solo video), `es_principal` (**comparador**, solo `antes`/`despues`), `es_portada` (**portada**, solo foto de `antes`/`despues`), `estado` (`subiendo` | `listo`).
  - Únicos parciales: una `es_principal` por (proyecto, etapa) y una `es_portada` por (proyecto, etapa). `(project_id, etapa, orden)` único como hoy.
  - Las fotos de prueba migran como `tipo = foto`, `estado = listo`.
- **`projects.publicado` (booleano) → `projects.estado`** (`borrador` | `publicado` | `oculto`). La web y la API pública solo ven `publicado`; una ficha oculta responde 404.
- **`admin_users`**: ya existe (correo, hash bcrypt, rol, activo, último acceso). Se agrega `usuario` (único; `luis`) y `nombre`; el correo pasa a opcional.
- **`refresh_tokens`** (nueva): hash, usuario, dispositivo, vence, revocado.
- **`device_tokens`** (nueva): token de Firebase por dispositivo y usuario, para las notificaciones.
- `quotes` ya tiene `estado` (`nueva` · `contactada` · `cerrada` · `descartada`); se reutiliza.
- **API pública:** `GET /projects` entrega `portada` = `{ antes, despues }` (public_id de las dos fotos de portada). `GET /projects/:slug` entrega `medios` agrupados por etapa (cada uno con `tipo`, `orientacion` calculada, `ancho`, `alto`, `duracion`, `url`/`poster`) y el par `comparador`.
- **Reglas que valida la API (no solo la app):**
  - **Comparador:** `PUT /projects/:id/comparador { antesId, despuesId }`, **una sola operación atómica**; mismo `tipo` y misma `orientacion`; ambos `listo`.
  - **Portada:** `PUT /projects/:id/portada { antesId, despuesId }`; ambas son `foto`, de su etapa, del mismo proyecto.
  - **Publicar** (`estado = publicado`): comparación hecha, ≥ 1 medio `listo` en cada etapa, portada elegida y ningún medio en `subiendo`.
  - Un medio que es comparador o portada no se borra sin reemplazarlo antes (error claro).
  - **Consecuencia:** como la portada es solo foto, un proyecto con comparador de videos igual necesita **al menos una foto en antes y otra en después**.

### 3.4 Autenticación
- Hoy: `POST /auth/login`, `GET /auth/me`, JWT de 8 h, sin refresh. Se agregan `POST /auth/refresh` (rotación y detección de reuso) y `POST /auth/logout`; sesión de ~60 días y revocable.
- **Huella:** la app guarda el refresh token en el almacén seguro de Android (`flutter_secure_storage`) y lo desbloquea con `local_auth`. La huella **no viaja al servidor**. Sin biometría en el teléfono: sesión larga y PIN del sistema opcional.
- Usuario `luis`; el seed lo crea. Contraseña inicial: `123456` en **dev y qa** (pedido de Sebas); en **pd** la toma de la variable de entorno `ADMIN_PASSWORD`, que elige Sebas. Cambiar contraseña desde Ajustes. Límite de intentos en el login.
- Si se pierde el celular: se revocan las sesiones; la contraseña se restablece con un comando (`seed:admin`), sin flujo de correo.
- Rutas del panel con `authenticate` + `requireRole`.

### 3.5 Subida de archivos (segundo plano y Wi-Fi)
- Flujo por archivo: (1) la app pide a la API **crear el medio** (`estado = subiendo`) y recibe la **firma**; (2) sube **directo a Cloudinary** (foto = `image`, video = `video`) con la firma; (3) avisa a la API que terminó (`estado = listo`, con ancho/alto/duración que devolvió Cloudinary); la API verifica la carpeta del `public_id` (`seima/projects/<proyecto>`).
  - *"Todo por la API":* la API decide, firma y registra; el archivo viaja directo a Cloudinary porque pasarlo por la API (en Render) ahogaría el servidor con videos. La app no toca la base de datos en ningún caso.
- **Segundo plano real:** subidas con **WorkManager** (continúan con la app cerrada y sobreviven a reinicios), con **notificación de progreso** ("Subiendo 2 de 5") y **subida por partes** de Cloudinary (reanuda donde se cortó).
- **Red:** fotos con cualquier conexión; **videos solo con Wi-Fi** (restricción de red sin límite de datos de WorkManager) activado por defecto, con interruptor en Ajustes. Mientras esperan Wi-Fi, los videos aparecen como "Esperando Wi-Fi".
- En cada miniatura, un estado en palabras: *Subiendo · Esperando Wi-Fi · Listo · No se pudo (Reintentar)*.
- Fotos: se reducen a ~2000 px antes de subir.
- Borrar un medio en la app también lo borra de Cloudinary (la API usa su secret).

### 3.6 Notificaciones push y cotizaciones
- **Firebase Cloud Messaging.** La API usa `firebase-admin` con una cuenta de servicio; credenciales **solo en `.env`**, validadas con Zod al arrancar: `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY` (modelos en los `.env.*.example`). La app lee su configuración de Firebase de **`app/.env`** (`FIREBASE_API_KEY`, `FIREBASE_APP_ID`, `FIREBASE_MESSAGING_SENDER_ID`, `FIREBASE_PROJECT_ID`, más `API_URL`) con `flutter_dotenv` y arranca con `Firebase.initializeApp(options: …)`, **sin `google-services.json`**. `app/.env.example` lista las variables; **Sebas llena el `.env` real** (fuera de git). Paquete Android: `pe.seima.app`.
- Al llegar una cotización (`POST /quotes`), después de guardarla, la API envía la notificación **sin que un fallo del push rompa el envío del cliente**. Texto sin datos sensibles ("Nueva cotización: Cocina, Miraflores"); al tocarla, abre ese detalle.
- Endpoints (con login): `POST /devices` y `DELETE /devices/:token` (token de Firebase); `GET /quotes` (filtros por estado/servicio, paginado), `GET /quotes/:id` (respuestas por pregunta, notas, fotos del cliente, mensaje), `PATCH /quotes/:id/estado`. Se apoya en `QuotesRepository.search`, que ya existe.
- En la app: lista de cotizaciones con insignia de "nuevas", detalle legible, botones grandes **"Escribir por WhatsApp"** (abre `wa.me` con el número del cliente) y **"Llamar"**, y cambiar el estado con botones ("Ya la contacté", "Cerrada", "Descartar").
- Android 13+: la app pide el permiso de notificaciones con una explicación simple.

### 3.7 Stack de la app
- **Flutter** + **Riverpod** (`flutter_riverpod` + `riverpod_generator`, `AsyncNotifier`), `go_router`, `dio` (con interceptor de refresh), `freezed` + `json_serializable`, `firebase_messaging`, `local_auth`, `flutter_secure_storage`, `workmanager`, `video_player`, `image_picker`/`photo_manager`, `url_launcher`, `flutter_dotenv`.
- Código nativo en Kotlin solo para recorte+compresión de video (y lo que WorkManager necesite).
- Carpeta `app/` en el repo; etiqueta de commit `[app]`. Dictado por voz: el micrófono del teclado de Android alcanza; se evalúa un botón propio si hace falta.

## 4. Diseño y usabilidad (para alguien que no es de tecnología)

**Principios**
- **Una cosa por pantalla**, con una acción principal bien grande.
- Botones de **mínimo 56 dp**, texto base ≥ 18 sp, contraste AA, respeta el tamaño de letra del teléfono.
- **Palabras de él, no de sistema:** "Antes / Durante / Después", "Portada", "Publicar", "Ocultar"; nunca "etapa", "upload", "principal", "slug", "orientación". Trato de **tú**.
- **Íconos siempre con texto.** Sin gestos escondidos.
- **Guardado automático** y **Deshacer** en vez de "¿Seguro?".
- Errores en lenguaje humano ("No hay Wi-Fi. Tu video se subirá apenas te conectes.").
- **Nunca pedirle lo que el sistema sabe** (orientación, slug, tamaños, orden por defecto).

**Aspecto = la web:** fondo `#0E0E0E` en inicio y detalle, superficies `#FFFFFF`/`#F2F2F2` en formularios, rojo `#E0283C` para la acción principal (`#C81D30` para texto rojo sobre claro), **Archivo** ancha y pesada en títulos (eje `wdth` ~118, peso 800–900), controles **sin borde** (estados con tono de fondo), mismos radios, foco visible. Español (Perú).

**Navegación:** barra inferior con **Proyectos · Cotizaciones · Ajustes**; "Cotizaciones" lleva la insignia de nuevas.

**Pantallas**
1. **Entrar:** usuario, contraseña (con ojo), "Entrar". Después: "Usa tu huella".
2. **Mis proyectos:** tarjetas con portada, nombre y etiqueta **Publicado** / **Borrador** / **Oculto**. Botón fijo **"+ Nuevo proyecto"**.
3. **Datos del proyecto:** nombre, tipo de trabajo (tarjetas con ícono = categorías), distrito (lista con buscador), tipo de cliente (Persona/Empresa), área y días (opcionales), servicios (chips), descripción. Se guarda como borrador al continuar.
4. **Pantalla del proyecto (centro de todo):** lista de pasos con palomitas, tarjetas grandes: ① **Antes** · ② **Durante** · ③ **Después** · ④ **Comparación** · ⑤ **Portada** · ⑥ **Publicar** (dice qué falta). Arriba, menú **Ocultar / Mostrar**.
5. **Agregar al Antes/Durante/Después:** "Elegir de la galería" / "Tomar ahora", selección múltiple, miniaturas con estado de subida, ✕ y orden con ▲▼. Los videos muestran la duración y piden recorte si pasan de 60 s.
6. **Comparación:** dos mitades ("Antes" y "Después"); toca cada una y elige de lo subido. Si es incompatible (foto con video, o vertical con horizontal) **se explica en una frase** ("Para compararlos, los dos deben ser videos verticales."). Si son videos, pasa a **Recortar** (máx. 15 s). Termina con una **vista previa idéntica a la web** (deslizador o lado a lado).
7. **Recortar video:** reproductor, dos manijas grandes, "Probar", "Listo", aviso del máximo.
8. **Portada:** dos casillas: "Foto de ANTES" y "Foto de DESPUÉS"; elige entre las **fotos** de cada etapa (si la comparación ya son fotos, se **propone esa misma pareja**). Vista previa de la tarjeta, con el "antes" al pasar el dedo/mouse como en la web.
9. **Publicar:** resumen y botón rojo "Publicar" (o "Guardar como borrador"). Éxito con botón **"Compartir por WhatsApp"**.
10. **Cotizaciones:** lista (nuevas arriba), detalle, WhatsApp, Llamar y estados (ver 3.6).
11. **Ajustes:** cerrar sesión, huella, **"Subir videos solo con Wi-Fi"** (activado), tamaño de letra, cambiar contraseña, notificaciones.

**Primera vez:** guía corta de 3 tarjetas ("Crea → Sube fotos → Publica"), saltable.

**Eliminar:** los **borradores** se pueden eliminar (con confirmación); los **publicados** solo se ocultan (duda F).

## 5. Cambios en la web

Se hacen junto con **conectar la web a la API** (pendiente de antes): reemplazar `web/src/data/projects.ts` por `GET /projects`.

**Comparador principal (según el par):**
| Par | Escritorio | Celular |
|---|---|---|
| **Horizontal** (fotos o videos) | Deslizador, como hoy | Deslizador |
| **Vertical** (fotos o videos) | **Lado a lado** | Deslizador *(duda A)* |

- Los dos videos se reproducen **sincronizados**, mudos, en bucle y sin controles.
- El cambio escritorio/celular se hace **por ancho de pantalla (CSS)**, no detectando el dispositivo.
- El contenedor del comparador adapta su proporción a la orientación.

**Mosaico de la ficha:** reparte tamaños con `ancho`/`alto` (vertical/horizontal) sin saltos de diseño. Los videos se ven con vista previa muda en bucle (o póster con play) y se abren con sonido en el visor.
**Visor / modo presentación:** soporta videos.
**Tarjeta del catálogo y portada de la landing:** muestran la **foto de portada de "después"** y, al pasar el mouse / mantener presionado, la de **"antes"** (como hoy; **sin rotación**).
**Ocultos:** la API pública no los devuelve y la ficha da 404 (no se renderiza).
**Open Graph:** imagen = portada de "después".
**Rendimiento:** videos con `f_auto,q_auto`, póster, `preload="none"` fuera de pantalla.

## 6. Fases

| # | Fase | Contenido | Entrega verificable |
|---|---|---|---|
| 0 | Decisiones | **Hecha (2026-11-21):** dudas resueltas; `CLAUDE.md`, `brief.md` y `modelo-datos.md` actualizados; guía de Firebase en la sección 12 | Documentos al día |
| 1 | **API** | **Hecha (2026-11-21).** Migraciones, auth móvil, CRUD de medios, reglas, cotizaciones, dispositivos y push. La migración ya corrió en la base local. Falta Firebase y el deploy | `npm test` verde en `seima_test` |
| 2 | **App — base** | **En código (2026-11-21).** Proyecto Flutter, tema, `go_router`, `dio` con refresh, login, huella, navegación y registro del dispositivo. Falta el celular | Entra con usuario/huella en un Android real y recibe una notificación de prueba |
| 3 | **App — proyecto y medios** | **En curso (2026-11-21).** Lista, borrador, fotos y videos por etapa (tope 1 min y 50 MB; Wi-Fi si el ajuste está activo). Faltan recorte y WorkManager | Sube fotos y videos reales a Cloudinary con la app cerrada |
| 4 | **App — comparación, portada y publicar** | **En curso (2026-11-21).** Se elige el par, con la frase si no combina, y la portada (propone las fotos de la comparación). Vista previa lado a lado. Faltan el deslizador y compartir | Publica un proyecto completo |
| 5 | **App — cotizaciones** | Lista, detalle, estados, WhatsApp/llamar, push que abre el detalle | Llega una cotización desde la web y Luis la atiende desde la notificación |
| 6 | **Web** (en paralelo con 3–5) | Conectar a la API; comparador (lado a lado / deslizador); mosaico y visor con video; portada antes/después; ocultos; OG | Lo publicado en la app se ve bien en celular y escritorio |
| 7 | **Prueba con Luis** y pulido | Prueba observada, ajustes, entrega del APK | Luis publica y atiende solo |

Orden: **API primero**; luego app y web en paralelo.

## 7. Pruebas

- **API:** unitarias (reglas del comparador, portada y publicación; refresh con rotación y reuso; orientación calculada; envío de push con Firebase simulado) e integración (endpoints, restricciones de la base, firma de subida, cotizaciones del panel), como exige `CLAUDE.md`.
- **App:** unitarias de providers, pruebas de widgets de los pasos clave y de las validaciones; **teléfono Android real** (gama media/baja, solo datos y Wi-Fi, video vertical y horizontal, corte de internet a mitad de la subida, app cerrada durante una subida, notificación con la app cerrada).
- **Web:** comparador en horizontal y vertical, celular y escritorio; video; ocultos.
- **Usabilidad:** observar a Luis sin ayudarlo y anotar dónde duda.

## 8. Riesgos

| Riesgo | Mitigación |
|---|---|
| Videos pesados y cuota del plan gratuito de Cloudinary | Recorte y compresión en el celular, topes de duración/tamaño, `q_auto`, solo Wi-Fi, vigilar el consumo |
| Subida en segundo plano interrumpida por el sistema (ahorro de batería de Android) | WorkManager + notificación de progreso + subida por partes con reanudación; instrucciones para excluir la app del ahorro de batería |
| Dimensiones de video con rotación incorrecta | Usar las que devuelve Cloudinary; probar con videos reales verticales |
| Dos videos del comparador sin sincronía | Misma duración por defecto; reproducción coordinada en la web |
| Código nativo (Kotlin) para recortar/comprimir | Alcance pequeño y aislado; probar temprano en un Android real (fase 3) |
| Contraseña débil con datos personales de clientes (teléfonos) en las cotizaciones | Ver duda C |
| Luis pierde el celular o la contraseña | Sesiones revocables; restablecer con comando |
| Notificaciones que no llegan (ahorro de batería, permisos) | Permiso explicado, prueba en la fase 2, la lista de cotizaciones siempre es la fuente de verdad |

## 9. Fuera de alcance (por ahora)
Editar el catálogo/preguntas del cotizador desde la app, estadísticas, varios usuarios con roles distintos, edición de fotos (filtros), iPhone, Play Store.

## 10. Respuestas de Sebas (2026-11-21)

1. Solo Android. 2. **Videos solo con Wi-Fi** (los datos se consumirían rápido). 3. Usuario `luis`, contraseña `123456` (no va a Play Store). 4. Sesión larga + huella opcional. 5. Trato de **tú**. 6. Videos también en galerías. 7. Portada solo con fotos. 8. Topes de video OK; **si se pasa, obligar a recortar**. 9. **Vertical (foto o video) → lado a lado; horizontal → deslizador.** 10. **Siempre comparación**; mínimo = comparación + una foto/video en antes, durante y después. 11. Cloudinary gratuito; **subidas de video en segundo plano en el celular**. 12. **Cotizaciones en la app + push (Firebase)**, parte de los requisitos; credenciales en `.env`. 13. Renombrar a `project_media` / `medios`: sí. 14. **Portada = una foto de antes + una de después, obligatoria; sin rotación.** 15. **Ocultar** (visible en la app con etiqueta "Oculto", no se muestra ni renderiza en la web). 16. Nombre **SEIMA**.
**Regla añadida:** la app no se conecta a la base de datos; todo pasa por la API.

## 11. Dudas extra (resueltas por Sebas, 2026-11-21)

- **A.** Vertical en **celular** → **deslizador** (para fotos y videos).
- **B.** Recorte y compresión **en el celular**; el recorte no se cambia después sin volver a elegir el video: **aceptado**.
- **C.** Contraseña `123456` en **dev y qa**; en **pd** sale de la variable de entorno `ADMIN_PASSWORD`.
- **D.** Con comparador de videos igual se exige **al menos una foto en antes y otra en después** (por la portada): **aceptado**.
- **E.** Paquete Android **`pe.seima.app`**. Sebas crea el proyecto de Firebase y **llena las variables**; yo dejo los `.env.example` (API y app).
- **F.** **Borradores** se pueden borrar; **publicados** solo se ocultan: **aceptado**.

## 12. Guía de Firebase (para Sebas)

1. Crear un proyecto en la consola de Firebase (plan gratuito Spark; Cloud Messaging no cuesta).
2. Agregar una **app Android** con el paquete `pe.seima.app`. De ahí salen, para **`app/.env`**: `FIREBASE_API_KEY`, `FIREBASE_APP_ID`, `FIREBASE_MESSAGING_SENDER_ID`, `FIREBASE_PROJECT_ID`.
3. En *Configuración del proyecto → Cuentas de servicio*, generar una **clave privada** (JSON). De ahí salen, para el **`.env` de la API** (uno por entorno: dev/qa/pd): `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY` (la clave va entre comillas, con los saltos de línea como `\n`).
4. No subir ni el JSON ni ningún `.env` a git.
