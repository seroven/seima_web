# Contexto del brainstorm (chat con Claude, 2026-11-15)

> Todo lo que se habló en el chat de planificación y no estaba en otros archivos. Complementa `docs/brief.md` (decisiones) y el resto de `docs/fuentes/`. Si algo choca con el brief, manda el brief.

## 1. Técnicas por sección ("Construcción en capas")

| Sección | Técnica | Por qué |
|---|---|---|
| **Portada** | Título que entra palabra por palabra; detrás, la casa se arma en capas (estructura → placas → acabado) con el scroll o al cargar. Al terminar, cada ambiente (cocina, baño, sala, techos, cochera/fachada) muestra un punto rojo que late y lleva al catálogo filtrado. | Es "Explora la casa" animado. Impacta sin depender de fotos y conecta con lo que hace Luis. |
| **Marquesina** | Franja con los servicios (DRYWALL ✦ ENCHAPADO ✦ ELECTRICIDAD ✦ MELAMINA ✦ PINTURA) en movimiento continuo. | Refuerza que "hace de todo". |
| **Servicios** | Tarjetas apiladas: al hacer scroll cada servicio queda fijo arriba y el siguiente se monta encima. | Muestra los 5 servicios sin una lista aburrida. |
| **Proyectos destacados** | Galería horizontal que avanza con el scroll vertical; cada foto entra con revelado tipo cortina. | Hace que pocas fotos se sientan como una exhibición. |
| **Catálogo** | Bento grid / grid con filtros por ambiente; al cambiar filtro las tarjetas se reacomodan con animación; al pasar el mouse (o mantener presionado en celular) la foto cambia de "después" a "antes". | Rápido de recorrer y muestra la transformación. |
| **Catálogo → ficha** | La foto de la tarjeta "vuela" y se agranda hasta ser la portada de la ficha (`transition:name`). | El efecto que más se siente "otro nivel". |
| **Ficha de proyecto** | Comparador antes/después deslizable + historia de la obra antes → durante → después que **avanza sola con el scroll** (línea roja que se llena, fotos que cambian de etapa). | Es el formato que mejor le funciona en TikTok. |
| **Cifras** | Contadores que suben al aparecer (proyectos, vistas en TikTok, m²). Solo con datos reales. | Prueba social rápida. |
| **Cómo trabajamos** | Pasos que se revelan con el scroll (scroll storytelling). | Da confianza, sobre todo a empresas. |
| **Cotizador** | Tarjetas que responden al tocarlas, barra de progreso suave, resumen que se arma en vivo y, al final, el mensaje de WhatsApp apareciendo como burbuja. | Movimiento con propósito donde se convierte. |
| **Toda la web** | Botones "magnéticos" (siguen levemente al cursor), cursor que cambia sobre las fotos ("ver"), menú que se abre a pantalla completa, subrayados que crecen al hover. | Detalles que hacen decir "esto está bien hecho". |

**No hacer:** 3D pesado, partículas, efectos que tarden en cargar. Todo debe respetar `prefers-reduced-motion` y funcionar en un celular de gama media.

## 2. Funciones clave pensadas para Luis

- **Modo presentación** en cada ficha: solo fotos a pantalla completa, deslizar con el dedo, sin menús. Para que Luis lo muestre en su celular frente al cliente.
- **Enlace propio por proyecto**, con Open Graph propio (foto, título, descripción), para mandarlo por WhatsApp ("mira, esta cocina hice en Los Olivos"). Botón "Compartir por WhatsApp" en la ficha.
- Botón en la ficha: **"Cotizar algo así"** → abre el cotizador con el servicio/categoría ya marcado.
- Dos caminos desde el inicio: **"Para tu hogar"** (personas) y **"Para empresas"**.

## 3. Cotizador paso a paso

Un paso = una pregunta. Barra de progreso + "Paso N de 6". Resumen en vivo a un lado (en celular, abajo o colapsable).

1. **¿Para quién es?** Persona / Empresa (tarjetas).
2. **¿Qué necesitas?** Selección múltiple: Cocina, Baño, Departamento completo, Divisiones/cuartos, Techo drywall, Enchapado, Electricidad, Muebles de melamina, Pintura, Local comercial.
3. **Cuéntanos del espacio** (cambia según lo elegido): largo y ancho aprox. (m) o m²; nivel de acabado con imágenes (Estándar / Corte 45° + resina / Granito o formato grande / Recomiéndame). Ejemplos de preguntas condicionales: cocina → ¿mueble alto?, ¿ya hay estructura o desde cero?; departamento → número de ambientes.
4. **¿Dónde y cuándo?** Distrito; plazo (lo antes posible / en 1 mes / sin apuro); fotos del espacio (opcional, recomendado).
5. **Tus datos:** nombre y WhatsApp. Si es empresa, además razón social y RUC.
6. **Resumen + envío:** se guarda vía `POST /quotes` y se abre WhatsApp con el mensaje prellenado.

Formato del mensaje a Luis (orientativo):

```
*Nueva solicitud · SEIMA web*
Cliente: Persona | Empresa (razón social, RUC)
Servicios: Cocina, Electricidad
Medidas: 4 x 3 m · Acabado: Corte 45° + resina
Distrito: Comas · Plazo: en 1 mes
Fotos: 3 adjuntas (enlaces)
Contacto: Nombre · 9XX XXX XXX
```

**Precios:** al inicio **no** mostrar un monto automático (si sale mal, compromete a Luis). Como mucho "desde S/ X" en algunos servicios, solo si Luis lo aprueba. Referencias que él ha dado en TikTok: "110" a "¿a todo costo?" (probablemente S/ por m², sin confirmar) y S/ 5,500 por un cuarto de 10 × 3.5 m con dos divisiones, cableado y pintura.

## 4. Página Empresas

- Hero propio + "Solicitar propuesta".
- Capacidad: proyectos de varios departamentos, obra de dos pisos, locales (clínica dental, tiendas). Cifras solo si son reales.
- Proceso: visita técnica (metrado/planos) → propuesta por partidas y plazos → avance documentado (fotos/reportes por WhatsApp) → entrega y revisión.
- **No mencionar facturación** (tiene RUC, no emite facturas). Si algún día emite facturas, se agrega.

## 5. Fotos y tratamiento visual

- Las fotos de Luis son de celular → tratamiento uniforme: tono negro/rojo (duotono) que pasa a color real al interactuar; mismos recortes, proporciones y radios.
- Empezar con **8–12 proyectos bien documentados**, no con 100.
- Checklist para cada obra nueva: foto del antes desde un ángulo fijo, 2–3 fotos durante, 4–5 del resultado desde el mismo ángulo que el antes, con buena luz, en horizontal y vertical.

## 6. Herramientas para Claude Code

- Instalar el **skill oficial de GSAP** para Claude Code.
- Instalar un skill de diseño **"anti-plantilla"** (p. ej. `frontend-design` / `design-taste-frontend`): evita degradados morados, hero centrado genérico, tres tarjetas iguales, glassmorphism en todo y microanimaciones infinitas.
- Referencias de componentes: React Bits (respeta reducir movimiento), Aceternity UI, Magic UI, 21st.dev. Usarlos como base y adaptarlos al estilo SEIMA, no tal cual.
- Prototipo de referencia (estructura y estilo): https://claude.ai/artifact/Amrrkc17uniixx4JQQCYKa — fila "Versión 2".

## 7. Pendientes con Luis (no inventar mientras tanto; usar `[DATO REAL]`)

- [ ] Número de WhatsApp del negocio (va en variable de entorno).
- [ ] Fotos de 8–12 proyectos (antes / durante / después) + distrito, m², días y servicios de cada uno.
- [ ] Testimonios **reales**: pedir por WhatsApp a 5–6 clientes una frase corta y permiso para usar su nombre/foto. No inventar frases.
- [ ] Cifras reales: proyectos entregados, años de experiencia, m² construidos.
- [ ] Si quiere publicar precios referenciales ("desde S/ X") o no.
- [ ] Confirmar que Camilin Soria (trabajadora destacada en TikTok) acepta aparecer en una sección de equipo.
- [ ] Si quiere sección "Nosotros" aparte o dentro del inicio.

## 8. Otros datos del negocio

- Dueño: **Luis Rodríguez**. Antes se promocionaba como "Acabados Finos Luisito"; hoy **SEIMA Servicios Generales** (en TikTok: @seima.drywall).
- Trabaja de forma independiente; toma proyectos directamente. Cuentas como Construya SAC, Levantan Sueños SAC, J V SAC, GDC son clientes; no destacarlas.
- Mini departamentos: los encarga público variado.
- Tono de Luis: cercano, con humor; los textos de la web pueden ser cálidos pero profesionales.
