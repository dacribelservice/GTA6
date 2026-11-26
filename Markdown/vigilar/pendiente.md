# Bitácora Preventiva de Escalabilidad y Backend — CANGEL GAMES

Documento de vigilancia arquitectónica para prevenir deuda técnica a medida que escale el Mapa Interactivo de GTA 6 (Leonida).  
**Regla de uso (Lápiz de Carbón & Regla de la Tuerca):** ninguno de estos puntos requiere acción hoy ni bloquea las fases actuales. Cada ítem se activa **únicamente** cuando se cumpla su **Gatillo de Activación**.

---

## Resumen Rápido de Puntos a Vigilar

| # | Área | Nivel Criterio | Estado Actual | Gatillo de Activación |
| :-: | :--- | :---: | :--- | :--- |
| **1** | `user_id` en `public.fotos_puntos` | Nivel 2 | No bloqueante | Al activar Login, perfiles y rangos |
| **2** | Voto único por cuenta (`user_id`) | Nivel 4 | Preparado | Al activar Login de jugadores |
| **3** | Evolución de `es_admin_cangel()` a roles | Nivel 4 | Centralizado | Al sumar moderadores o más admins |
| **4** | Config pública de Supabase centralizada | Nivel 2 | Funcional | Al crear entorno `staging` o rotar claves |
| **5** | Orden numerado de migraciones `.sql` | Nivel 4 | Limpio por módulo | Al superar 5–6 tablas interconectadas |
| **6** | Escudo CDN (Cloudflare Free) y cuotas | Nivel 5 | Opcional (`$0`) | Al superar 60% de cuota Vercel/Supabase |

---

## 1. Añadir `user_id uuid NULL` a `public.fotos_puntos`

* **Contexto actual:** `public.puntos_comunidad` y `public.votos_puntos_comunidad` (Fase 6) ya incluyen `user_id uuid NULL` con índice parcial. En cambio, `public.fotos_puntos` (Fase 4) fue creada antes de definir esa convención y solo guarda `autor_alias` y `sesion_hash`.
* **Por qué vigilarlo:** Cuando existan perfiles de jugador, estadísticas de aportes y sistema de rangos/insignias, necesitarás acreditar tanto puntos propuestos como fotografías aprobadas al mismo usuario autenticado.
* **Gatillo de activación:** Al diseñar e implementar el sistema oficial de Inicio de Sesión y Perfiles.
* **Acción exacta futura (sin pérdida de datos):**
  ```sql
  ALTER TABLE public.fotos_puntos
    ADD COLUMN IF NOT EXISTS user_id uuid NULL;

  CREATE INDEX IF NOT EXISTS idx_fotos_puntos_user
    ON public.fotos_puntos (user_id)
    WHERE user_id IS NOT NULL;
  ```
  Y guardar `auth.uid()` dentro de `proponer_foto_punto(...)` y `admin_gestionar_foto(...)`.

---

## 2. Blindar voto único por cuenta en `public.votos_puntos_comunidad`

* **Contexto actual:** La unicidad del voto funciona por navegador/dispositivo mediante `UNIQUE (punto_id, sesion_hash)`, lo cual es ideal mientras no exista Login.
* **Por qué vigilarlo:** Con cuentas activas, un mismo usuario podría votar desde celular y PC con distinto `sesion_hash`.
* **Gatillo de activación:** Al activar sesiones autenticadas de jugadores.
* **Acción exacta futura:**
  ```sql
  CREATE UNIQUE INDEX IF NOT EXISTS ux_votos_comunidad_punto_user
    ON public.votos_puntos_comunidad (punto_id, user_id)
    WHERE user_id IS NOT NULL;
  ```
  Y en `votar_punto_comunidad(...)`, priorizar la búsqueda por `user_id = auth.uid()` cuando el usuario esté autenticado (manteniendo `sesion_hash` como respaldo para visitantes anónimos si se siguen permitiendo).

---

## 3. Evolucionar `public.es_admin_cangel()` a tabla de roles (`admin` / `moderador`)

* **Contexto actual:** Toda la autorización administrativa (Storage `fotos-puntos`, `admin_gestionar_foto` y `admin_gestionar_punto`) ya depende de una sola función SQL: `public.es_admin_cangel()`, que valida el correo provisional de Administrador (`auth.uid()`).
* **Por qué vigilarlo:** Si el mapa crece en comunidad, necesitarás delegar moderación de fotos, puntos y *Chat Radio Leonida* a moderadores de confianza sin compartir tu cuenta principal.
* **Gatillo de activación:** Cuando se incorpore una segunda persona al equipo de moderación o se cree la tabla `public.perfiles`.
* **Acción exacta futura:**
  * Crear columna `rol text NOT NULL DEFAULT 'jugador' CHECK (rol IN ('jugador', 'moderador', 'admin'))` en `public.perfiles`.
  * Actualizar únicamente `public.es_admin_cangel()` (y opcionalmente `public.es_moderador_cangel()`) para consultar `public.perfiles WHERE id = auth.uid()`.
  * Retirar la ruta provisional `/admin` y el módulo desechable `tarjeta-admin.js` cuando exista el panel de cuentas oficial.

---

## 4. Centralizar la configuración pública de Supabase en el Frontend

* **Contexto actual:** `SUPABASE_URL` y `SUPABASE_KEY` (`sb_publishable_...`) están declaradas en varios archivos independientes (*Tarjeta de Información*, *Contador en Vivo*, etc.). No representa riesgo de seguridad porque la clave publishable está diseñada para el cliente y todas las tablas tienen RLS cerrada.
* **Por qué vigilarlo:** Si más adelante creas un proyecto paralelo de pruebas (`staging`) o necesitas rotar la clave publishable, editar múltiples archivos aumenta la probabilidad de olvidar uno.
* **Gatillo de activación:** Al crear un segundo entorno de pruebas o al conectar nuevos módulos dependientes de cuentas (*Progreso del Jugador*, *Mis Pines Personales*, *Chat Radio Leonida*).
* **Acción exacta futura:**
  * Respetar la **Ley del Remolque**: no refactorizar módulos estables por estética hoy.
  * En módulos nuevos (**Puntos de la Comunidad**), ya quedó aplicado el paso intermedio con un único helper interno (`locales/07-puntos-comunidad/comunidad-api.js`).
  * Al activar el núcleo de cuentas o entornos `staging`, crear un único archivo liviano **`edificio/config-supabase.js`** (`< 20` líneas) **siempre en `.js` puro (ES Module nativo + `fetch()`), nunca `supabase.ts` ni SDK pesado**, para conservar 0 compiladores y **98–100 en Google PageSpeed**. *(Para ver tablas y datos en vivo usar directamente Supabase Dashboard → Table Editor y los respaldos `supabase-*.sql` del proyecto.)*

---

## 5. Numerar scripts `.sql` en una carpeta única de migraciones

* **Contexto actual:** Cada módulo guarda su propio script SQL idempotente junto a su código (`locales/03-tarjeta-info/supabase-fotos.sql` y `locales/07-puntos-comunidad/supabase-comunidad.sql`). Para 2–3 módulos es limpio, legible y fácil de mantener.
* **Por qué vigilarlo:** Al crecer a 6 o más tablas con dependencias cruzadas (`perfiles` → `fotos_puntos`, `puntos_comunidad`, `progreso_jugador`, `pines_personales`, `chat_mensajes`), reconstruir la base de datos desde cero en un entorno nuevo exigirá saber el orden exacto de ejecución.
* **Gatillo de activación:** Al superar 5–6 tablas interconectadas o al levantar un entorno `staging` limpio.
* **Acción exacta futura:** Agrupar los respaldos SQL en `supabase/` con prefijo secuencial (`01_core_auth_roles.sql`, `02_fotos_puntos.sql`, `03_puntos_comunidad.sql`, `04_progreso_pines.sql`, etc.).

---

## 6. Monitoreo de Cuotas Gratuitas y Escudo CDN (`$0/mes`)

* **Contexto actual:** Caché optimizada en `vercel.json` (70–80% menos transferencia en visitas repetidas), imágenes comprimidas en cliente a `≤ 960 px` / `≤ 100 KB` (WebP/JPG sin EXIF) y 2.532 marcadores oficiales en JSON estático sin tocar PostgreSQL.
* **Por qué vigilarlo:** Un video viral (Reels/TikTok/YouTube) puede disparar el tráfico hacia Vercel (tope 100 GB/mes en plan Hobby) o las lecturas/almacenamiento de Supabase (1 GB Storage, 500 MB DB).
* **Gatillo de activación:** Superar el 60% mensual en **Vercel Usage** o **Supabase Usage**, o antes de campañas virales fuertes.
* **Acción exacta futura:** Activar **Cloudflare Free** delante del DNS de `www.cangel.games` (ver Fase 4 de `Markdown/chat/cache.md`) y revisar periódicamente archivos huérfanos en el bucket `fotos-puntos`.
