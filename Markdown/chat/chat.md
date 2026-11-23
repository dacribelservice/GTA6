# Planificación Inicial — Local #7: Chat en Vivo 24 Horas ("Radio Leonida")

Este documento define la **planificación inicial, estrategia, modelo de usuarios globales, arquitectura técnica con Supabase y funcionalidades complementarias** para el chat en vivo efímero (24 horas) estilo grupo de WhatsApp de `www.cangel.games`, respetando estrictamente los **4 pilares del proyecto** (`Markdown/fundamentos/conceptos.md`): **Centro Comercial (LEGO)**, **100/100 en Google PageSpeed**, **Filosofía del Lápiz de Carbón** y **Regla de Oro (~250 líneas por archivo)**.

---

## 1. Visión y Análisis Estratégico

Integrar un chat en vivo directamente sobre el mapa interactivo de GTA 6 convierte una consulta solitaria en un punto de encuentro comunitario global en plena fiebre del juego, diferenciando a **CANGEL GAMES** frente a mapas tradicionales como IGN o MapGenie.

### Ventajas Clave
* **Diferenciación real:** Los visitantes no solo buscan un marcador y salen en segundos; interactúan en tiempo real preguntando por ubicaciones, secretos, vehículos o soluciones.
* **Dinámica efímera de 24 horas:** Genera sensación de *"radio en vivo del día"* (FOMO sano), mantiene la conversación siempre fresca y evita acumular historiales pesados.
* **Retención y viralidad orgánica:** Los jugadores que reciben ayuda rápida en vivo vuelven al mapa y comparten el enlace oficial en sus grupos de WhatsApp y Discord.

### Riesgos Identificados y Mitigación Desde el Día 1
| Riesgo | Mitigación Planificada |
| :--- | :--- |
| **Efecto "sala vacía" y fricción al inicio** | Lectura pública sin registro + **Modo Invitado Limitado** (3–5 mensajes/24h sin registro), tracción inicial desde `@cangelgames`, contador en línea y **mensaje fijado diario** de CANGEL GAMES. |
| **Trolls, spam y spoilers** | Sesión anónima rastreable (*Supabase Anonymous Auth*), cooldown más estricto para invitados (30s) y registrados (5s), Escudo Capa 1 + Moderador IA (`Markdown/chat/moderador.md`), baneo en 1 clic y canal de spoilers. |
| **Caída de velocidad (PageSpeed)** | **Carga bajo demanda (Lazy Loading):** al abrir la web solo se pinta un botón flotante ligero (~2 KB). El SDK de Supabase y el WebSocket solo se cargan si el usuario abre el chat. |
| **Límites del Plan Gratis en picos virales** | Conectar Realtime únicamente con el chat abierto y desconectar automáticamente tras unos minutos de inactividad, multiplicando la capacidad real del plan gratuito. |

---

## 2. Arquitectura Modular: Local #7 (`locales/07-chat-vivo/`)

El chat se integrará como un local 100% independiente dentro del tablero eléctrico (`edificio/central-locales.js`) mediante el interruptor `chatVivo: true`. Si entra en mantenimiento o Supabase presenta una falla, el mapa y el resto de locales siguen funcionando sin interrupciones.

### Distribución de Archivos (Regla de Oro: ~250 líneas c/u)
```text
locales/07-chat-vivo/
├── chat-vivo.css        # Botón flotante + panel lateral/drawer estilo WhatsApp (tema neón Vice City)
├── chat-vivo.js         # Orquestador ultraligero: dibuja el botón flotante y carga el resto bajo demanda
├── chat-supabase.js     # Importado dinámicamente al abrir el chat (Auth Anónimo/Google, Realtime y Presence)
└── chat-ui.js           # Burbujas, banderas, avatares, perfil, menciones de mapa, cooldown y controles admin
```

### Estrategia para Mantener 100/100 en Google PageSpeed
1. **Arranque en 0 ms extra:** `chat-vivo.js` no importa Supabase al inicio; solo inyecta el botón flotante (`💬 Radio Leonida`) y queda en espera.
2. **Importación dinámica al primer clic:** Cuando el usuario toca el botón del chat, se importa `chat-supabase.js` (cargando `@supabase/supabase-js` vía ESM CDN), se descargan los mensajes de las últimas 24h y se abre el canal Realtime.
3. **Desconexión inteligente:** Al cerrar el panel o detectar inactividad prolongada, se cierra la suscripción WebSocket para ahorrar batería, memoria y cuota de conexiones.

---

## 3. Modelo de Usuarios Globales: Invitado Limitado vs. Miembro Registrado

Para maximizar la participación de visitantes de todo el mundo sin sacrificar seguridad ni conversión, el chat adopta un sistema de **fricción cero al entrar + incentivos reales para registrarse con Google**.

### A. ¿Por Qué Permitir Comentar Sin Registro (Modo Invitado)?
* Entre el **70% y 80%** del tráfico que llega desde TikTok, Reels o WhatsApp en móvil abandona si encuentra un muro de registro antes de hacer una pregunta rápida.
* Usando **Supabase Anonymous Sign-In**, el visitante recibe de forma invisible un `user_id` temporal real (ej. `🇨🇴 Invitado #482`) sujeto a las mismas reglas RLS, límites y Moderador IA.
* Cuando el invitado decide pulsar **"Entrar con Google"**, su cuenta anónima se vincula a Google en 2 segundos sin perder su sesión.

### B. Matriz de Incentivos (Invitado vs. Miembro CANGEL)
| Función / Beneficio | 👤 Invitado (Sin registro) | ⭐ Miembro CANGEL (Google) |
| :--- | :--- | :--- |
| **Explorar el mapa y leer el chat** | ✅ Total | ✅ Total |
| **Escribir en el chat** | ✅ **3 a 5 mensajes / 24h** (espera de 30s) | ✅ **Ilimitado** (espera de 5s) |
| **Identidad visible** | `🇨🇴 Invitado #482` + avatar genérico | **Alias propio + Foto + Banderita + Rango + Plataforma (`PS5`/`Xbox`/`PC`)** |
| **Compartir puntos del mapa (`📍`)** | ❌ Bloqueado | ✅ Envía ubicaciones clicables al chat |
| **Responder (`reply`) y "Me gusta" (`❤️`)** | ❌ Solo lectura | ✅ Completo (da/recibe `❤️` y sube de rango) |
| **Rangos de comunidad (Reputación)** | ❌ Sin rango | ✅ **Permanente** (`🌴 Turista` → `👑 Leyenda`) |
| **Gamertag público (PSN / Xbox / Rockstar)** | ❌ No | ✅ Sí (para agregar amigos y jugar online) |
| **Reportar nuevos secretos en el mapa** | ❌ Bloqueado | ✅ Sí (con crédito de autor) |
| **🎁 Sorteos de Gift Cards CANGEL GAMES** | ❌ No participa | ✅ **Participa automáticamente** (con dinámicas por rango) |
| **☁️ Sincronizar progreso en la nube (futuro)** | ❌ Solo en ese dispositivo | ✅ Sincronizado entre PC y celular |

* **Gatillo natural de registro:** Al llegar al tope de mensajes de invitado o al tocar una función bloqueada (`📍 Enviar ubicación`, `❤️ Me gusta`, `Responder`), aparece un aviso amigable invitando a conectar Google en 2 segundos para desbloquear todo, empezar a subir de rango y entrar en los sorteos de Gift Cards de **CANGEL GAMES**.

### C. Identidad Global y Privacidad de Datos (Público vs. Privado)
* **Banderita de país (`🇨🇴 🇲🇽 🇪🇸 🇦🇷 🇺🇸 ...` — 0 KB):** Detectada automáticamente mediante la cabecera de IP de Vercel (`x-vercel-ip-country`, con opción editable en perfil). En BD se guarda el código ISO de 2 letras (`"CO"`, `"MX"`, `"US"`) y se convierte a emoji nativo en 3 líneas de JS sin cargar imágenes.
* **Alias + ID numérico (`#0482`) y Foto:** Permite mantener privacidad gamer sin exponer el nombre legal completo de Gmail. Al entrar con Google se sugiere su foto y alias (editables).
* **Gamertag público opcional:** Permite compartir PSN ID, Xbox Gamertag o Rockstar ID para encontrar compañeros de partida.
* **⚠️ Número de contacto (WhatsApp) — ESTRICTAMENTE PRIVADO Y OPCIONAL:**
  * **Nunca se muestra públicamente en el chat** (protege privacidad, evita robo de números/estafas y respeta normativas de datos).
  * Se solicita de forma **opcional con casilla de consentimiento explícito** en su perfil privado: *"Deja tu WhatsApp (privado) para avisarte si ganas una Gift Card de CANGEL GAMES o recibir ofertas exclusivas de GTA 6 y membresías"*.
  * **Solo es accesible para el propio usuario y el administrador** (construyendo una base de clientes segmentada por país con permiso real).

---

## 4. Salas Auto-Elásticas (Sharding / Sesiones estilo GTA Online)

Para evitar el caos de meter a miles de personas en una sola conversación ilegible y multiplicar la velocidad tanto en el servidor como en el celular del jugador, el chat implementará **particionamiento automático por sesiones (*Sharding*)**.

### A. Por Qué Ahorra Velocidad y Cuota (Efecto *Fan-Out*)
* **1.000 personas en 1 sola sala:** Si entran 50 mensajes/minuto, el servidor realiza `50 × 1.000 = 50.000 entregas/minuto`. El chat se vuelve una cascada imposible de leer, consume batería/CPU en móviles y agota rápido la cuota de mensajes Realtime.
* **1.000 personas en 10 sesiones de 100:** Cada mensaje solo se entrega a su sesión (`50 × 100 = 5.000 entregas/minuto`), logrando **10× menos tráfico y hasta 80%–90% de ahorro en cuota de mensajes Realtime**, manteniendo **60 FPS** fluidos en el mapa de fondo y una conversación real estilo grupo de WhatsApp.
* **Matiz técnico:** Dividir en sesiones reduce drásticamente el consumo de **mensajes y lag**, mientras que el total de **conexiones WebSocket simultáneas** se controla combinándolo con **Lazy Loading** y **auto-pausa tras 3 minutos de inactividad** (ver `Markdown/visitas.md`).

### B. Reglas de Funcionamiento (Cero Salas Vacías — Lápiz de Carbón)
1. **Arranque concentrado:** Cada canal comienza con **1 sola sesión activa** (ej. `🌴 Leonida — Sesión #1`). Nunca se abren salas vacías por adelantado.
2. **Cupo óptimo por sesión:** **50 a 80 personas conectadas** (punto dulce donde siempre hay actividad sin perder legibilidad).
3. **Expansión elástica automática:** Solo cuando `Sesión #1` alcanza el tope (80 usuarios), el sistema abre automáticamente `Sesión #2` y dirige allí a los nuevos visitantes (`#3`, `#4`... de forma ilimitada).
4. **Agrupación global por idioma:** Al escalar tráfico internacional, las sesiones se segmentan primero por idioma detectado por país (`🇪🇸 Español #1`, `🇺🇸 English #1`, `🇧🇷 Português #1`) y cada idioma se expande elásticamente según su demanda.
5. **Selector manual para amigos:** Cada usuario ve su sesión actual (ej. `Sesión #2 · 64/80`) y puede cambiar manualmente a otra sesión con cupo disponible para coincidir con amigos.
6. **Simplicidad técnica:** En base de datos basta un único campo `sala` (ej. `es-general-1`, `es-general-2`, `en-global-1`); el mismo código del Local #7 funciona igual para 1 sesión o para 500 sesiones.

---

## 5. Sistema de Reputación y Rangos de Comunidad ("Me gusta" `❤️`)

Para dinamizar el chat, premiar a quienes aportan ayuda real y multiplicar los registros con Google, cada comentario contará con un **único botón de "Me gusta" (`❤️`)** (en lugar de múltiples emojis) que hace subir de rango al autor dentro de la comunidad.

### A. Mensajes Efímeros (24h) vs. Reputación Permanente
* Aunque los mensajes se purgan cada 24 horas para mantener la web ultrarrápida, **los "Me gusta" acumulados (`likes_totales`) y el rango se conservan para siempre** en el perfil del Miembro CANGEL.
* **Sinergia de negocio (`cangelgames.store`):** Los rangos habilitan dinámicas comunitarias y sorteos exclusivos de Gift Cards (ej. sorteos mensuales para rango *Informante* o superior).

### B. Escala de Rangos Temáticos de Leonida
| Rango | Insignia visible en el chat | `❤️` acumulados | Distinción en comunidad |
| :--- | :--- | :--- | :--- |
| **Nivel 1** | 🌴 **Turista** | `0 – 9` | Recién llegado a Leonida |
| **Nivel 2** | 🚗 **Corredor** | `10 – 49` | Empieza a aportar datos y ayuda |
| **Nivel 3** | 🕶️ **Informante** | `50 – 149` | Jugador confiable con ubicaciones y tips |
| **Nivel 4** | 💎 **Socio Vice** | `150 – 399` | Referente reconocido (nombre con acento neón) |
| **Nivel 5** | 👑 **Leyenda de Leonida** | `400+` | Élite del chat (insignia y brillo dorado/neón) |

*(Insignias reservadas no desbloqueables: **⚡ CANGEL OFICIAL** para el equipo administrador y **🤖 GUÍA IA** para el asistente).*

### C. Candados Anti-Trampa (Costo \$0 en Supabase) y Cumplimiento de los 4 Pilares
* **3 candados automáticos en BD:** (1) prohibido auto-darse `❤️`, (2) máximo **1 `❤️` por persona y comentario** (tocar de nuevo lo retira), y (3) **solo cuentas registradas con Google** pueden dar o acumular `❤️` (bloquea farmeo con invitados o bots).
* **Alineación con los 4 pilares (`Markdown/fundamentos/conceptos.md`):** 100% aislado dentro del **Local #7 (LEGO)**; **0 KB extra** en carga inicial y cero imágenes externas para **100/100 PageSpeed** (insignias por emoji nativo + CSS); **Lápiz de Carbón** (un solo botón `❤️` y el rango se calcula al vuelo en ~10 líneas según `likes_totales` sin tablas complejas); y compacto para respetar la **Regla de Oro (~250 líneas)** auditada por `vigilante/auditor.js`.

---

## 6. Infraestructura y Diseño Técnico con Supabase

Supabase encaja con la **Filosofía del Lápiz de Carbón** en un hosting estático como Vercel: provee autenticación (Anónima + Google OAuth), PostgreSQL, Realtime, Presence y limpieza programada (`pg_cron`) sin servidor propio.

### Referencia de Cuota Gratuita (Plan Free)
* **Conexiones Realtime simultáneas:** Hasta 200 usuarios con el chat abierto al mismo tiempo.
* **Usuarios activos mensuales (MAU):** Hasta 50.000.
* **Base de datos:** 500 MB (mantenida siempre ligera gracias al borrado automático cada 24h).

### Esquema de Base de Datos (PostgreSQL — Separación Público / Privado)
1. **Tabla `chat_perfiles` (Pública — visible en el chat):**
   * `user_id` (`uuid`, PK) — Vinculado a `auth.users`.
   * `es_invitado` (`boolean`) — Distingue sesión anónima de cuenta Google.
   * `alias` (`text`, máx. 20 chars) y `tag_id` (`int`, ej. `482` → `#0482`).
   * `pais` (`text`, código ISO 2 letras: `CO`, `MX`, `ES`, `US`...).
   * `avatar_url` (`text`) — Foto de Google o avatar ligero de invitado.
   * `plataforma` (`text`, opcional: `PS5`, `Xbox`, `PC`) y `gamertag` (`text`, opcional público).
   * `mensajes_24h` (`int`) — Contador para tope diario de invitados.
   * `likes_totales` (`int`, default `0`) — Reputación permanente acumulada por `❤️` recibidos (define el rango).
   * `strikes` (`int`, default `0`) — Controlado por el Moderador IA.

2. **Tabla `perfiles_privados` (Privada — RLS: solo el dueño y el Admin):**
   * `user_id` (`uuid`, PK) — Vinculado a `auth.users`.
   * `email` (`text`) — Correo obtenido de Google.
   * `telefono_wpp` (`text`, opcional con indicativo de país, ej. `+57...`).
   * `acepta_promos_sorteos` (`boolean`, default `false`) — Consentimiento explícito.
   * `created_at` (`timestamptz`, default `now()`).

3. **Tabla `chat_mensajes`:**
   * `id` (`uuid`, PK), `canal` (`text`: `general`, `secretos`, `robos`, `spoilers`, `global`), `sala` (`text`, ej. `es-general-1`, `es-general-2`, `en-global-1` para *sharding* por sesión), `user_id` (`uuid`).
   * `texto` (`text`, máx. 280 chars), `punto_id` (`text`, opcional), `reply_to` (`uuid`, opcional), `fijado` (`boolean`, default `false`), `created_at` (`timestamptz`, default `now()`).
   * **Índice obligatorio:** Índice compuesto `(sala, created_at DESC)` para lecturas de 24h en < 2 ms incluso con cientos de sesiones activas.

4. **Tabla `chat_likes` (Efímera 24h — anti-trampa):**
   * `mensaje_id` (`uuid`, FK a `chat_mensajes` con `ON DELETE CASCADE`) y `user_id` (`uuid`), con PK compuesta `(mensaje_id, user_id)` para garantizar máximo 1 `❤️` por persona/comentario.
   * **Trigger automático:** Suma `+1` o `-1` en `chat_perfiles.likes_totales` del autor; al purgarse el mensaje a las 24h, el registro de `chat_likes` se borra automáticamente sin restar el puntaje acumulado.

5. **Tabla `chat_baneados`:**
   * `user_id` (`uuid`, PK), `motivo` (`text`), `expira_en` (`timestamptz`, opcional para baneo 24h), `created_at` (`timestamptz`, default `now()`).

6. **Tabla `reportes_mapa` (Fase complementaria / Crowdsourcing):**
   * `id` (`uuid`, PK), `user_id` (`uuid`), `x` (`numeric`), `y` (`numeric`), `titulo` (`text`), `descripcion` (`text`), `estado` (`text`: `pendiente` / `aprobado`), `created_at` (`timestamptz`).

### Expiración Exacta de 24 Horas (Doble Capa)
* **Capa 1 — Filtro en tiempo real (Lectura / RLS):** Toda consulta y política `SELECT` filtra estrictamente `created_at > now() - interval '24 hours'`. Al cumplir 24h y 1s el mensaje desaparece de inmediato.
* **Capa 2 — Limpieza física automática (`pg_cron`):** Tarea programada cada hora en Supabase para purgar registros vencidos:
  ```sql
  DELETE FROM chat_mensajes WHERE created_at < now() - interval '24 hours';
  ```

### Seguridad, RLS y Anti-Spam
* En el frontend solo se expone la `anon key` pública (nunca la `service_role key`). Toda regla vive en **Row Level Security (RLS)** y triggers de PostgreSQL:
  * **`SELECT` en `chat_mensajes`:** Abierto a todos únicamente para las últimas 24 horas.
  * **`SELECT` en `perfiles_privados`:** Estricto `auth.uid() = user_id` (o rol Admin); **jamás expuesto** a terceros.
  * **`INSERT` en `chat_mensajes`:** Solo sesiones válidas (`auth.uid() = user_id`) que no estén en `chat_baneados`, texto no vacío `<= 280` chars.
  * **Trigger Anti-Spam y Límites:** Exige **5 segundos** entre mensajes para registrados con Google y **30 segundos + tope de 3–5 mensajes/24h** (sin `punto_id` ni `reply_to`) para invitados anónimos.
  * **`INSERT`/`DELETE` en `chat_likes`:** Solo cuentas registradas con Google (`es_invitado = false`), con `auth.uid() = user_id` y validación estricta de que el autor del mensaje no sea el mismo usuario (prohibido auto-like).
  * **`DELETE` (Moderación):** Cada usuario borra sus propios mensajes; el Admin y la Edge Function del Moderador IA (`Markdown/chat/moderador.md`) pueden borrar mensajes, fijar avisos y silenciar usuarios en 1 clic.

### Configuración de Autenticación (Anónima + Google OAuth 2.0)
1. Activar **Anonymous Sign-Ins** en *Supabase → Authentication → Providers* (para el Modo Invitado).
2. Crear credenciales OAuth 2.0 en **Google Cloud Console** con el callback oficial de Supabase y activar **Google** en *Providers*.
3. Registrar en *Supabase → Authentication → URL Configuration*:
   * Producción: `https://www.cangel.games`
   * Desarrollo local: `http://localhost:5000`

---

## 7. Funcionalidades Complementarias (Chat Conectado al Mapa)

1. **📍 Compartir Puntos del Mapa en el Chat (Función Estrella):**
   * Botón `"📍 Enviar ubicación"` (para registrados) que adjunta un marcador oficial (`#punto=id`) o coordenada `(X%, Y%)` como mini-tarjeta clicable. Al tocarla, ejecuta `enfocarCoordenada()` de `edificio/visor-mapa.js` y minimiza el chat en móvil.
2. **📻 Frecuencias de "Radio Leonida" (Canales Temáticos + Global):**
   * `🌴 General` — Charla, dudas rápidas y comunidad en español.
   * `🔍 Secretos & WAiNK` — Coleccionables, Easter Eggs y misterios.
   * `💰 Robos & Dinero` — Bancos, cajeros remolcables y estrategias.
   * `⚠️ Spoilers` — Espacio aislado para historia y misiones.
   * `🌎 English / Global` — Sala internacional para jugadores de otros idiomas.
3. **🟢 Contador de "Exploradores en Vivo" (Supabase Presence):**
   * Indicador en tiempo real sobre el botón flotante y cabecera (ej. `🟢 24 en Leonida`).
4. **🗺️ Reportes Comunitarios de Nuevos Secretos (Crowdsourcing):**
   * Miembros registrados envían coordenadas `(X%, Y%)` + nota a `reportes_mapa` para revisión e incorporación a los JSON oficiales con crédito de autor.
5. **💬 Experiencia Tipo WhatsApp Ultraligera:**
   * Responder citando (`reply_to`), botón único de **"Me gusta" (`❤️`)** conectado a los rangos de comunidad, insignia de rango y plataforma (`PS5` / `Xbox` / `PC`), banderita de país, agrupación visual y sonido silenciable.
6. **📌 Mensaje Fijado / Reto Diario de CANGEL GAMES:**
   * Banner superior controlado por el administrador para retos diarios, sorteos de Gift Cards y acceso sutil a `cangelgames.store` y WhatsApp oficial.
7. **☁️ Sinergia Futura con Progreso y Pines Personales:**
   * Mantener `localStorage` por defecto para no obligar a registrarse, pero aprovechar la cuenta Google del chat para ofrecer sincronización opcional en la nube entre PC y celular.
