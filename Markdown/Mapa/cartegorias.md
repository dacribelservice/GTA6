# Checklist Maestra — Integración Total de Categorías y Marcadores IGN (2.532 Puntos)

Este documento define la hoja de ruta detallada para expandir el mapa interactivo de GTA 6 de los **470 marcadores iniciales** a los **2.532 marcadores oficiales de IGN / MapGenie** (13 grupos y 76 categorías), respetando la **Regla de Oro (margen de referencia ≤ 250 líneas, tope flexible ≤ 350 líneas por archivo)** y manteniendo **60 FPS reales y 100% PageSpeed**.

---

## 0. Inventario de Archivos y Partición de Datos (Todos ≤ 350 Líneas)

| Componente | Archivo Exacto | Función | Límite Máximo |
| :--- | :--- | :--- | :--- |
| **Catálogo de Categorías** | `datos/categorias.json` | 13 grupos y 76 categorías con nombres, iconos y lista de archivos | **≤ 220 líneas** |
| **Ubicaciones Grupo 1** | `datos/ubicaciones-waink-exploracion.json` | WAiNK (89) + Exploración (48) = 137 puntos | **≤ 160 líneas** |
| **Ubicaciones Grupo 2** | `datos/ubicaciones-robos-ilegal.json` | Robos (310) + Operaciones Ilegales (40) = 350 puntos | **≤ 350 líneas** |
| **Ubicaciones Grupo 3A** | `datos/ubicaciones-vehiculos-1.json` | Pay 'N' Spray, Mod Shops, Gasolineras, Coches únicos = 280 puntos | **≤ 300 líneas** |
| **Ubicaciones Grupo 3B** | `datos/ubicaciones-vehiculos-2.json` | Paradas de autobús (276) y terminales = 280 puntos | **≤ 300 líneas** |
| **Ubicaciones Grupo 4A** | `datos/ubicaciones-comida-estilo-1.json` | Bares y Cafeterías = 210 puntos | **≤ 240 líneas** |
| **Ubicaciones Grupo 4B** | `datos/ubicaciones-comida-estilo-2.json` | Comida callejera y Tiendas de Ropa = 220 puntos | **≤ 240 líneas** |
| **Ubicaciones Grupo 5A** | `datos/ubicaciones-stunts-1.json` | Stunt Jumps (130) + Saltos Base (25) + Knife Flight (40) = 195 puntos | **≤ 220 líneas** |
| **Ubicaciones Grupo 5B** | `datos/ubicaciones-stunts-2.json` | Bajo el Puente (Under the Bridge) = 202 puntos | **≤ 220 líneas** |
| **Ubicaciones Grupo 6** | `datos/ubicaciones-interes-actividades.json` | ATMs (193), Gimnasios, Ammu-Nation, Recreativas, Pesca, Tiro = 312 puntos | **≤ 330 líneas** |
| **Ubicaciones Grupo 7** | `datos/ubicaciones-carreras-deportes.json` | Carreras (95) + Baloncesto y Deportes (122) + Cartas (90) = 307 puntos | **≤ 330 líneas** |
| **Lámina de Iconos SVG** | `recursos/iconos/lamina-iconos.svg` | Hoja SVG única con los símbolos vectoriales de las 76 categorías | **≤ 250 líneas** |
| **Iconos del Mapa** | `locales/01-iconos-mapa/iconos-mapa.js` | Carga paralela de archivos y Viewport Culling a 60 FPS | **≤ 180 líneas** |
| **Menú de Filtros** | `locales/02-menu-filtros/menu-filtros.js` | Filtros por los 13 grupos y buscador instantáneo de los 2.532 puntos | **≤ 210 líneas** |

---

## Fase 1: Extracción, Conversión y Partición de Datos (2.532 Puntos)
*Objetivo: Obtener del backend GraphQL de IGN todos los marcadores y distribuirlos en archivos JSON lineales (1 línea = 1 punto) sin que ninguno supere las 350 líneas.*

- [x] **1.1** Crear script temporal de extracción que consulte el endpoint GraphQL oficial de IGN (`https://mollusk.apis.ign.com/graphql`) con `mapGenieGameId: 353`, `mapId: 1100` y la lista completa de los 76 `typeSlugs`.
- [x] **1.2** Transformar las coordenadas nativas `(lat, lng)` a las coordenadas porcentuales `(x%, y%)` del mapa mediante la fórmula de regresión calibrada: `x = 94.81 * lng + 116.66`, `y = -94.82 * lat + 116.67` (precisión milimétrica de 0.005%).
- [x] **1.3** Asignar a cada marcador su región oficial de Leonida (`Vice City`, `Leonida Keys`, `Grassrivers`, `Port Gellhorn`, `Ambrosia`, `Mount Kalaga National Park`) según su zona geográfica y calcular la URL de la tesela HD `z=16` para su foto bajo demanda.
- [x] **1.4** Generar los archivos JSON de datos en formato lineal (1 línea = 1 ubicación) dentro de `datos/` respetando estrictamente que ninguno supere las 350 líneas (11 archivos creados con los 2.532 marcadores).
- [x] **1.5** 🛡️ **CONTROL DE CALIDAD FASE 1 (Vigilante):** Ejecutar `node vigilante/auditor.js` y confirmar que todos los nuevos archivos `.json` tienen **≤ 350 líneas** (margen flexible de conceptos.md) y **0 errores de sintaxis JSON**.

---

## Fase 2: Catálogo de Categorías y Lámina de Iconos SVG
*Objetivo: Registrar los 13 grupos y las 76 categorías con sus colores oficiales y sus símbolos vectoriales SVG.*

- [x] **2.1** Actualizar `datos/categorias.json` (**≤ 220 líneas**) para incorporar los 13 grupos oficiales de IGN (*Points of Interest, Robberies, Vehicles, Style, Food & Drink, WAiNK Locations, Exploration, Collectible Cards, Sports, Activities, Stunts, Racing, Illegal Operations*) y sus 76 categorías con sus identificadores, nombres bilingües y colores.
- [x] **2.2** Incluir en `datos/categorias.json` el array `"archivosUbicaciones"` con las rutas de los archivos JSON generados en la Fase 1 para permitir carga desacoplada.
- [x] **2.3** Actualizar `recursos/iconos/lamina-iconos.svg` (**≤ 250 líneas**) añadiendo los símbolos `<g id="icono-...">` para las nuevas categorías (acrobacias, saltos, canastas de básquet, cartas, drones, etc.) con trazados limpios y optimizados.
- [x] **2.4** 🛡️ **CONTROL DE CALIDAD FASE 2 (Vigilante):** Ejecutar `node vigilante/auditor.js` y confirmar que `categorias.json` y `lamina-iconos.svg` cumplen **≤ 250 líneas** y **0 errores**.

---

## Fase 3: Conexión Desacoplada y Carga en Módulos (`iconos-mapa.js` y `menu-filtros.js`)
*Objetivo: Cargar las 2.532 ubicaciones en memoria y renderizarlas a 60 FPS mediante Viewport Culling.*

- [x] **3.1** Actualizar `locales/01-iconos-mapa/iconos-mapa.js` (**≤ 180 líneas**) para que lea el listado de archivos desde `categorias.json` y los cargue en paralelo con `Promise.all()`, combinándolos en el mapa de ubicaciones en memoria.
- [x] **3.2** Actualizar `locales/02-menu-filtros/menu-filtros.js` (**≤ 210 líneas**) para renderizar dinámicamente los 13 grupos en el panel lateral con acordeones `<details>`, contadores actualizados en vivo y botón para alternar grupo completo.
- [x] **3.3** Verificar que el buscador instantáneo de `menu-filtros.js` permita localizar cualquiera de los 2.532 puntos por nombre, categoría o región en menos de 50 ms.
- [x] **3.4** 🛡️ **CONTROL DE CALIDAD FASE 3 (Vigilante):** Ejecutar `node vigilante/auditor.js` y certificar que `iconos-mapa.js` y `menu-filtros.js` no superan sus límites y marcan **0 errores**.

---

## Fase 4: Pruebas de Rendimiento y Aislamiento (Run & Test)
*Objetivo: Comprobar la experiencia de usuario en PC y celular a 60 FPS con los 2.532 marcadores activos.*

- [x] **4.1** 🛡️ **CONTROL DE CALIDAD FASE 4 (Run & Test Navegador):** Abrir `http://localhost:5000` y comprobar:
  - El contador de cabecera marca exactamente **`2532 / 2532`** con todas las categorías encendidas.
  - Al hacer zoom y desplazarse por el mapa, el **Viewport Culling** mantiene únicamente los iconos en pantalla (~30 a 80 elementos en DOM) a **60 FPS estables**.
  - Los 13 grupos se pueden abrir, cerrar y filtrar de forma instantánea.
  - El buscador por texto encuentra lugares nuevos (ej. "Stunt Jump", "Basketball", "Jack of Hearts", "Safe").
  - La consola del navegador permanece limpia con **0 advertencias y 0 errores**.
- [x] **4.2** 🛡️ **CONTROL DE CALIDAD FASE 4 (Prueba del Centro Comercial):** Apagar `iconosMapa: false` y `menuFiltros: false` por separado en `edificio/central-locales.js` confirmando que el visor del mapa sigue operando al 100% de forma aislada.

---

## Fase 4-B: Optimización de Rendimiento Extremo a 60 FPS (Opción 3: Encendido Selectivo + LOD por Zoom)
*Objetivo: Erradicar por completo la sobrecarga en zoom alejado y garantizar 60 FPS estables combinando encendido selectivo por defecto y Nivel de Detalle (LOD) por nivel de zoom.*

- [x] **4-B.1** Configurar en `datos/categorias.json` las propiedades `"activaPorDefecto": true/false` (dejando activas de inicio solo ~350 ubicaciones principales y apagadas categorías masivas como paradas de bus, ATMs, bajo el puente y cajeros remolcables) y `"zoomMinimo"` para control de densidad.
- [x] **4-B.2** Actualizar `locales/02-menu-filtros/menu-filtros.js` (**≤ 210 líneas**) para que inicialice `estado.activas` respetando la configuración `activaPorDefecto`, actualizando los acordeones y contadores desde el arranque.
- [x] **4-B.3** Actualizar `locales/01-iconos-mapa/iconos-mapa.js` (**≤ 180 líneas**) implementando filtro de Nivel de Detalle (*LOD*) en `cumpleFiltro(u)`: si la cámara está en zoom alejado (`vista.escala < cat.zoomMinimo`), no montar categorías hiperdensas en el DOM.
- [x] **4-B.4** 🛡️ **CONTROL DE CALIDAD FASE 4-B (Run & Test):** Probar en `http://localhost:5000` que al hacer zoom alejado el mapa vuela a 60 FPS constantes, el DOM no supera ~50 nodos montados, y al acercarse a las calles los iconos densos emergen suavemente.
- [x] **4-B.5** 🛡️ **CONTROL DE CALIDAD FASE 4-B (Vigilante):** Ejecutar `node vigilante/auditor.js` y certificar 100% de archivos aprobados (≤ 250 / ≤ 350 líneas) y 0 errores.

---

## Fase 5: Auditoría Final, Respaldo en GitHub y Despliegue en Vercel
*Objetivo: Pasar la inspección del vigilante y publicar los 2.532 marcadores en producción.*

- [x] **5.1** Ejecutar la auditoría completa con `node vigilante/auditor.js` confirmando **100% de archivos aprobados (≤ 350 líneas, referencia ≤ 250) y 0 errores**.
- [x] **5.2** Crear commit de respaldo en Git: `git add .` y `git commit -m "feat(datos): integracion total de 2532 marcadores IGN y 76 categorias"`.
- [x] **5.3** Subir a GitHub (`git push origin main`) para despliegue automático en Vercel.
- [x] **5.4** Verificar en celular real a través de la URL de Vercel que los 2.532 marcadores cargan rápido y responden al toque táctil con nitidez Retina 1:1.
