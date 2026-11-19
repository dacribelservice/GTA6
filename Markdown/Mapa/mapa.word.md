# Checklist Maestra de Construcción — Mapa Interactivo de GTA 6

Este documento define **todos los componentes con nombre exacto de carpeta y archivo**, su límite estricto de líneas (**Regla de Oro: Máximo 250 líneas por archivo**) y las pruebas obligatorias de compilación y ejecución (`Run & Test`) al cierre de **cada fase**.

---

## 0. Inventario Completo de Componentes y Archivos (Todos ≤ 250 Líneas)

| Componente / Pieza | Carpeta / Archivos Exactos | Función Exacta | Límite Máximo |
| :--- | :--- | :--- | :--- |
| **Puerta Principal** | `index.html` | Estructura base HTML5, SEO/redes sociales y carga del Edificio | **≤ 120 líneas** |
| **Configuración Vercel** | `vercel.json` | Reglas de caché instantánea y compresión para 100% PageSpeed | **≤ 50 líneas** |
| **Filtro GitHub** | `.gitignore` | Ignora archivos temporales para mantener limpio GitHub | **≤ 30 líneas** |
| **Modo App Móvil** | `manifest.json` | Permite instalar el mapa como App en la pantalla del celular | **≤ 40 líneas** |
| **Vigilante de Calidad** | `vigilante/auditor.js` | Revisa automáticamente que ningún archivo pase de 250 líneas y que todo compile sin errores | **≤ 120 líneas** |
| **Edificio: Diseño Base** | `edificio/edificio.css` | Estilos de pantalla completa, lienzo y controles de zoom/vista | **≤ 160 líneas** |
| **Edificio: Motor Mapa** | `edificio/visor-mapa.js` | Movimiento a 60 FPS, zoom, lectura de enlace compartido (`#punto=`) y cambio de vista (Radar / Atlas / Satélite) | **≤ 200 líneas** |
| **Edificio: Tablero** | `edificio/central-locales.js` | Interruptores para encender/apagar cada local y cortacircuitos anti-fallos (`try / catch`) | **≤ 150 líneas** |
| **Local #1: Iconos** | `locales/01-iconos-mapa/iconos-mapa.js`<br>`locales/01-iconos-mapa/iconos-mapa.css` | Dibuja los iconos SVG en su coordenada `(X%, Y%)` sobre el mapa | **≤ 180 líneas**<br>**≤ 140 líneas** |
| **Local #2: Filtros** | `locales/02-menu-filtros/menu-filtros.js`<br>`locales/02-menu-filtros/menu-filtros.css` | Panel lateral estilo IGN, filtros por categoría y buscador instantáneo | **≤ 210 líneas**<br>**≤ 180 líneas** |
| **Local #3: Tarjeta Info** | `locales/03-tarjeta-info/tarjeta-info.js`<br>`locales/03-tarjeta-info/tarjeta-info.css` | Ventana al tocar un icono con foto bajo demanda, pista exacta y botón **"Copiar enlace directo"** | **≤ 190 líneas**<br>**≤ 160 líneas** |
| **Local #4: Progreso** | `locales/04-progreso-jugador/progreso-jugador.js`<br>`locales/04-progreso-jugador/progreso-jugador.css` | Marcar completado ✅ sin cuenta (`localStorage`) + **Exportar/Importar progreso** entre PC y celular | **≤ 200 líneas**<br>**≤ 140 líneas** |
| **Local #5: Mis Pines** | `locales/05-pines-personales/pines-personales.js`<br>`locales/05-pines-personales/pines-personales.css` | Permite a cualquier jugador poner sus propios marcadores y notas privadas en el mapa | **≤ 170 líneas**<br>**≤ 120 líneas** |
| **Local #6: Modo Editor** | `locales/06-modo-editor/modo-editor.js`<br>`locales/06-modo-editor/modo-editor.css` | Herramienta interna de administración para hacer clic en el mapa y crear puntos en 1 segundo | **≤ 180 líneas**<br>**≤ 130 líneas** |
| **Recursos Visuales** | `recursos/mapa/leonida-oficial.webp`<br>`recursos/iconos/lamina-iconos.svg` | Imagen oficial del mapa de Leonida y hoja única de iconos vectoriales estilo IGN | **≤ 250 líneas (SVG)** |
| **Datos por Región** | `datos/categorias.json`<br>`datos/ubicaciones-vice-city.json`<br>`datos/ubicaciones-regiones.json` | Categorías de IGN y puntos divididos por zonas para que ningún archivo `.json` supere las 250 líneas | **≤ 250 líneas c/u** |

---

## Fase 1: Cimientos, Estructura de Carpetas y El Vigilante (`vigilante/auditor.js`)
*Objetivo: Crear el esqueleto completo del Centro Comercial, la configuración de GitHub/Vercel y el vigilante automático de las 250 líneas.*

- [x] **1.1** Crear las carpetas base del plano: `edificio/`, `locales/`, `recursos/mapa/`, `recursos/iconos/`, `datos/` y `vigilante/`.
- [x] **1.2** Crear las 6 subcarpetas de los locales independientes dentro de `locales/`: `locales/01-iconos-mapa/`, `locales/02-menu-filtros/`, `locales/03-tarjeta-info/`, `locales/04-progreso-jugador/`, `locales/05-pines-personales/` y `locales/06-modo-editor/`.
- [x] **1.3** Crear `.gitignore` (**≤ 30 líneas**), `vercel.json` (**≤ 50 líneas**) y `manifest.json` (**≤ 40 líneas**).
- [x] **1.4** Crear `index.html` (**≤ 120 líneas**) con etiquetas SEO, vista previa para WhatsApp/Discord y contenedor del Edificio.
- [x] **1.5** Crear `vigilante/auditor.js` (**≤ 120 líneas**): script que escanea todas las carpetas, verifica que ningún archivo pase de **250 líneas** y comprueba que no existan errores de sintaxis.
- [x] **1.6** 🛡️ **CONTROL DE CALIDAD FASE 1 (Vigilante):** Ejecutar `node vigilante/auditor.js` y confirmar que todos los archivos creados tienen **≤ 250 líneas** y **0 errores** de sintaxis.
- [x] **1.7** 🛡️ **CONTROL DE CALIDAD FASE 1 (Run & Test):** Encender el servidor en el puerto **`5000`** (`http://localhost:5000`) y verificar que `index.html` carga con **0 errores** en consola.

---

## Fase 2: El Edificio Principal (`edificio/` y Mapa Oficial de Leonida)
*Objetivo: Construir el visor del mapa a 60 FPS, el interruptor de estilo de mapa y el tablero eléctrico `central-locales.js`.*

- [x] **2.1** Colocar el mapa oficial del Estado de Leonida en `recursos/mapa/leonida-oficial.webp` con sus 6 regiones (*Vice City, Leonida Keys, Grassrivers, Port Gellhorn, Ambrosia y Mount Kalaga*).
- [x] **2.2** Construir `edificio/edificio.css` (**≤ 160 líneas**) con diseño a pantalla completa y los 3 modos visuales de color (Radar Oscuro / Atlas / Satélite).
- [x] **2.3** Construir `edificio/visor-mapa.js` (**≤ 200 líneas**) con arrastre fluido a 60 FPS, zoom con rueda/pellizco, botón de cambio de vista del mapa y lectura de enlaces directos (`#punto=`).
- [x] **2.4** Construir `edificio/central-locales.js` (**≤ 150 líneas**) con los interruptores de encendido/apagado de los 6 locales y protección anti-fallos (`try / catch`).
- [x] **2.5** 🛡️ **CONTROL DE CALIDAD FASE 2 (Vigilante):** Ejecutar `node vigilante/auditor.js` y confirmar que `edificio.css`, `visor-mapa.js` y `central-locales.js` tienen **≤ 250 líneas**.
- [x] **2.6** 🛡️ **CONTROL DE CALIDAD FASE 2 (Run & Test):** Hacer **Run & Test** en el puerto local `5000` (`http://localhost:5000`) y comprobar que el mapa se mueve, hace zoom a 60 FPS, cambia entre las 3 vistas de color y la consola marca **0 errores**.
- [x] **2.7** Extraer directamente de IGN las cuadrículas originales en Alta Definición (*Tiles* de zoom alto donde se ven todas las cuadras, autopistas amarillas, rotondas y edificios) y ensamblarlas en Ultra Alta Resolución (4K / 8K) en `recursos/mapa/leonida-oficial.webp` (o sistema de teselas HD bajo demanda).
- [x] **2.8** Actualizar `edificio/visor-mapa.js` (**≤ 200 líneas**) y `edificio/edificio.css` (**≤ 160 líneas**) para renderizar el mapa HD a nivel de calle (zoom hasta 600%+) con nitidez total a 60 FPS.
- [x] **2.9** 🛡️ **CONTROL DE CALIDAD FASE 2 HD (Vigilante + Run & Test):** Ejecutar `node vigilante/auditor.js` y verificar en `http://localhost:5000` que al acercar el zoom al máximo las calles, tréboles de autopista y edificios se ven 100% nítidos como en IGN con **0 errores**.

---

## Fase 3: Lámina de Iconos y Datos Estilo IGN (`recursos/iconos/` y `datos/`)
*Objetivo: Crear la hoja única de iconos SVG y los archivos JSON de categorías y ubicaciones respetando el límite de 250 líneas.*

- [x] **3.1** Crear `recursos/iconos/lamina-iconos.svg` (**≤ 250 líneas**) con todos los iconos vectoriales de los 5 grupos de IGN: **Coleccionables App WAiNK** (*Landmarks [31], Curiosidades [35], Esculturas [23], Carteles Peewees [4] y Grafitis No Flusher [15]*), **Robos y Golpes** (*Bancos, grandes bancos, joyerías, casas de empeño y préstamos*), **Vehículos y Servicios** (*Pay 'n' Spray, talleres, gasolineras, cargadores eléctricos, cajeros remolcables y transporte ferry/tren/bus*), **Propiedades y Activos** (*Pisos francos, garajes comprables, vehículos únicos y viaje rápido*) y **Tiendas y Personalización** (*Tiendas 24/7, comida rápida, bares, tiendas de ropa, peluquerías y tatuajes*).
- [x] **3.2** Crear `datos/categorias.json` (**≤ 200 líneas**) con los 5 grupos, colores e identificadores de cada icono.
- [x] **3.3** Crear `datos/ubicaciones-vice-city.json` (**≤ 240 líneas**) y `datos/ubicaciones-regiones.json` (**≤ 240 líneas**) con las coordenadas `(X%, Y%)`, pistas y fotos bajo demanda en **formato JSON lineal (1 línea = 1 ubicación)** para alojar hasta 240 puntos por archivo sin superar las 250 líneas.
- [x] **3.4** 🛡️ **CONTROL DE CALIDAD FASE 3 (Vigilante):** Ejecutar `node vigilante/auditor.js` para validar que todos los `.json` y `.svg` tienen **≤ 250 líneas** y formato JSON válido sin errores.
- [x] **3.5** 🛡️ **CONTROL DE CALIDAD FASE 3 (Run & Test):** Hacer **Run & Test** para confirmar carga limpia de los datos e iconos en el navegador con **0 errores**.

---

## Fase 4: Local #1 — Iconos sobre el Mapa (`locales/01-iconos-mapa/`)
*Objetivo: Dibujar los iconos sobre el mapa en su posición exacta de forma 100% aislada.*

- [ ] **4.1** Crear `locales/01-iconos-mapa/iconos-mapa.css` (**≤ 140 líneas**) con colores por categoría, animación ligera y tamaño adaptable al zoom.
- [ ] **4.2** Crear `locales/01-iconos-mapa/iconos-mapa.js` (**≤ 180 líneas**) que lee los archivos de `datos/` y coloca cada icono SVG en su coordenada `(X%, Y%)`.
- [ ] **4.3** Conectar el Local #1 en `edificio/central-locales.js`.
- [ ] **4.4** 🛡️ **CONTROL DE CALIDAD FASE 4 (Vigilante):** Ejecutar `node vigilante/auditor.js` y confirmar que `iconos-mapa.js` e `iconos-mapa.css` tienen **≤ 250 líneas**.
- [ ] **4.5** 🛡️ **CONTROL DE CALIDAD FASE 4 (Run & Test):** Verificar en el navegador que todos los iconos aparecen en su lugar exacto con **0 errores**.
- [ ] **4.6** 🛡️ **CONTROL DE CALIDAD FASE 4 (Prueba del Centro Comercial):** Apagar temporalmente `iconosMapa: false` en `central-locales.js`, verificar que el Edificio sigue funcionando perfecto y volver a encenderlo.

---

## Fase 5: Local #2 — Menú Lateral de Filtros y Buscador (`locales/02-menu-filtros/`)
*Objetivo: Filtrar categorías al estilo IGN y buscar cualquier lugar por nombre o región en 1 segundo.*

- [ ] **5.1** Crear `locales/02-menu-filtros/menu-filtros.css` (**≤ 180 líneas**) con diseño lateral desplegable y clicable para PC y teléfono móvil.
- [ ] **5.2** Crear `locales/02-menu-filtros/menu-filtros.js` (**≤ 210 líneas**) con interruptores clicables por categoría, botones *"Mostrar todo / Ocultar todo"* y buscador instantáneo que mueve la cámara al punto buscado.
- [ ] **5.3** Conectar el Local #2 en `edificio/central-locales.js`.
- [ ] **5.4** 🛡️ **CONTROL DE CALIDAD FASE 5 (Vigilante):** Ejecutar `node vigilante/auditor.js` y confirmar que `menu-filtros.js` y `menu-filtros.css` tienen **≤ 250 líneas**.
- [ ] **5.5** 🛡️ **CONTROL DE CALIDAD FASE 5 (Run & Test):** Probar los filtros clicables y el buscador en vivo con **0 errores de compilación**.
- [ ] **5.6** 🛡️ **CONTROL DE CALIDAD FASE 5 (Prueba del Centro Comercial):** Apagar temporalmente `menuFiltros: false` en `central-locales.js`, comprobar que el mapa y los iconos del Local #1 siguen funcionando sin enterarse y volver a encenderlo.

---

## Fase 6: Local #3 y Local #4 — Tarjeta de Info, Compartir Enlace y Progreso sin Cuenta
*Objetivo: Abrir detalles con foto/pista, copiar link directo para WhatsApp/Discord y guardar/exportar progreso completado ✅.*

- [ ] **6.1** Crear `locales/03-tarjeta-info/tarjeta-info.css` (**≤ 160 líneas**) con el diseño de la ventana emergente de información del punto.
- [ ] **6.2** Crear `locales/03-tarjeta-info/tarjeta-info.js` (**≤ 190 líneas**) con carga de foto bajo demanda, pista exacta y botón **"Copiar enlace directo de este punto"** (`#punto=id`).
- [ ] **6.3** Crear `locales/04-progreso-jugador/progreso-jugador.css` (**≤ 140 líneas**) para el estado visual de iconos completados ✅ y barra de porcentaje de progreso.
- [ ] **6.4** Crear `locales/04-progreso-jugador/progreso-jugador.js` (**≤ 200 líneas**) para guardar progreso en `localStorage` sin cuenta y botón **"Pasar progreso a otro dispositivo (Exportar / Importar)"**.
- [ ] **6.5** Conectar el Local #3 y el Local #4 en `edificio/central-locales.js`.
- [ ] **6.6** 🛡️ **CONTROL DE CALIDAD FASE 6 (Vigilante):** Ejecutar `node vigilante/auditor.js` y confirmar que los 4 archivos cumplen **≤ 250 líneas**.
- [ ] **6.7** 🛡️ **CONTROL DE CALIDAD FASE 6 (Run & Test):** Tocar un icono, marcarlo como completado ✅, probar el enlace directo `#punto=` y verificar **0 errores**.
- [ ] **6.8** 🛡️ **CONTROL DE CALIDAD FASE 6 (Prueba del Centro Comercial):** Apagar Local #3 y Local #4 por separado en `central-locales.js` para verificar aislamiento total y volver a encenderlos.

---

## Fase 7: Local #5 (Mis Pines Personales) y Local #6 (Modo Editor en 1 Clic)
*Objetivo: Permitir notas privadas del jugador y darte tu herramienta de administración para agregar iconos nuevos en 1 clic.*

- [ ] **7.1** Crear `locales/05-pines-personales/pines-personales.css` (**≤ 120 líneas**) y `locales/05-pines-personales/pines-personales.js` (**≤ 170 líneas**) para que el visitante guarde sus propios puntos y escondites privados en el mapa.
- [ ] **7.2** Crear `locales/06-modo-editor/modo-editor.css` (**≤ 130 líneas**) y `locales/06-modo-editor/modo-editor.js` (**≤ 180 líneas**) para hacer clic en el mapa, obtener la coordenada exacta `(X%, Y%)` y copiar el bloque JSON listo en 1 segundo.
- [ ] **7.3** Conectar el Local #5 y el Local #6 en `edificio/central-locales.js`.
- [ ] **7.4** 🛡️ **CONTROL DE CALIDAD FASE 7 (Vigilante):** Ejecutar `node vigilante/auditor.js` y confirmar que los 4 archivos tienen **≤ 250 líneas**.
- [ ] **7.5** 🛡️ **CONTROL DE CALIDAD FASE 7 (Run & Test + Aislamiento):** Crear un pin personal, probar el Modo Editor, verificar aislamiento en `central-locales.js` y confirmar **0 errores**.

---

## Fase 8: Auditoría Total, GitHub, Vercel y 100/100 en Google PageSpeed
*Objetivo: Pasar la inspección final del Vigilante, subir a GitHub y desplegar en Vercel a velocidad 100%.*

- [ ] **8.1** Ejecutar la auditoría completa con `node vigilante/auditor.js` confirmando que **EL 100% DE LOS ARCHIVOS** del proyecto tienen **≤ 250 líneas** y **0 errores** de sintaxis, compilación y carga en todos los módulos.
- [ ] **8.2** Realizar la **"Prueba General del Centro Comercial"**: apagar y encender cada uno de los 6 locales en `edificio/central-locales.js` confirmando que ninguno rompe al Edificio ni a los demás locales.
- [ ] **8.3** Subir el repositorio limpio a **GitHub** y conectarlo con **Vercel** para despliegue automático.
- [ ] **8.4** Confirmar calificación **100/100 en Google PageSpeed Insights** (Móvil y Escritorio).

---

## Configuración de Vista Previa Local (Puerto de Trabajo)
* **Puerto Oficial del Proyecto:** `5000` (`http://localhost:5000`)
