# Planificación Maestra por Etapas — CANGEL GAMES (`cangel.games`)

Este documento integra en **3 etapas prácticas de ejecución** los tres frentes del producto (**Comunidad**, **Modelo de Negocio** y **Software / Escalabilidad**) aprovechando el momento real actual (**GTA 6 recién lanzado hace 4 días — plena fiebre mundial**).

Conecta directamente lo definido en `Markdown/vision.md`, `Markdown/visitas.md`, `Markdown/chat/chat.md` y `Markdown/chat/moderador.md`, cumpliendo estrictamente los **Fundamentos Cangel** (`.agents/skills/fundamentos-cangel/SKILL.md`):
1. **Arquitectura Modular (LEGO):** Cada función (incluido **Chat Radio Leonida**) corre aislada en `edificio/central-locales.js`; si falla el chat o la IA, el mapa sigue operando al 100%.
2. **Velocidad Extrema (100/100 Google PageSpeed):** Carga bajo demanda (*Lazy Loading*) para el chat, videos y widgets; caché CDN optimizada y cero peso muerto en la apertura inicial.
3. **Filosofía del Lápiz de Carbón:** Lanzar primero lo esencial que genera comunidad y ventas hoy, sin sobre-ingeniería ni gastos prematuros.
4. **Regla de Oro (~250 líneas por archivo):** Todo módulo nuevo nace compacto y auditado por `vigilante/auditor.js`.

---

## Etapa 1: Lanzamiento Inmediato — MVP Rentable y Blindaje Base \$0
*Momento actual (Semana 1 de GTA 6 · 0 – 50.000 visitas/mes · Costo: **\$0 / mes**)*
*Objetivo: Sacar el chat en vivo esta misma semana para capturar la ola del lanzamiento real de GTA 6, convertir tráfico de `@cangelgames` hacia `cangelgames.store` y proteger el mapa contra picos iniciales.*

### A. Comunidad — Chat Radio Leonida (MVP)
- [ ] **Estructura aislada LEGO:** Crear `locales/07-chat-vivo/` con archivos limpios (~250 líneas c/u) conectado mediante `chatVivo: true` en `edificio/central-locales.js` y contenedor propio en `index.html`.
- [ ] **Lazy Loading estricto (100/100 PageSpeed):** Al abrir la web solo se pinta el botón flotante (~2 KB) **sin conectarse a Supabase ni abrir WebSocket**. El SDK, los mensajes y el contador `🟢 en vivo` cargan únicamente cuando el usuario abre el chat, con **auto-pausa tras 3 minutos de inactividad** (`Markdown/visitas.md`).
- [ ] **Arranque concentrado (Cero salas vacías):** Iniciar con **2 canales activos** (`🌴 General` y `⚠️ Spoilers`) para concentrar la conversación en el día 1.
- [ ] **Invitado Limitado + Miembro CANGEL (Google):**
  - Invitado anónimo (Supabase Anonymous Auth): lectura total + **3 a 5 mensajes/24h** (espera 30s).
  - Miembro Google: ilimitado (espera 5s), alias, foto, banderita 0 KB, plataforma (`PS5`/`Xbox`/`PC`), Gamertag público y **WhatsApp privado opcional** con casilla de consentimiento (tabla `perfiles_privados` blindada por RLS).
- [ ] **Reputación Permanente y Rangos (`❤️`):** Botón único de "Me gusta" (`❤️`) que conserva `likes_totales` aunque los mensajes se borren a las 24h, subiendo entre los 5 rangos (`🌴 Turista` → `🚗 Corredor` → `🕶️ Informante` → `💎 Socio Vice` → `👑 Leyenda de Leonida`, más `⚡ CANGEL OFICIAL` y `🤖 GUÍA IA`), con los **3 candados anti-trampa** en Supabase.
- [ ] **Chat conectado al mapa (`📍`):** Botón `"📍 Enviar ubicación"` (para registrados) conectado a `enfocarCoordenada()` de `edificio/visor-mapa.js`.
- [ ] **Base de Datos y Escudo Capa 1 (\$0):** Configurar tablas en Supabase, índice compuesto `(sala, created_at DESC)`, borrado automático 24h (`pg_cron` + RLS), `ON DELETE CASCADE` en `chat_likes`, rate-limit, palabras bloqueadas y lista blanca de enlaces.

### B. Modelo de Negocio (`Markdown/vision.md`)
- [ ] **Mensaje fijado diario de CANGEL GAMES:** Configurar banner superior con acceso directo a `cangelgames.store`, enlace real del **WhatsApp oficial** y anuncio del primer sorteo de Gift Card para miembros registrados.
- [ ] **Protección de marca:** Incluir nota discreta de *"Mapa interactivo comunitario no oficial — CANGEL GAMES"* para cuidar el dominio y la tienda frente a terceros.

### C. Escalabilidad Base (`Markdown/visitas.md` — Etapa 1)
- [ ] **Cloudflare DNS/CDN gratuito:** Colocar Cloudflare delante de `www.cangel.games` para caché global y protección anti-DDoS a costo \$0.
- [ ] **Optimizar caché en `vercel.json`:** Reemplazar `max-age=0` por caché eficiente (`public, max-age=3600, stale-while-revalidate=86400`) reduciendo hasta ~80% el consumo de transferencia en Vercel.

### D. Control de Calidad de Etapa 1
- [ ] Ejecutar `node vigilante/auditor.js` (0 errores, Regla de Oro ~250 líneas).
- [ ] Verificar **100/100 en Google PageSpeed** (móvil y escritorio) con el botón flotante activo.
- [ ] Probar apagado/fallo simulado de **Chat Radio Leonida** confirmando que el mapa sigue funcionando al 100%.

---

## Etapa 2: Despegue, Independencia Total y Moderador IA 24/7
*Crecimiento activo (50.000 – 500.000 visitas/mes · Costo estimado: **\$25 – \$35 / mes**)*
*Objetivo: Eliminar toda dependencia externa crítica, escalar la conversación por sesiones y automatizar la moderación y preventa 24/7.*

### A. Escalabilidad e Independencia (`Markdown/visitas.md` — Etapa 2)
- [ ] **Teselas HD propias en Cloudflare R2 (\$0 transferencia):** Migrar el zoom HD (`z=13..16`) fuera de `tiles.mapgenie.io` para evitar bloqueos por *hotlinking* en picos virales.
- [ ] **Hosting estático en Cloudflare Pages:** Migrar el estático para contar con ancho de banda ilimitado gratuito.
- [ ] **Defensa anti-bots y concurrencia:** Activar **Cloudflare Turnstile** invisible en sesiones anónimas y pasar a **Supabase Pro** cuando el chat supere los 200 usuarios simultáneos.

### B. Comunidad y Moderador IA (`Markdown/chat/chat.md` + `Markdown/chat/moderador.md`)
- [ ] **Salas Auto-Elásticas (Sharding):** Activar expansión automática por sesiones de **50–80 personas** (`Sesión #1`, `#2`...) con selector manual para amigos y abrir los canales adicionales (`🔍 Secretos & WAiNK`, `💰 Robos & Dinero`, `🌎 English / Global`) conforme la demanda los llene.
- [ ] **Moderador y Guía IA Capa 2 (`@cangel` / `@leonida`):** Desplegar Edge Function en Supabase (Gemini Flash / Flash-Lite) con sistema de **3 strikes**, calibración para vocabulario de GTA 6, blindaje anti *prompt-injection*, tope mensual de gasto (*Hard Cap*) e **interruptor remoto (`iaModerador: false`)**.

### C. Modelo de Negocio (`Markdown/vision.md`)
- [ ] **Filtro comercial con `@cangel`:** El asistente IA responde 24/7 dudas frecuentes (precios base, garantía de por vida, cuotas con Addi y Sistecrédito) para que al WhatsApp oficial lleguen clientes listos para comprar sin saturar atención humana.
- [ ] **Monetización de tráfico internacional:** Habilitar ruta de compra/afiliados de Gift Cards para jugadores fuera de Colombia (México, España, Argentina, Chile, EE.UU.) sin riesgo de contracargos.

---

## Etapa 3: Tráfico Viral Masivo y Ecosistema Completo
*Escala masiva (+1.000.000 visitas/mes · Escalable según ventas de `cangelgames.store`)*
*Objetivo: Consolidar `cangel.games` como el mapa comunitario #1 en español de GTA 6 con actualizaciones impulsadas por los propios jugadores.*

### A. Comunidad y Contenido Vivo (`Markdown/chat/chat.md` + `Markdown/vision.md`)
- [ ] **Crowdsourcing de secretos (`reportes_mapa`):** Permitir que Miembros CANGEL reporten nuevos hallazgos reales de GTA 6 con coordenadas `(X%, Y%)` para validarlos e integrarlos a los JSON oficiales con crédito de autor.
- [ ] **Multimedia bajo demanda (Regla 80/20):** Integrar fotos y videos cortos de `@cangelgames` (TikTok/YouTube/Reels) en los puntos más buscados del mapa, cargando solo miniatura ligera y reproducción al clic (PageSpeed 100/100 intacto).
- [ ] **Sincronización en la nube:** Aprovechar la cuenta Google del chat para sincronizar progreso y pines personales entre PC y celular (manteniendo `localStorage` por defecto sin registro obligatorio).
- [ ] **Dinámicas de retención por rango:** Sorteos periódicos de Gift Cards exclusivos o con bono extra para rangos altos (*Informante*, *Socio Vice*, *Leyenda de Leonida*).

### B. Escalabilidad Extrema (`Markdown/visitas.md` — Etapa 3)
- [ ] **Cortacircuitos de alta concurrencia:** Si Realtime alcanza su techo en un pico extremo, degradar el chat a modo lectura cada 15s sin afectar jamás al mapa.
- [ ] **Transporte WebSocket a escala masiva:** Escalar Realtime en Supabase o migrar el canal en vivo de **Chat Radio Leonida** a **Cloudflare Durable Objects**, manteniendo el mapa principal y sus marcadores prácticamente a costo \$0.

---

## Resumen de Sincronización de los 3 Pilares por Etapa

| Etapa | Comunidad (Propuesta de Valor) | Negocio (`cangelgames.store`) | Software y Escalabilidad (`visitas.md`) |
| :--- | :--- | :--- | :--- |
| **Etapa 1** *(Hoy · \$0)* | Chat 24h MVP (2 canales), Invitado/Google, `❤️` Rangos, `📍` mapa | Banner fijado, WhatsApp oficial, captura de base opt-in y 1er sorteo | **Chat Radio Leonida** aislado, Lazy Loading, auto-pausa 3m, Escudo \$0, Cloudflare CDN + caché |
| **Etapa 2** *(Despegue)* | Sesiones elásticas (50–80), +canales/idiomas, Moderador IA 3 strikes | Preventa 24/7 con `@cangel` + monetización internacional (afiliados) | Teselas propias en Cloudflare R2, Cloudflare Pages, Turnstile, Supabase Pro |
| **Etapa 3** *(Viral +1M)* | Reportes comunitarios, videos 80/20 bajo demanda, nube opcional | Sorteos por rango y fidelización continua hacia tienda y redes | Cortacircuitos lectura 15s y escalado WebSocket (Durable Objects) |
