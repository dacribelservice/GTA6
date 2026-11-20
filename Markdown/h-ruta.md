# Hoja de Ruta — Mejoras y Soporte Táctil Móvil (`edificio/visor-mapa.js`)

Este documento registra las tareas técnicas puntuales de optimización y experiencia móvil fuera de la checklist principal (`mapa.word.md`), respetando la **Regla de Oro (≤ 250 líneas por archivo)** y los límites específicos de cada componente.

---

## Fase 1: Zoom Táctil con Dos Dedos (*Pinch-to-Zoom*) y Estabilidad Móvil
*Objetivo: Permitir acercar, alejar y mover el mapa con dos dedos en teléfonos y tablets a 60 FPS sin saltos ni reinicios de zoom.*

- [x] **1.1** Implementar rastreo multi-toque (`Map` por `pointerId`) en `edificio/visor-mapa.js` (**≤ 200 líneas**) usando Pointer Events nativos (0 librerías) para distinguir entre arrastre con 1 dedo y pellizco con 2 dedos.
- [x] **1.2** Calcular en tiempo real la distancia entre ambos dedos (`Math.hypot`) y su punto medio `(mx, my)` para ejecutar zoom + desplazamiento simultáneo en `requestAnimationFrame` a 60 FPS, recalibrando el origen al soltar un dedo para evitar saltos.
- [x] **1.3** Ajustar el evento `resize` en `edificio/visor-mapa.js` (**≤ 200 líneas**) para actualizar `rectCache` sin resetear la posición ni el zoom actual cuando se abre el teclado del buscador o cambia la barra de direcciones en celular.
- [x] **1.4** 🛡️ **CONTROL DE CALIDAD (Vigilante):** Ejecutar `node vigilante/auditor.js` confirmando que `edificio/visor-mapa.js` sigue con **≤ 200 líneas** y todo el proyecto marca **0 errores**.
- [x] **1.5** 🛡️ **CONTROL DE CALIDAD (Run & Test Móvil + PC):** Probar en `http://localhost:5000` (emulación táctil móvil y escritorio) el pellizco de 2 dedos, transición a 1 dedo sin saltos, apertura del teclado del buscador sin perder el zoom y **0 errores** en consola.
- [x] **1.6** Subir copia de seguridad a **GitHub** (`git push`) para desplegar en **Vercel** y confirmar el funcionamiento del pellizco en un celular real.

---

## Fase 2: Visibilidad Total en Modo Atlas y Nitidez Retina 1:1 en Celular (iOS / WebKit + PC)
*Objetivo: Evitar que las teselas HD tapen los iconos al pasar de 132% en modo Atlas, y eliminar por completo el desenfoque/pixelado tanto de los iconos SVG como del mapa HD al hacer zoom profundo en iPhone (WebKit) y escritorio, manteniendo 60 FPS y 0 librerías.*

### Bloque A — Aislamiento de Capas (`z-index` / *Stacking Context* en Modo Atlas)
- [x] **2.1** Corregir el apilamiento de capas en `edificio/edificio.css`: aplicar `isolation: isolate; z-index: 1;` sobre `#capa-terreno` (para encapsular las teselas HD `z-index: 13..16` incluso cuando `--filtro-mapa: none` en modo **Atlas**), `z-index: 20` en `#capa-regiones-etiquetas`, `z-index: 2` en `#capa-iconos` y `z-index: 3` en `#capa-pines`.
- [x] **2.2** Verificar que en los 3 modos visuales (**Atlas**, **Radar** y **Satélite**) todos los iconos y etiquetas de región permanezcan siempre visibles por encima de las teselas HD a partir de `132%` y hasta el zoom máximo.

### Bloque B — Iconos SVG y Etiquetas en Resolución Nativa 1:1 (Fin del Desenfoque de Iconos en iOS)
- [x] **2.3** Sacar `#capa-iconos`, `#capa-pines` y `#capa-regiones-etiquetas` fuera de la transformación `scale()` de `#lienzo-mapa` en `index.html` y `edificio/edificio.css`, ubicándolos como capas hermanas dentro de `#escenario-mapa` a escala nativa `1:1` de pantalla (sin `will-change: transform` + `scale(16)` heredado del padre).
- [x] **2.4** En `edificio/visor-mapa.js`, incluir `tx`, `ty`, `escala` y `tamanoBase` dentro del evento `edificio:vista-cambiada` (emitido en cada frame de `requestAnimationFrame` durante arrastre/pellizco/animación) y reposicionar las etiquetas de región en píxeles reales de pantalla: `px = tx + (reg.x / 100) * TAMANO_BASE * escala`, `py = ty + (reg.y / 100) * TAMANO_BASE * escala`.
- [x] **2.5** Actualizar `locales/01-iconos-mapa/iconos-mapa.js` y `locales/01-iconos-mapa/iconos-mapa.css` para posicionar únicamente los pines visibles (*Viewport Culling*) en coordenadas de pantalla `1:1` mediante `transform: translate3d(px, py, 0) translate(-50%, -50%)`, eliminando la contra-escala `--factor-pin` (`scale(0.95 / escala)`) que encogía los iconos a ~1.7px y los pixelaba en WebKit/iOS.
- [x] **2.6** Confirmar que el estado `:hover`, `.seleccionado`, `.resaltado`, los tooltips (`::after`) y el toque táctil sobre cada pin funcionan con nitidez vectorial Retina 100% en cualquier nivel de zoom (de 42% al zoom máximo).

### Bloque C — Mapa Base y Teselas HD en Resolución Real 1:1 (Fin del Desenfoque del Mapa en iOS)
- [x] **2.7** Reemplazar en `edificio/visor-mapa.js` y `edificio/edificio.css` el renderizado de `#lienzo-mapa` con `transform: scale(16)` + teselas `<img>` encogidas a `8.35px × 8.35px` por renderizado en **resolución real de pantalla (`<canvas>` 2D a `width * devicePixelRatio` o capa de teselas en tamaño real `tam * escala` sin `scale` gigante en el padre)**, para que iOS WebKit dibuje los `256×256` píxeles nativos de cada tesela directamente sobre los píxeles Retina sin aplastarlos ni estirarlos en GPU y sin costuras (*seams*) entre bloques.
- [x] **2.8** Mantener los 3 modos de color (**Atlas**, **Radar**, **Satélite**) aplicados de forma fluida y acelerada por GPU sobre la capa del terreno (`filter: var(--filtro-mapa)` aislado solo en el terreno, nunca afectando a los iconos ni a la UI).
- [x] **2.9** Optimizar la selección del nivel de tesela `z` en `edificio/visor-mapa.js` considerando `Math.min(window.devicePixelRatio || 1, 2)` para cargar la tesela nítida a tiempo en pantallas Retina, gestionar una caché ligera en memoria de imágenes cargadas (evitando descargas repetidas o >1.000 peticiones al hacer zoom rápido) y calibrar `ZOOM_MAX` (verificando si existe `z=17` o fijando el techo óptimo para `z=16` sin sobre-estiramiento).
- [x] **2.10** Garantizar que la animación suave de `enfocarCoordenada` / `centrarMapaInicial` / botones `➕`/`➖` / doble clic y el pellizco de 2 dedos (*pinch-to-zoom*) mantengan sincronizados terreno + iconos + etiquetas en el mismo `requestAnimationFrame` a 60 FPS sin desfase visual.

### Bloque D — Control de Calidad y Despliegue
- [x] **2.11** 🛡️ **CONTROL DE CALIDAD (Vigilante):** Ajustar el margen en `vigilante/auditor.js` si algún archivo supera por poco las 250 líneas según el nuevo criterio de `Markdown/fundamentos/conceptos.md` (o dividir limpiamente si excede +100 líneas) y ejecutar `node vigilante/auditor.js` confirmando **0 errores**.
- [x] **2.12** 🛡️ **CONTROL DE CALIDAD (Run & Test Móvil + PC):** Probar en `http://localhost:5000` (viewport móvil `390×844` DPR 3× y escritorio `1440×900`):
  * Iconos visibles al 100% en modo **Atlas**, **Radar** y **Satélite** a `120%`, `160%`, `400%`, `800%` y zoom máximo.
  * Nitidez total en bordes SVG de iconos y detalles de calles/edificios en teselas HD sin costuras ni borrosidad.
  * Movimiento con 1 dedo, pellizco de 2 dedos, buscador/filtros y `resize` sin reinicio de zoom y con **0 errores** en consola.
- [x] **2.13** 🛡️ **CONTROL DE CALIDAD (Prueba del Centro Comercial):** Apagar temporalmente `iconosMapa: false` y `menuFiltros: false` por separado en `edificio/central-locales.js` confirmando que el mapa HD sigue funcionando al 100% sin fallos, y volver a encenderlos.
- [x] **2.14** Subir copia de seguridad a **GitHub** (`git push`) para desplegar en **Vercel** y validar directamente en un iPhone real la nitidez del mapa, los iconos y la visibilidad en modo Atlas.

---

## Fase 3: Integración de Dominio Oficial (`cangel.games`) y Vista Previa en WhatsApp / Redes Sociales (Open Graph)
*Objetivo: Configurar la previsualización enriquecida al compartir el enlace oficial `https://www.cangel.games` en WhatsApp, Telegram, Facebook y Twitter/X, mostrando la imagen promocional oficial de GTA VI, branding de CANGEL GAMES, título y descripción sin ralentizar la carga ni violar la Regla de Oro (≤ 250 líneas).*

### Bloque A — Configuración de Dominio y DNS en Producción
- [x] **3.1** Enlazar el dominio personalizado `cangel.games` en Namecheap hacia Vercel mediante registro `A` (`Host: @` -> `76.76.21.21`) con TTL automático.
- [x] **3.2** Configurar el subdominio `www.cangel.games` en Namecheap mediante registro `CNAME` (`Host: www` -> `cname.vercel-dns.com.`) y establecer la redirección `308` en Vercel.
- [x] **3.3** Validar propagación DNS global y emisión exitosa del certificado de seguridad SSL/TLS (`HTTPS` emitido por Let's Encrypt para `www.cangel.games` con código de respuesta `200 OK`).

### Bloque B — Preparación y Optimización de la Imagen Open Graph
- [x] **3.4** Procesar la imagen promocional oficial de GTA VI (`media_1795148090753_8870c004.jpg`) y guardarla en `recursos/og-share.jpg`.
- [x] **3.5** Ajustar dimensiones exactas a proporción recomendada de `1200 × 630 px` (aspect ratio 1.91:1) y comprimir a un peso menor a 300 KB (requisito estricto del rastreador de WhatsApp para no omitir la miniatura).
- [x] **3.6** Asegurar compatibilidad cruzada de formato (`image/jpeg`) legible por los bots de WhatsApp, Telegram, Discord, iMessage, Facebook y Twitter/X.

### Bloque C — Implementación de Metadatos en `index.html` (≤ 120 líneas)
- [x] **3.7** Agregar en el `<head>` de `index.html` las etiquetas estándar de Open Graph con URL absoluta HTTPS:
  * `<meta property="og:type" content="website">`
  * `<meta property="og:url" content="https://www.cangel.games/">`
  * `<meta property="og:site_name" content="CANGEL GAMES">`
  * `<meta property="og:title" content="GTA 6 - Mapa Interactivo de Leonida | CANGEL GAMES">`
  * `<meta property="og:description" content="Explora el mapa interactivo de GTA VI en alta definición: 2532 marcadores IGN, 76 categorías, coleccionables y filtros en tiempo real.">`
  * `<meta property="og:image" content="https://www.cangel.games/recursos/og-share.jpg">`
  * `<meta property="og:image:secure_url" content="https://www.cangel.games/recursos/og-share.jpg">`
  * `<meta property="og:image:type" content="image/jpeg">`
  * `<meta property="og:image:width" content="1200">`
  * `<meta property="og:image:height" content="630">`
- [x] **3.8** Incorporar metaetiquetas para Twitter Cards:
  * `<meta name="twitter:card" content="summary_large_image">`
  * `<meta name="twitter:title" content="GTA 6 - Mapa Interactivo de Leonida | CANGEL GAMES">`
  * `<meta name="twitter:description" content="Mapa interactivo de GTA VI en Leonida con marcadores y coleccionables en alta definición.">`
  * `<meta name="twitter:image" content="https://www.cangel.games/recursos/og-share.jpg">`
- [x] **3.9** Definir `<meta name="theme-color" content="#ff2a85">` para tintar la barra de estado del navegador móvil con el color neón característico de Vice City.

### Bloque D — Control de Calidad, Despliegue y Validación
- [x] **3.10** 🛡️ **CONTROL DE CALIDAD (Vigilante):** Ejecutar `node vigilante/auditor.js` y confirmar que `index.html` permanece dentro del límite (≤ 120 líneas) y todo el proyecto arroja **0 errores**.
- [x] **3.11** 🛡️ **CONTROL DE CALIDAD (Depuradores de Redes Sociales):**
  * Subir copia de seguridad a **GitHub** (`git push`) para despliegue automático en **Vercel**.
  * Inspeccionar la URL `https://www.cangel.games` con herramientas de depuración OG (Facebook Sharing Debugger / OpenGraph.xyz) verificando que el scraper obtiene respuesta 200 y detecta título, imagen y dimensiones.
- [x] **3.12** 🛡️ **CONTROL DE CALIDAD (Prueba Real en WhatsApp):**
  * Pegar el enlace `https://www.cangel.games` en una conversación de WhatsApp (móvil y web).
  * Confirmar que aparece la tarjeta interactiva con la imagen de GTA VI, título y descripción sin demoras ni errores de carga.