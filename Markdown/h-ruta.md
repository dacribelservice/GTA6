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
- [ ] **1.6** Subir copia de seguridad a **GitHub** (`git push`) para desplegar en **Vercel** y confirmar el funcionamiento del pellizco en un celular real.