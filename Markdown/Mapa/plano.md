# Plano Arquitectónico y Tecnológico del Proyecto (GitHub + Vercel)

Este documento es el **plano oficial de ingeniería y estructura de carpetas** de la web del Mapa de GTA 6. Define las tecnologías exactas, la organización del código bajo el modelo de **Centro Comercial (LEGO)** y cómo funcionará el despliegue con **GitHub y Vercel** para garantizar el **100/100 en Google PageSpeed**.

---

## 1. Tecnologías Elegidas (Filosofía "Lápiz de Carbón")

Para evitar sobre-ingeniería, dependencias pesadas que se rompen con el tiempo o tiempos de carga lentos, utilizamos tecnologías nativas de alto rendimiento:

### A. Código Base (Cero Librerías Pesadas)
1. **HTML5 Puro (`index.html`):**
   * Estructura limpia y directa que carga en el primer milisegundo.
2. **CSS3 Modular Aislado (`.css` por cada local):**
   * Cada local tiene su propia hoja de diseño. Los estilos de un local no se mezclan ni rompen el diseño de otro.
   * Uso de aceleración por tarjeta gráfica (`transform: translate3d`, `will-change`) para que el movimiento del mapa vaya a 60 cuadros por segundo en cualquier teléfono o PC.
3. **JavaScript Nativo Modular (`ES Modules`):**
   * Usamos el sistema oficial de módulos de los navegadores modernos (`import` / `export`).
   * **Peso total del código:** Menos de **15 KB** (frente a los 300 KB - 2 MB que pesan los frameworks tradicionales).

### B. Gráficos y Datos Ultraligeros
1. **Imagen del Mapa en Formato `.webp` / `.avif`:**
   * Compresión de última generación que reduce hasta un 80% el peso del archivo manteniendo la máxima nitidez de las calles y regiones de Leonida.
2. **Lámina Única de Iconos (`lamina-iconos.svg`):**
   * Todos los iconos de las categorías de IGN viven dentro de un solo archivo vectorial de ~4 KB.
   * El navegador hace **una sola descarga** y ningún icono se pixela jamás al hacer zoom.
3. **Base de Datos en Archivos `.json` (`categorias.json`, `ubicaciones-vice-city.json` y `ubicaciones-regiones.json`):**
   * Sin bases de datos externas lentas. Los datos están divididos por región en formato lineal (≤ 250 líneas por archivo) y viajan directamente desde la memoria ultrarrápida (CDN) de Vercel en menos de 10 milisegundos.
4. **Memoria del Navegador (`localStorage`):**
   * Guarda el progreso del jugador (los coleccionables marcados como completados ✅) directo en su dispositivo, sin obligar a crear cuenta ni iniciar sesión.

### C. Infraestructura: GitHub + Vercel
1. **GitHub (Bóveda de Código y Control de Versiones):**
   * Guarda todo el proyecto ordenado. Cada local nuevo que construyamos queda respaldado paso a paso.
2. **Vercel (Servidor Mundial Ultra Rápido):**
   * Conectado directamente a nuestro repositorio de GitHub.
   * Cada vez que subimos un cambio a GitHub (`git push`), Vercel actualiza la web pública en **2 segundos**.
   * Al ser código nativo puro, Vercel no pierde tiempo compilando paquetes pesados y sirve la web desde el servidor más cercano al visitante en cualquier país del mundo.

---

## 2. El Plano Completo de Carpetas (El Centro Comercial)

Cada carpeta tiene una responsabilidad única. El **Edificio** sostiene la estructura y cada **Local** tiene su propia "energía eléctrica" (`.js`) y su propia "agua" (`.css`):

```text
GTA6/
│
├── index.html                   # 🚪 Puerta principal: carga el edificio y abre los locales activos
├── vercel.json                  # ⚡ Configuración de caché y velocidad máxima para Vercel
├── manifest.json                # 📱 Permite instalar el mapa como App en la pantalla del celular
├── .gitignore                   # 🛡️ Evita subir archivos basura o temporales a GitHub
│
├── vigilante/                   # 👮 EL VIGILANTE DE CALIDAD (Regla de Oro ≤ 250 líneas)
│   └── auditor.js               # Escanea todos los archivos y verifica ≤ 250 líneas y 0 errores
│
├── edificio/                    # 🏢 EL EDIFICIO PRINCIPAL (Siempre encendido)
│   ├── edificio.css             # Estilos de la estructura base y pantalla completa
│   ├── visor-mapa.js            # Motor de movimiento (arrastrar), zoom, vistas y #punto=
│   └── central-locales.js       # Tablero eléctrico: conecta, enciende o apaga cada local
│
├── locales/                     # 🏪 LOS 6 LOCALES INDEPENDIENTES (Módulos tipo LEGO)
│   │
│   ├── 01-iconos-mapa/          # Local 1: Dibuja los iconos encima del mapa
│   │   ├── iconos-mapa.js       # Lógica para colocar cada icono en su coordenada (X%, Y%)
│   │   └── iconos-mapa.css      # Diseño, colores y tamaño de los iconos en el mapa
│   │
│   ├── 02-menu-filtros/         # Local 2: Panel lateral estilo IGN y buscador
│   │   ├── menu-filtros.js      # Lógica para filtrar categorías y buscar lugares por texto
│   │   └── menu-filtros.css     # Diseño del menú desplegable en PC y móvil
│   │
│   ├── 03-tarjeta-info/         # Local 3: Ventana emergente al tocar un icono
│   │   ├── tarjeta-info.js      # Muestra foto bajo demanda, pista y botón "Copiar enlace directo"
│   │   └── tarjeta-info.css     # Diseño de la tarjeta informativa
│   │
│   ├── 04-progreso-jugador/     # Local 4: Sistema para tachar coleccionables completados ✅
│   │   ├── progreso-jugador.js  # Guarda en localStorage + Exportar/Importar progreso entre dispositivos
│   │   └── progreso-jugador.css # Estilo visual de los iconos completados y barra de progreso
│   │
│   ├── 05-pines-personales/     # Local 5: Marcadores y notas privadas del jugador
│   │   ├── pines-personales.js  # Permite al visitante guardar sus propios puntos en el mapa
│   │   └── pines-personales.css # Diseño visual de los pines personales
│   │
│   └── 06-modo-editor/          # Local 6: Herramienta de administración en 1 clic
│       ├── modo-editor.js       # Calcula coordenadas (X%, Y%) al hacer clic y genera JSON
│       └── modo-editor.css      # Panel flotante para crear y copiar nuevos puntos
│
├── recursos/                    # 🖼️ ARCHIVOS VISUALES OPTIMIZADOS
│   ├── mapa/
│   │   └── leonida-oficial.webp # Mapa oficial del Estado de Leonida y sus 6 regiones
│   └── iconos/
│       └── lamina-iconos.svg    # Hoja única con todos los iconos vectoriales estilo IGN (≤ 250 líneas)
│
├── datos/                       # 🗂️ DATOS DEL MAPA POR REGIÓN (Todos ≤ 250 líneas)
│   ├── categorias.json          # Definición de los 5 grupos de IGN, colores y nombres
│   ├── ubicaciones-vice-city.json # Puntos del mapa en Vice City con su (X%, Y%)
│   └── ubicaciones-regiones.json  # Puntos del resto de regiones de Leonida con su (X%, Y%)
│
└── Markdown/                    # 📄 Documentación de filosofía, plano y hoja de ruta
    ├── fundamentos/
    │   └── conceptos.md         # Los 4 pilares: Centro Comercial, 100% Speed, Lápiz de Carbón y ≤ 250 Líneas
    └── Mapa/
        ├── mapa.md              # Plan maestro del mapa y catálogo de iconos de IGN
        ├── mapa.word.md         # Checklist maestra de construcción paso a paso por fases
        └── plano.md             # Este documento: plano tecnológico y estructura de código
```

---

## 3. ¿Cómo Funciona el Aislamiento de Locales? (El Tablero Eléctrico)

El secreto para que ningún error en un local tumbe la web está en el archivo **`edificio/central-locales.js`**:

1. **Lista de Interruptores (Encendido / Mantenimiento):**
   El tablero central tiene una lista simple de qué locales están abiertos:
   ```javascript
   const ESTADO_LOCALES = {
     iconosMapa: true,       // Local 1: Encendido
     menuFiltros: true,      // Local 2: Encendido
     tarjetaInfo: true,      // Local 3: Encendido
     progresoJugador: true,  // Local 4: Encendido
     pinesPersonales: true,  // Local 5: Encendido
     modoEditor: false       // Local 6: Apagado para visitantes normales (solo tú lo enciendes)
   };
   ```
2. **Protección Anti-Fallos (Cortacircuitos individual):**
   * Cada local se carga dentro de su propia cápsula de seguridad (`try / catch`).
   * Si un local tiene un cable suelto o está en remodelación, el tablero eléctrico aísla ese local automáticamente y **el resto del edificio sigue funcionando al 100%**.
3. **Comunicación Limpia entre Locales:**
   * Los locales **nunca se tocan por dentro entre sí**.
   * Se comunican por avisos simples a través del edificio (por ejemplo: el *Local 2 de Filtros* avisa *"Ocultar Bancos"* y el *Local 1 de Iconos* los oculta). Si el Local 2 está cerrado, el Local 1 simplemente muestra todos los iconos sin dar error.

---

## 4. Configuración para el 100% en Google PageSpeed con Vercel

El archivo **`vercel.json`** aplicará tres reglas automáticas cuando subamos el proyecto:

1. **Caché Instantánea de Recursos:** Le indica al navegador que guarde en memoria la imagen del mapa (`leonida-oficial.webp`) y la lámina de iconos (`lamina-iconos.svg`) para que en la segunda visita carguen en **0 milisegundos**.
2. **Compresión Automática (Brotli / Gzip):** Reduce aún más el tamaño de los archivos `.html`, `.css`, `.js` y `.json` al viajar por internet.
3. **Cero Bloqueos:** Al no usar fuentes externas pesadas ni scripts de rastreo lentos, la página obtiene calificación verde **100/100 en Rendimiento, Accesibilidad y Buenas Prácticas** tanto en Móvil como en Escritorio.
