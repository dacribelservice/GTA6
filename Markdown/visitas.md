# Plan de Escalabilidad y Alta Concurrencia (Miles a Millones de Visitas)

Este documento analiza la capacidad real de `www.cangel.games` para resistir picos virales de miles o millones de visitas, identifica los cuellos de botella concretos del proyecto actual y define cómo blindar los cimientos respetando estrictamente los **4 pilares fundamentales de `Markdown/fundamentos/conceptos.md`**:
1. **Arquitectura Modular y Aislada (Centro Comercial / LEGO):** Si en un pico masivo falla el chat o la IA, el mapa principal sigue funcionando al 100%.
2. **Velocidad Extrema (100/100 en Google PageSpeed):** Caché inteligente, carga bajo demanda (*Lazy Loading*) y cero peso muerto.
3. **Filosofía del Lápiz de Carbón:** Escalar por etapas sin sobre-ingeniería ni gastar dinero antes de que el tráfico lo exija.
4. **Regla de Oro (~250 líneas por archivo):** Mantener archivos limpios, ligeros y fáciles de auditar por `vigilante/auditor.js`.

---

## 1. Diagnóstico de la Base Actual

**Veredicto:** La base arquitectónica del proyecto (HTML5, CSS3, ES Modules puros, JSON estáticos y 0 frameworks pesados) es **ideal para soportar millones de visitas** con costos mínimos. El núcleo del mapa se sirve como archivos estáticos desde CDN sin sobrecargar ningún servidor backend.

No obstante, existen **4 cuellos de botella concretos** que conviene blindar desde los cimientos antes de recibir picos masivos de tráfico desde TikTok, YouTube e Instagram.

---

## 2. Los 4 Puntos Críticos a Blindar

### 1. 🚨 Dependencia de Teselas HD Externas (`edificio/visor-mapa.js`)
* **Situación actual:** El zoom HD (`z=13..16`) carga imágenes directamente desde `tiles.mapgenie.io`.
* **Riesgo en tráfico masivo:** Ante cientos de miles de peticiones concurrentes, el proveedor externo puede bloquear el acceso (*hotlinking*) o cambiar las rutas (`day-v2`), dejando el mapa sin detalle HD de inmediato.
* **Solución:** Alojar nuestras propias teselas HD optimizadas en WebP dentro de **Cloudflare R2** (almacenamiento de objetos con **\$0 en costo de transferencia / zero egress fees**), garantizando independencia total y costos mínimos incluso con millones de visitas.

### 2. 🚨 Política de Caché y Límite de Transferencia (`vercel.json`)
* **Situación actual:** `vercel.json` configura `Cache-Control: public, max-age=0, must-revalidate` en `/edificio/*`, `/locales/*`, `/datos/*` y `/recursos/iconos/*`. Esto fuerza revalidaciones constantes en cada recarga. Además, el plan gratuito de Vercel tiene tope de **100 GB/mes** de transferencia.
* **Riesgo en tráfico masivo:** Un video viral puede agotar rápidamente la cuota gratuita de ancho de banda si cada visita repetida vuelve a consultar los 11 JSON de marcadores y los módulos JS/CSS.
* **Solución (a costo \$0):**
  1. Colocar **Cloudflare (plan gratuito)** delante de `www.cangel.games` para obtener caché CDN global, firewall y protección **anti-DDoS** gratuita — o migrar el alojamiento estático a **Cloudflare Pages** (ancho de banda **ilimitado gratuito** para activos estáticos).
  2. Optimizar las cabeceras en `vercel.json` hacia `public, max-age=3600, stale-while-revalidate=86400` (o versionado `?v=` con `immutable`), reduciendo hasta un **80%** el consumo de transferencia en visitas recurrentes.

### 3. 🚨 Concurrencia del Chat en Vivo (`Local #7` / Supabase Realtime)
* **Situación actual / planificada:** El mapa estático soporta millones de visitas casi gratis, pero las conexiones WebSocket en tiempo real son el componente más sensible a picos simultáneos (Supabase Free: **200 conexiones Realtime simultáneas**; Supabase Pro \$25/mes: **500+** escalables).
* **Cimientos obligatorios desde el día 1:**
  1. **Lazy Loading estricto:** Abrir WebSocket únicamente cuando el usuario hace clic en abrir el chat (si hay 50.000 personas en el mapa y el 3% abre el chat, solo se consumen 1.500 conexiones).
  2. **Auto-pausa por inactividad:** Desconectar automáticamente el WebSocket tras ~3 minutos sin actividad en el chat, mostrando un botón ligero *"Reconectar"* (multiplica ~3× la capacidad real).
  3. **Degradación elegante (Cortacircuitos):** Si Realtime alcanza su techo en un pico extremo, el chat no se rompe ni afecta el mapa; pasa automáticamente a modo lectura por consulta periódica (cada 15s) o se aísla el Local #7.
  4. **Índices SQL optimizados:** Crear desde el arranque índice compuesto `(canal, created_at DESC)` en `chat_mensajes` e índice en `user_id` para mantener consultas por debajo de 2 ms.

### 4. 🚨 Defensa Contra Bots y Tope de Costo en la IA Moderadora
* **Riesgo en tráfico masivo:** Bots automatizados spameando mensajes anónimos para saturar Supabase o disparar la factura de la API de IA (`Markdown/chat/moderador.md`).
* **Solución:**
  * **Cloudflare Turnstile (gratuito e invisible):** Valida tráfico humano antes de abrir sesiones anónimas sospechosas sin mostrar CAPTCHAs molestos.
  * **Escudo Capa 1 en SQL a costo \$0:** Rate-limit estricto (30s invitados / 5s registrados) y bloqueo de links no autorizados antes de invocar la IA.
  * **Control de presupuesto e interruptor remoto:** Fijar un límite mensual máximo (*Hard Cap*) en el proveedor de IA y disponer de un interruptor remoto (`iaModerador: false`) para desactivar la IA en 1 clic ante ataques masivos sin detener el mapa ni el chat.

---

## 3. Hoja de Ruta de Escalado por Etapas (Lápiz de Carbón)

| Etapa de Tráfico | Infraestructura Recomendada | Costo Estimado |
| :--- | :--- | :--- |
| **Etapa 1: Arranque**<br>*(0 – 50.000 visitas/mes)* | Base actual en Vercel + caché optimizada en `vercel.json` + Cloudflare DNS/CDN gratis + Supabase Free (con Lazy Loading, auto-pausa e índices SQL). | **\$0 / mes** |
| **Etapa 2: Despegue**<br>*(50.000 – 500.000 visitas/mes)* | Teselas HD propias en **Cloudflare R2** + hosting estático en **Cloudflare Pages** (ancho de banda ilimitado) + Supabase Pro (si se superan 200 simultáneos en chat) + Cloudflare Turnstile. | **\$25 – \$35 / mes** |
| **Etapa 3: Tráfico Viral**<br>*(+1.000.000 visitas/mes)* | El mapa y sus 2.532 marcadores siguen costando casi **\$0** en Cloudflare; se escalan conexiones Realtime de Supabase o se migra el transporte WebSocket del chat a **Cloudflare Durable Objects** (diseñado para decenas de miles de usuarios simultáneos a bajo costo). | **Escalable según ventas de `cangelgames.store`** |
