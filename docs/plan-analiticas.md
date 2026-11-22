# Plan: mediciones de visitas (analíticas propias)

Decisión de Sebas (2026-11-22): **medición propia** (opción B), que se ve **dentro de la app de Luis** y no en una herramienta externa. País **y ciudad**, pestaña nueva **«Visitas»**, sin excluir las visitas de ustedes mismos.

## Qué se mide
- **Visitas** (páginas vistas) y **visitantes** (personas distintas) por hoy / 7 días / 30 días, comparadas con el periodo anterior.
- **De dónde vienen:** Google, Facebook, Instagram, TikTok, WhatsApp, otros sitios, directo (sin origen).
- **Qué proyectos ven:** ranking de obras más vistas.
- **Qué páginas:** inicio, proyectos, empresas, cotizador.
- **Dónde están:** país y ciudad.
- **Con qué entran:** celular, computadora o tableta.
- **Qué hacen:** toques en «Escríbenos / WhatsApp» y «Compartir por WhatsApp», y cuántas **cotizaciones** llegaron (esto sale de la tabla `quotes`, no de la web).
- Gráfico de visitas por día.

## Privacidad (no negociable)
- **Sin cookies, sin `localStorage` de identificación, sin guardar la IP.** La IP solo se usa en el momento, en memoria, para (a) calcular el país/ciudad con una base de datos que va dentro de la API (no se envía a nadie) y (b) fabricar un código anónimo del visitante.
- **Código de visitante** = hash(secreto + **fecha de Lima** + IP + navegador), cortado a 32 caracteres. Cambia cada día, así no se puede seguir a una persona de un día a otro. Consecuencia honesta: **«visitantes» de un periodo largo cuenta a una persona una vez por cada día que entró** (es una aproximación, igual que hacen otras herramientas sin cookies).
- Respeta **«No rastrear»** del navegador (no envía nada) y **no se mide en `localhost`**.
- `/privacidad` lo explica con una línea honesta.
- Los robots se descartan (por el navegador que declaran) y solo se aceptan rutas conocidas de la web.

## Datos
Tabla `visits` (una fila por página vista o evento): fecha (`timestamptz`), `tipo` (`pagina` | `whatsapp` | `compartir`), `ruta`, `proyecto_slug` (sin llave foránea: si una obra se borra, el historial no se rompe), `visitante`, `origen`, `pais`, `ciudad`, `dispositivo`. Índices por fecha y por (`proyecto_slug`, fecha). Las fechas se agrupan en **hora de Lima** (`America/Lima`, sin horario de verano). Se borran filas de más de 18 meses al arrancar la API.

## API (`api/src/modules/analytics/`)
- `POST /api/v1/analytics/hit` — **público** (sin JWT), valida con Zod, **límite por IP** y responde `204`. Lo llama la web.
- `GET /api/v1/analytics/summary?periodo=hoy|7d|30d` — **app de Luis** (`authenticate` + `requireRole('admin')`). Devuelve cifras con su periodo anterior, visitas por día, proyectos, páginas, orígenes, lugares y dispositivos.
- Las cotizaciones del periodo salen de `quotes`.
- Pruebas: unitarias (reglas de rutas, origen, navegador, robots, código de visitante, rangos de Lima, servicio con repositorio simulado) e integración (el endpoint y el resumen).

## Web (`web/`)
- `scripts/analytics.ts`: en cada `astro:page-load` envía la visita con `fetch(..., { keepalive: true })` (sin esperar respuesta, sin bloquear nada). Solo manda el origen si viene de **otro** sitio (la primera página de la visita) y lee `utm_source` (para enlaces como el de la bio de TikTok: `?utm_source=tiktok`).
- Eventos con `data-evento="whatsapp" | "compartir"` en los botones.
- `/privacidad`: texto de estadísticas.

## App (`app/`)
- Pestaña **«Visitas»**: selector «Hoy · 7 días · 30 días», cifras grandes con flecha ▲▼ contra el periodo anterior, barras por día, y listas simples (proyectos más vistos, de dónde vienen, ciudades, celular vs computadora). Palabras simples, una cosa por pantalla, botones ≥ 56 dp.
- Carpeta `app/lib/visitas/` (modelos, API, `AsyncNotifier`) y `visitas_screen.dart`. **La app solo habla con la API.**

## Límites que hay que conocer
- La ciudad sale de la IP y es **aproximada**; con datos móviles a veces marca otra ciudad (o solo el país).
- Un enlace compartido por WhatsApp **casi nunca trae origen** y cuenta como «Directo»; para medirlo, usar enlaces con `?utm_source=whatsapp`.
- La base de ubicaciones (`geoip-lite`, datos MaxMind GeoLite) se actualiza solo al actualizar el paquete. Licencia **CC BY-SA 4.0**: mantener la atribución (esta línea).
- Las visitas de Luis y de Sebas también cuentan (decisión de Sebas).

## Fases
1. **API** — módulo, migración, pruebas. 
2. **Web** — envío de visitas, eventos, `/privacidad`.
3. **App** — pestaña «Visitas».
Cada fase se verifica antes de pasar a la siguiente y se registra en `STATE.md`.
