# Plano Arquitectónico y Tecnológico del Proyecto (GitHub + Vercel)

Este documento es el **plano oficial de ingeniería y estructura de carpetas** de la web del Mapa de GTA 6. Define las tecnologías exactas, la organización del código bajo el modelo de **Centro Comercial (LEGO)** y cómo funcionará el despliegue con **GitHub y Vercel** para garantizar el **100/100 en Google PageSpeed**.

---

## 1. Tecnologías Elegidas (Filosofía "Lápiz de Carbón")

Para evitar sobre-ingeniería, dependencias pesadas que se rompen con el tiempo o tiempos de carga lentos, utilizamos tecnologías nativas de alto rendimiento:

### A. Código Base (Cero Librerías Pesadas)
1. **HTML5 Puro (`index.html`):**
   * Estructura limpia y directa que carga en el primer milisegundo.
2. **CSS3 Modular Aislado (`.css` por cada módulo):**
   * Cada módulo tiene su propia hoja de diseño. Los estilos de un módulo no se mezclan ni rompen el diseño de otro.
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
   * Guarda todo el proyecto ordenado. Cada módulo nuevo que construyamos queda respaldado paso a paso.
2. **Vercel (Servidor Mundial Ultra Rápido):**
   * Conectado directamente a nuestro repositorio de GitHub.
   * Cada vez que subimos un cambio a GitHub (`git push`), Vercel actualiza la web pública en **2 segundos**.
   * Al ser código nativo puro, Vercel no pierde tiempo compilando paquetes pesados y sirve la web desde el servidor más cercano al visitante en cualquier país del mundo.

---

## 2. El Plano Completo de Carpetas (Arquitectura Modular)

Cada carpeta tiene una responsabilidad única. El **Motor Principal del Mapa** (`edificio/`) sostiene la estructura y cada **módulo independiente** dentro de `locales/` tiene su propia lógica (`.js`) y estilos (`.css`):

```text
GTA6/
│
├── index.html                   # 🚪 Puerta principal: carga el motor del mapa y los módulos activos
├── vercel.json                  # ⚡ Configuración de caché y velocidad máxima para Vercel
├── manifest.json                # 📱 Permite instalar el mapa como App en la pantalla del celular
├── .gitignore                   # 🛡️ Evita subir archivos basura o temporales a GitHub
├── AGENTS.md                    # 📜 Regla de Oro y normas del proyecto
├── .agents/skills/fundamentos-cangel/SKILL.md # 🧠 Fundamentos Cangel
│
├── vigilante/                   # 👮 EL VIGILANTE DE CALIDAD (Techo duro ≤ 350 líneas)
│   └── auditor.js               # Escanea todos los archivos y verifica límites y 0 errores
│
├── edificio/                    # 🏢 MOTOR PRINCIPAL DEL MAPA (Siempre encendido)
│   ├── edificio.css             # Estilos de la estructura base y pantalla completa
│   ├── visor-mapa.js            # Motor de movimiento (arrastrar), zoom, vistas y #punto=
│   └── central-locales.js       # Tablero de interruptores: conecta, enciende o apaga cada módulo
│
├── locales/                     # 🧩 MÓDULOS INDEPENDIENTES (Arquitectura LEGO)
│   │
│   ├── 01-iconos-mapa/          # Iconos del Mapa: dibuja los marcadores sobre el mapa
│   │   ├── iconos-mapa.js       # Lógica para colocar cada icono en su coordenada (X%, Y%)
│   │   └── iconos-mapa.css      # Diseño, colores y tamaño de los iconos en el mapa
│   │
│   ├── 02-menu-filtros/         # Menú de Filtros y Buscador: panel lateral estilo IGN
│   │   ├── menu-filtros.js      # Lógica para filtrar categorías y buscar lugares por texto
│   │   └── menu-filtros.css     # Diseño del menú desplegable en PC y móvil
│   │
│   ├── 03-tarjeta-info/         # Tarjeta de Información: ventana emergente al tocar un icono
│   │   ├── tarjeta-info.js      # Muestra foto bajo demanda, pista y botón "Copiar enlace directo"
│   │   └── tarjeta-info.css     # Diseño de la tarjeta informativa
│   │
│   ├── 04-progreso-jugador/     # Progreso del Jugador: tachar coleccionables completados ✅
│   │   ├── progreso-jugador.js  # Guarda en localStorage + Exportar/Importar progreso
│   │   └── progreso-jugador.css # Estilo visual de los iconos completados y barra de progreso
│   │
│   ├── 05-pines-personales/     # Mis Pines Personales: marcadores y notas privadas del jugador
│   │   ├── pines-personales.js  # Permite al visitante guardar sus propios puntos en el mapa
│   │   └── pines-personales.css # Diseño visual de los pines personales
│   │
│   ├── 06-modo-editor/          # Modo Editor: herramienta de administración en 1 clic
│   │   ├── modo-editor.js       # Calcula coordenadas (X%, Y%) al hacer clic y genera JSON
│   │   └── modo-editor.css      # Panel flotante para crear y copiar nuevos puntos
│   │
│   ├── 07-chat-vivo/            # Chat Radio Leonida: comunidad en vivo 24h (planificado)
│   │
│   └── 08-en-vivo/              # Contador en Vivo: personas activas en la web (Supabase)
│       ├── en-vivo.js           # Latido ligero via fetch() y RPC en Supabase
│       └── en-vivo.css          # Cápsula minimalista sobre los controles del mapa
│
├── recursos/                    # 🖼️ ARCHIVOS VISUALES OPTIMIZADOS
│   ├── og-share.jpg             # Imagen Open Graph para WhatsApp y redes sociales
│   ├── mapa/
│   │   └── leonida-oficial.webp # Mapa oficial del Estado de Leonida y sus 6 regiones
│   └── iconos/
│       └── lamina-iconos.svg    # Hoja única con todos los iconos vectoriales estilo IGN
│
├── datos/                       # 🗂️ DATOS DEL MAPA POR REGIÓN
│   ├── categorias.json          # Definición de los grupos y categorías, colores y nombres
│   └── ubicaciones-*.json       # Puntos del mapa de Leonida con su (X%, Y%)
│
└── Markdown/                    # 📄 Documentación de visión, escalabilidad, chat y mapa
    ├── chat/                    # chat.md, moderador.md, cache.md
    └── Mapa/                    # mapa.md, mapa.word.md, plano.md, cartegorias.md
```

---

## 3. ¿Cómo Funciona el Aislamiento de Módulos? (`central-locales.js`)

El secreto para que ningún error en un módulo tumbe la web está en el archivo **`edificio/central-locales.js`**:

1. **Lista de Interruptores (Encendido / Mantenimiento):**
   El tablero central tiene una lista simple de qué módulos están activos:
   ```javascript
   const ESTADO_LOCALES = {
     iconosMapa: true,       // Iconos del Mapa: Encendido
     menuFiltros: true,      // Menú de Filtros y Buscador: Encendido
     tarjetaInfo: false,     // Tarjeta de Información: Pendiente
     progresoJugador: false, // Progreso del Jugador: Pendiente
     pinesPersonales: false, // Mis Pines Personales: Pendiente
     modoEditor: false,      // Modo Editor: Apagado para visitantes
     enVivo: true            // Contador en Vivo: Encendido
   };
   ```
2. **Protección Anti-Fallos (Cortacircuitos individual):**
   * Cada módulo se carga dentro de su propia cápsula de seguridad (`try / catch`).
   * Si un módulo falla o está en mantenimiento, el tablero lo aísla automáticamente y **el mapa sigue funcionando al 100%**.
3. **Comunicación Limpia entre Módulos:**
   * Los módulos **nunca se tocan por dentro entre sí**.
   * Se comunican por avisos simples a través del motor principal (por ejemplo: **Menú de Filtros** avisa *"Ocultar Bancos"* e **Iconos del Mapa** los oculta). Si **Menú de Filtros** está apagado, **Iconos del Mapa** simplemente muestra todos los iconos sin dar error.

---

## 4. Configuración para el 100% en Google PageSpeed con Vercel

El archivo **`vercel.json`** aplicará tres reglas automáticas cuando subamos el proyecto:

1. **Caché Instantánea de Recursos:** Le indica al navegador que guarde en memoria la imagen del mapa (`leonida-oficial.webp`) y la lámina de iconos (`lamina-iconos.svg`) para que en la segunda visita carguen en **0 milisegundos**.
2. **Compresión Automática (Brotli / Gzip):** Reduce aún más el tamaño de los archivos `.html`, `.css`, `.js` y `.json` al viajar por internet.
3. **Cero Bloqueos:** Al no usar fuentes externas pesadas ni scripts de rastreo lentos, la página obtiene calificación verde **100/100 en Rendimiento, Accesibilidad y Buenas Prácticas** tanto en Móvil como en Escritorio.
