---
name: fundamentos-cangel
description: >-
  Fundamentos sagrados de arquitectura, filosofía operativa y desarrollo técnico de Cangel Games (Mapa Interactivo GTA 6). Incluye la Regla de la Tuerca, la Analogía del Lápiz de Carbón, el Umbral de Impacto (20-30%), la Ley del Remolque y Arquitectura Centro Comercial/LEGO, la Escala de Criterio de 7 niveles, el Protocolo "TODO SÍ", el umbral saludable de líneas (180-350, techo duro 350), cero 'any', diseño minimalista limpio (cero 3D, cero alert() nativos), 100/100 Google PageSpeed, Regla de Oro (no editar código ni hacer backups en GitHub sin orden expresa) y verificación obligatoria al cierre. Activar SIEMPRE al planificar, programar, auditar o tomar cualquier decisión técnica en este proyecto.
---

# 🧠 Fundamentos Cangel

Esta Skill representa el **ADN filosófico, técnico y operativo de Cangel Games (`www.cangel.games`)**. Es de **cumplimiento obligatorio** en cualquier sesión de planificación, arquitectura, auditoría, revisión de código o desarrollo sobre el stack nativo del proyecto (**HTML5, CSS3, ES Modules puros, Vercel y Supabase**).

---

## 🔩 1. La Filosofía Central: La Regla de la Tuerca

> ⚙️ **La Máxima de la Tuerca Rodada:**  
> *«Una tuerca se aprieta solo hasta donde ajusta. Si te obsesionas con meterle la llave de fuerza para apretarla, apretarla y apretarla de más, aíslas la rosca: la tuerca se rueda, se barre y dañas el tornillo y la pieza entera.»*  
> Cuando un código ya funciona, resuelve el problema del jugador y está firme, obsesionarse con meter capas teóricas o sobre-optimizaciones termina rodando el código y rompiendo lo que estaba sano.

### ✏️ La Analogía del Lápiz de Carbón (Cristian, CEO de Cangel Games):
> *«En la carrera espacial se gastó 1 millón de dólares diseñando un bolígrafo cuya tinta funcionara en gravedad cero, cuando la solución más inteligente, simple y poderosa fue llevar un lápiz de punta de carbón.»*  
> Antes de instalar librerías pesadas, abrir WebSockets innecesarios o complicar esquemas de base de datos, **elegimos siempre la solución nativa más simple, directa y a prueba de fallos con cero riesgo.**

### 📊 El Umbral del Impacto Real (2-3% vs 20-30%+):
* **Micro-Optimización Académica (2% a 3%):** ❌ **PROHIBIDO.** Dividir archivos sanos en piezas diminutas solo por estética, o debatir sintaxis estéril.
* **Optimización de Alto Impacto (20% a 30%+):** ✅ **OBLIGATORIO.** Erradicar peticiones repetitivas, optimizar activos a WebP/AVIF/SVG, consolidar múltiples llamadas en 1 solo RPC atómico en Supabase o proteger el **100/100 en Google PageSpeed**.

---

## 🚗 2. La Ley del Remolque & Arquitectura Centro Comercial (LEGO)

> 🛑 **¡ALTO! PROHIBIDO TOCAR CÓDIGO EXISTENTE PARA "MODERNIZARLO"**  
> **La web actual es un carro que YA rueda y funciona a 60 FPS.** Reescribir módulos estables solo para adaptarlos a teorías nuevas equivale a cortar el chasis del carro en marcha.

1. **Lo que funciona no se refactoriza:** El **Edificio Principal** (`edificio/visor-mapa.js`, `edificio/edificio.css`) y los **Locales** ya probados (`01-iconos-mapa`, `02-menu-filtros`, `08-en-vivo`) se consideran estables.
2. **El Remolque (Locales Aislados):** Cada nueva funcionalidad entra como un **Local independiente** dentro de `locales/` con su propio CSS/JS e interruptor aislado (`try / catch`) en `edificio/central-locales.js`. Si un local falla o se apaga, el mapa sigue operando al 100%.
3. **Aplicación Exclusiva a Código Nuevo:** Las reglas nuevas aplican únicamente a módulos, tablas y piezas creadas desde cero.

---

## 🧭 3. Escala de Criterio de la IA (Taxonomía de 7 Niveles)

La IA debe clasificar cualquier hallazgo o propuesta dentro de esta escala:

| Nivel | Clasificación | Significado | Acción Obligatoria de la IA |
|:---:|---|---|---|
| **1** | **Ambigüedad** | Requerimiento con doble sentido o camino poco claro. | 🚨 **Preguntar de inmediato** (2 a 3 opciones cortas) antes de tocar código. |
| **2** | **Inconsistencia** | Un patrón se comporta diferente al estándar del proyecto. | ⚠️ **Advertir la diferencia** y sugerir unificación de patrón. |
| **3** | **Incoherencia** | Contradicción lógica que romperá producción o corromperá datos. | 🛑 **Frenar y alertar con firmeza.** Callarse aquí es negligencia. |
| **4** | **Mejora** | Ergonomía práctica, legibilidad o usabilidad que quita fricción. | ✨ **Aplicar con precisión** sin añadir piezas móviles. |
| **5** | **Optimización** | Ahorro real del **20% a 30%+** en red, tiempo, cuota o rendimiento. | 💡 **Proponer con métrica medible** y pedir aprobación de Cristian. |
| **6** | **Súper Optimización** | Arquitectura maestra (RPC de 1 viaje, carga diferida en 0 ms). | 🏆 **Priorizar y ejecutar** bajo liderazgo de Cristian. |
| **7** | **Sobre-Ingeniería** | Capas teóricas, suposiciones no pedidas o complejidad innecesaria. | 🚫 **Auto-Censura Obligatoria:** Descartar de inmediato sin molestar a Cristian. |

> 📌 **Protocolo de la Respuesta Maestra (`"TODO SÍ"`):**  
> Cuando la IA formule de 2 a 4 preguntas de decisión y Cristian responda **`"TODO SÍ"`**, se suspende de inmediato cualquier debate teórico y se procede a construir.

---

## 🏗️ 4. Leyes Técnicas de Código y Arquitectura

1. **Umbral Saludable de Líneas (180 a 350 líneas · Techo Duro 350):**
   * **180 líneas** es la referencia sugerida y el rango **180 a 350 líneas** es un margen flexible (**no una camisa de fuerza**): jamás entregar código roto, mutilado o incompleto por evitar pasar de 180 líneas.
   * **Techo duro de 350 líneas:** Si un archivo supera sí o sí las **350 líneas**, entonces sí se divide limpiamente en submódulos compactos (ej. ~150 y ~150 líneas) para mantener legibilidad y aprobar `vigilante/auditor.js`.
2. **Un Archivo, Una Sola Responsabilidad (Cero Mega-Locales):**
   * Prohibidos los monolitos donde el motor del mapa, filtros, red y paneles de UI convivan en el mismo archivo.
3. **Tipado Estricto (CERO `any`):**
   * En cualquier archivo TypeScript, Edge Function de Supabase o contrato tipado que se incorpore, **cero `any`**. Validar siempre entradas y esquemas de datos.
4. **Diseño Minimalista Limpio:**
   * **CERO 3D:** Prohibido usar iconos, stickers o gráficos tridimensionales o inflados.
   * **Iconografía:** 100% minimalista, plana (*flat*) y de trazo fino (`1.5px` a `2px`) en **SVG puro** (`recursos/iconos/lamina-iconos.svg` o SVG inline ligero).
   * **Cero `alert()` nativos:** Prohibido usar `alert()`, `confirm()` o `prompt()` del navegador; usar modales o avisos (*toasts*) propios con la estética limpia del proyecto.
5. **Regla de Viaje Único (RPC Atómicos < 10 ms):**
   * Cuando un flujo necesite varias lecturas/escrituras en Supabase, se consolida en una sola función RPC en PostgreSQL con `SECURITY DEFINER` + RLS cerrada y `fetch()` nativo siempre que no haga falta cargar un SDK pesado.
6. **Velocidad Extrema y Carga Bajo Demanda (100/100 Google PageSpeed):**
   * Carga inicial mínima (cero peso muerto, LCP/CLS/INP en verde).
   * Módulos secundarios, multimedia o SDKs externos (ej. chat en vivo) se cargan únicamente mediante `import()` dinámico bajo demanda o diferidos tras el pintado inicial.

---

## 🏁 5. Protocolo Inquebrantable de Cierre de Tareas

En toda tarea o checklist de desarrollo:
1. **Regla de Oro:** **NUNCA** crear/editar código ni hacer commits/backups en GitHub (`git push`) sin la **orden expresa** de Cristian.
2. **Auditoría de Líneas y Sintaxis:** Verificar que ningún archivo exceda el techo duro de **350 líneas** y mantenga sintaxis limpia.
3. **Verificación Local Obligatoria:** Ejecutar siempre `node vigilante/auditor.js` (y el comando de build/compilación si el proyecto incorpora uno) y confirmar **`Exit code: 0` (0 errores)** antes de dar por terminada cualquier tarea.
