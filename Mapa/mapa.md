# Plan Maestro del Mapa Interactivo de GTA 6 (Estado de Leonida)

Este documento detalla **cómo vamos a construir el mapa interactivo de GTA 6**, de dónde provienen los recursos oficiales, cuáles son todas las categorías de iconos (basadas en la estructura de IGN) y cómo aplicaremos nuestros cuatro pilares (**Centro Comercial/LEGO**, **100% Google PageSpeed**, **Lápiz de Carbón** y **Regla de Oro: ≤ 250 líneas por archivo**) para superar en velocidad y practicidad a cualquier mapa existente.

---

## 1. El Terreno: El Mapa Oficial del Estado de Leonida

El mapa abarca la totalidad del **Estado de Leonida**, dividido oficialmente en **6 grandes regiones**:

1. **Vice City:** El núcleo metropolitano iluminado por neones, playas (*Vice Beach*), rascacielos y el Aeropuerto Internacional (*VCIA*).
2. **Leonida Keys:** La cadena de islas tropicales que se extiende hacia el sur hasta *Key Lento*.
3. **Grassrivers:** Los humedales y pantanos salvajes al estilo Everglades, hogar de fauna e hidrodeslizadores.
4. **Port Gellhorn:** La región costera e industrial en el oeste que funciona como segundo gran núcleo urbano.
5. **Ambrosia:** El corazón rural e industrial del interior, junto al gran Lago Leonida.
6. **Mount Kalaga National Park:** La zona montañosa, bosques y reserva natural en la frontera norte del estado.

### Fuentes de Referencia del Mapa Limpio (Sin Niebla)
* **Rockstar Games (Media & Downloads):** Póster y mapa digital oficial en alta resolución de *The Great State of Leonida* (`https://www.rockstargames.com/VI`).
* **IGN GTA 6 Interactive Map:** Referencia principal de categorías, filtros y marcadores (`https://www.ign.com/maps/gta-6/leonida`).
* **Visores Comunitarios y Archivos:**
  * `https://gta6map.io/`
  * `https://map.stateofleonida.net/`
  * `https://www.gtabase.com/grand-theft-auto-6/map/`
  * `https://gta.wiki/wiki/State_of_Leonida`

---

## 2. Catálogo Completo de Categorías e Iconos (Estructura IGN)

En lugar de tener los iconos pegados a la imagen del mapa, los marcadores funcionan como una **capa dinámica superior** organizada en **5 grandes grupos**:

### A. Coleccionables y Escaneables (App *WAiNK* del Teléfono)
Elementos clave para completar el juego al 100%:
* **Landmarks (Puntos Emblemáticos — 31 ubicaciones):** Lugares icónicos como el cartel de *Vice City*, *Old Goliath* o las ferias abandonadas.
* **Curiosities (Curiosidades — 35 ubicaciones):** Puntos secretos y misteriosos como el barco espía abandonado (*Derelict Spy Vessel*) o la exhibición de la sirena (*Mermaid Display*).
* **Sculptures (Esculturas — 23 ubicaciones):** Monumentos e instalaciones de arte callejero.
* **Peewees Billboards (Vallas de Peewees — 4 ubicaciones):** Carteles publicitarios secretos de búsqueda.
* **No Flusher Tags (Grafitis — 15 ubicaciones):** Etiquetas ocultas repartidas por las paredes del estado.

### B. Robos y Operaciones Ilegales (*Robberies & Illegal Operations*)
Objetivos de golpes, asaltos y dinero rápido:
* **Banks & Big Banks:** Bancos locales y grandes sucursales bancarias.
* **Jewelry Stores:** Joyerías de gama baja y joyerías de alta gama.
* **Payday Loans:** Locales de préstamos rápidos.
* **Pawn Shops:** Casas de empeño.

### C. Vehículos, Servicios e Infraestructura
* **Pay 'n' Spray & Mod Shops:** Talleres de pintura, reparación y modificación de vehículos.
* **Gas Stations & Electric Chargers:** Gasolineras, estaciones de carga eléctrica y lavaderos de autos (*Car Washes*).
* **Towable ATMs:** Cajeros automáticos remolcables (mecánica de robo con vehículo).
* **Transit (Transporte Público):** Paradas de autobús, estaciones de tren, terminales de ferry y puntos de alquiler de vehículos.

### D. Propiedades y Activos del Mundo (*World Assets*)
* **Safehouses:** Pisos francos y guaridas de los protagonistas.
* **Purchasable Garages:** Garajes comprables para guardar vehículos.
* **Standout Vehicles:** Ubicaciones de aparición de vehículos únicos o raros.
* **Fast-Travel Points:** Puntos de viaje rápido desbloqueables.

### E. Tiendas, Comercio y Personalización
* **Stores & Commerce:** Tiendas de conveniencia (24/7), locales de comida rápida, licorerías, cafés, bares y puestos de comida callejera.
* **Clothing (Tiendas de Ropa):** Ropa casual/urbana, deportiva, formal, trajes de baño, tiendas de segunda mano (*Thrift Shops*) y zapaterías.
* **Beauty & Tattoos:** Peluquerías, salones de belleza y estudios de tatuajes.

---

## 3. Cómo lo Vamos a Construir (Estrategia "Lápiz de Carbón" + 100% PageSpeed)

Para que nuestra web cargue todos estos iconos de una sola vez pero vuele al **100% en Google PageSpeed**, aplicaremos cuatro soluciones prácticas:

### 1. El Visor del Mapa ("El Edificio") — Menos de 3 KB
* En lugar de cargar librerías pesadas o APIs externas lentas, construimos un visor nativo con **CSS + JavaScript puro** usando aceleración por tarjeta gráfica (`transform: translate3d(...) scale(...)`).
* Permite arrastrar con el mouse o con el dedo en móviles y hacer zoom con suavidad a 60 FPS.
* La imagen del mapa se sirve en formato **WebP / AVIF** de alta compresión y máxima nitidez.

### 2. Un Único "Sprite SVG" para Todos los Iconos (`lamina-iconos.svg`) — ~4 KB
* **El Problema Tradicional:** Cargar 35 imágenes `.png` distintas (una por cada tipo de icono) obliga al navegador a hacer 35 descargas separadas y pixela los iconos al hacer zoom.
* **Nuestra Solución "Lápiz de Carbón":** Empaquetamos todos los iconos de las categorías de IGN dentro de **un solo archivo vectorial `recursos/iconos/lamina-iconos.svg`** (**≤ 250 líneas**) mediante etiquetas `<symbol id="icono-banco">`.
* **Ventaja:**
  * Pesa alrededor de **4 KB en total**.
  * Se descarga en **una sola petición** en menos de 10 milisegundos.
  * Al ser vectorial, se ve perfecto incluso con el zoom al 500%.

### 3. Coordenadas Universales en Porcentaje (`X%, Y%`)
* Olvidamos los complejos sistemas de latitud/longitud de GPS.
* Cada marcador se posiciona con dos números simples del `0` al `100`:
  * `x`: Porcentaje desde el borde izquierdo del mapa (ej. `78.45`).
  * `y`: Porcentaje desde el borde superior del mapa (ej. `62.10`).
* Esto garantiza que el icono caiga exactamente en la misma esquina o edificio sin importar si la pantalla es un teléfono vertical o un monitor 4K.

### 4. Base de Datos Independiente por Región (`datos/*.json` — ≤ 250 líneas c/u)
* Todos los puntos y categorías del mapa viven en archivos limpios y separados dentro de `datos/`:
  * `datos/categorias.json`: Definición de los 5 grupos de IGN, colores e identificadores.
  * `datos/ubicaciones-vice-city.json`: Puntos de la región metropolitana de Vice City.
  * `datos/ubicaciones-regiones.json`: Puntos de las otras 5 regiones del Estado de Leonida.
* Para cumplir estrictamente la **Regla de Oro (≤ 250 líneas por archivo)** y alojar cientos de puntos, cada ubicación se guarda en **formato JSON lineal (1 línea = 1 ubicación)**:
  ```json
  { "id": "landmark-01", "titulo": "Cartel de Vice City", "categoria": "landmarks", "region": "Vice City", "x": 74.2, "y": 58.6, "descripcion": "Ubicado en la entrada principal cerca de la autopista." }
  ```

---

## 4. Los 6 "Locales" del Centro Comercial (Módulos Independientes)

Siguiendo nuestra arquitectura modular, cada función será un "local" con su propia energía (`.js`) y agua (`.css`):

| Local (Módulo) | Función Principal | ¿Qué pasa si se apaga por mantenimiento? |
| :--- | :--- | :--- |
| **Edificio (Core Visor)** | Muestra el mapa de Leonida, controla el zoom/movimiento a 60 FPS, modos de vista y enlaces `#punto=`. | Es la base; siempre está encendido y no depende de ningún local. |
| **Local 1: Capa de Iconos** (`01-iconos-mapa`) | Lee `ubicaciones-vice-city.json` y `ubicaciones-regiones.json` y dibuja los iconos SVG sobre el mapa. | El mapa sigue pudiendo explorarse y moverse con normalidad. |
| **Local 2: Filtros y Buscador** (`02-menu-filtros`) | Panel lateral estilo IGN para encender/apagar categorías o buscar por nombre/región al instante. | Los iconos siguen visibles en el mapa aunque el panel lateral esté cerrado o en mantenimiento. |
| **Local 3: Tarjeta de Info** (`03-tarjeta-info`) | Ventana ligera que se abre al tocar un icono (muestra foto bajo demanda, pista y botón **"Copiar enlace directo"** `#punto=id`). | El usuario sigue viendo el mapa y los iconos sin interrupciones. |
| **Local 4: Progreso del Jugador** (`04-progreso-jugador`) | Permite marcar coleccionables como *"Completado"* ✅ en `localStorage` **sin obligar a crear cuenta como hace IGN**, más **Exportar/Importar progreso**. | Los iconos se ven normales; no bloquea ninguna función del mapa. |
| **Local 5: Mis Pines Personales** (`05-pines-personales`) | Permite a cualquier jugador colocar sus propios marcadores y notas privadas en el mapa. | El mapa oficial y sus coleccionables siguen funcionando al 100%. |
| **Local 6: Modo Editor (1 Clic)** (`06-modo-editor`) | Herramienta interna de administración para hacer clic en el mapa, obtener su coordenada `(X%, Y%)` y copiar el JSON en 1 segundo. | Es un local exclusivo de administración; los visitantes normales lo tienen apagado por defecto. |

---

## 5. Orden de Construcción Paso a Paso

1. **Paso 1:** Crear los cimientos, el **Vigilante de Calidad (`vigilante/auditor.js`)** y el **Edificio (Core)** con el mapa del Estado de Leonida optimizado a 60 FPS.
2. **Paso 2:** Crear **`recursos/iconos/lamina-iconos.svg`** y los archivos **`datos/categorias.json`**, **`datos/ubicaciones-vice-city.json`** y **`datos/ubicaciones-regiones.json`**.
3. **Paso 3:** Conectar el **Local 1 (Iconos)** y el **Local 2 (Menú de Filtros y Buscador estilo IGN)**.
4. **Paso 4:** Conectar el **Local 3 (Tarjeta de Info y Enlaces Directos)**, el **Local 4 (Progreso sin cuenta + Exportar/Importar)**, el **Local 5 (Mis Pines Personales)** y el **Local 6 (Modo Editor en 1 Clic)**.
