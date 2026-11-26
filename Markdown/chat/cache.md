# Plan de Caché en Vercel y Blindaje CDN — CANGEL GAMES

Este documento detalla la optimización de caché en `vercel.json` para `https://www.cangel.games` siguiendo los **Fundamentos Cangel** (**Lápiz de Carbón**, **Ley del Remolque** y **Umbral de Impacto ≥ 20–30%**): máximo ahorro de transferencia y velocidad en visitas repetidas tocando **1 solo archivo de configuración**, sin modificar el motor del mapa ni agregar complejidad innecesaria.

---

## 1. Diagnóstico Actual (Nivel 5 — Optimización de Alto Impacto)

* **Situación actual (`vercel.json`):** Las rutas `/edificio/*`, `/locales/*`, `/datos/*` (13 JSON con 2.532 marcadores) y `/recursos/iconos/*` tienen `Cache-Control: public, max-age=0, must-revalidate`. Además, `/recursos/og-share.jpg` no tiene regla explícita.
* **Problema en tráfico real:** Cada recarga o visita repetida obliga al navegador a revalidar ~18+ archivos contra Vercel, desperdiciando cuota del plan gratuito (**100 GB/mes**) y añadiendo latencia innecesaria en segundas visitas.
* **Impacto estimado:** Ahorro del **70% al 80%** en peticiones y ancho de banda de visitas recurrentes, y apertura casi instantánea desde caché del navegador (**0 ms** en red para activos cacheados).
* **Impacto en desarrollo local:** `vercel.json` **solo aplica en producción (Vercel)**; en `http://localhost:5000` los cambios locales se siguen viendo al instante.

---

## 2. Política de Caché Propuesta por Tipo de Archivo

| Ruta en `vercel.json` | Política `Cache-Control` | Duración | Motivo |
| :--- | :--- | :--- | :--- |
| `/recursos/mapa/(.*)` | `public, max-age=31536000, immutable` | 1 año | Se conserva intacto; activos base estables. |
| `/recursos/iconos/(.*)` y `/recursos/og-share.jpg` | `public, max-age=86400, stale-while-revalidate=604800` | 24h + 7d stale | Sprites e imagen OG cambian muy poco; ahorro directo en cada carga. |
| `/(edificio\|locales\|datos)/(.*)` | `public, max-age=3600, stale-while-revalidate=86400` | 1h + 24h stale | Equilibrio exacto: ahorra cuota en los 13 JSON y módulos JS/CSS sin dejar usuarios pegados a código viejo cuando salgan **Tarjeta de Información** o **Chat Radio Leonida**. |
| `/` (`index.html`) | Por defecto de Vercel (`max-age=0, must-revalidate`) | Siempre fresco | Garantiza que cada nuevo deploy entre limpio de inmediato. |
| `/(.*)` *(Seguridad)* | `nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy` | Permanente | Se mantienen intactas las cabeceras de seguridad actuales. |

---

## 3. Configuración Exacta Propuesta (`vercel.json`)

```json
{
  "cleanUrls": true,
  "trailingSlash": false,
  "headers": [
    {
      "source": "/recursos/mapa/(.*)",
      "headers": [
        { "key": "Cache-Control", "value": "public, max-age=31536000, immutable" }
      ]
    },
    {
      "source": "/recursos/iconos/(.*)",
      "headers": [
        { "key": "Cache-Control", "value": "public, max-age=86400, stale-while-revalidate=604800" }
      ]
    },
    {
      "source": "/recursos/og-share.jpg",
      "headers": [
        { "key": "Cache-Control", "value": "public, max-age=86400, stale-while-revalidate=604800" }
      ]
    },
    {
      "source": "/(edificio|locales|datos)/(.*)",
      "headers": [
        { "key": "Cache-Control", "value": "public, max-age=3600, stale-while-revalidate=86400" }
      ]
    },
    {
      "source": "/(.*)",
      "headers": [
        { "key": "X-Content-Type-Options", "value": "nosniff" },
        { "key": "X-Frame-Options", "value": "DENY" },
        { "key": "Referrer-Policy", "value": "strict-origin-when-cross-origin" }
      ]
    }
  ]
}
```

---

## 4. Checklist Detallada de Implementación

### Fase 1: Preparación y Ajuste de `vercel.json`
- [x] **Paso 1.1:** Revisar el archivo actual `vercel.json` y confirmar que las 3 cabeceras de seguridad (`X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`) permanecen intactas.
- [x] **Paso 1.2:** Verificar que `/recursos/mapa/(.*)` conserva `public, max-age=31536000, immutable` sin modificaciones.
- [x] **Paso 1.3:** Actualizar `/recursos/iconos/(.*)` y agregar `/recursos/og-share.jpg` con `public, max-age=86400, stale-while-revalidate=604800`.
- [x] **Paso 1.4:** Cambiar `/(edificio|locales|datos)/(.*)` de `max-age=0, must-revalidate` a `public, max-age=3600, stale-while-revalidate=86400`.
- [x] **Paso 1.5:** Confirmar que no se agrega caché agresivo a `/` (`index.html`), dejándolo fresco para cada deploy de Vercel.

### Fase 2: Auditoría y Verificación Local
- [x] **Paso 2.1:** Ejecutar `node vigilante/auditor.js` y confirmar **`Exit code: 0`** (0 errores de sintaxis, JSON válido y límite de líneas aprobado).
- [x] **Paso 2.2:** Confirmar en `http://localhost:5000` que el mapa, **Menú de Filtros** y **Contador en Vivo** cargan sin errores y sin regresiones.

### Fase 3: Despliegue y Validación en Producción (`www.cangel.games`)
- [ ] **Paso 3.1:** Con orden expresa de Cristian, realizar `git commit` y `git push origin main` para disparar el despliegue automático en Vercel.
- [ ] **Paso 3.2:** Verificar cabeceras HTTP reales en producción (`HEAD`) sobre:
  - `https://www.cangel.games/datos/categorias.json` → esperar `max-age=3600, stale-while-revalidate=86400`
  - `https://www.cangel.games/edificio/visor-mapa.js` → esperar `max-age=3600, stale-while-revalidate=86400`
  - `https://www.cangel.games/recursos/iconos/lamina-iconos.svg` → esperar `max-age=86400, stale-while-revalidate=604800`
  - `https://www.cangel.games/recursos/og-share.jpg` → esperar `max-age=86400, stale-while-revalidate=604800`
  - `https://www.cangel.games/` → confirmar que el HTML no queda bloqueado con caché largo.
- [ ] **Paso 3.3:** Abrir `https://www.cangel.games` dos veces en el navegador (DevTools → pestaña `Network`) y verificar que en la segunda carga los JS, CSS, SVG y JSON salen de caché (`disk cache` / `memory cache`).
- [ ] **Paso 3.4:** Correr prueba rápida en Google PageSpeed Insights y confirmar **100/100** intacto.

### Fase 4: Escudo CDN Adicional (Opcional · \$0 antes de picos virales)
- [ ] **Paso 4.1:** Conectar **Cloudflare (plan gratuito)** en el DNS de `www.cangel.games` para sumar caché CDN global y protección anti-DDoS sin tocar código del proyecto.
- [ ] **Paso 4.2:** Revisar la pestaña **Usage** en Vercel tras publicar los primeros Reels/TikToks para monitorear el consumo real frente al tope gratuito de 100 GB/mes.
