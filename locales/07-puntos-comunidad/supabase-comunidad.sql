-- ============================================================================
-- FASE 6 (6.1, 6.2 y 6.3) — PUNTOS DE LA COMUNIDAD Y VERIFICACIÓN SOCIAL (❤️ / ✕)
-- Proyecto: CANGEL GAMES (GTA 6 - Leonida)
-- Ejecutar completo en: Supabase Dashboard -> SQL Editor -> New query -> Run
-- Requisitos previos ya activos: public.es_admin_cangel(), public.fotos_puntos y bucket fotos-puntos
-- Nota: 100% idempotente y preparado con user_id UUID NULL para el futuro Login.
-- ============================================================================

-- 1) TABLA PRINCIPAL: public.puntos_comunidad
CREATE TABLE IF NOT EXISTS public.puntos_comunidad (
  id text PRIMARY KEY CHECK (id ~ '^com_[a-zA-Z0-9_-]{4,60}$'),
  titulo text NOT NULL CHECK (char_length(titulo) BETWEEN 2 AND 80),
  descripcion text NOT NULL DEFAULT '' CHECK (char_length(descripcion) <= 320),
  categoria_id text NOT NULL DEFAULT 'otro' CHECK (categoria_id ~ '^[a-z0-9-]{1,60}$'),
  icono_id text NOT NULL DEFAULT 'icono-comunidad-otro' CHECK (icono_id ~ '^icono-[a-z0-9-]{2,50}$'),
  color text NOT NULL DEFAULT '#ff2a85' CHECK (color ~ '^#[0-9a-fA-F]{6}$'),
  region text NOT NULL CHECK (char_length(region) BETWEEN 2 AND 60),
  x double precision NOT NULL CHECK (x >= 0 AND x <= 100),
  y double precision NOT NULL CHECK (y >= 0 AND y <= 100),
  autor_alias text NOT NULL DEFAULT 'Anónimo' CHECK (char_length(autor_alias) BETWEEN 1 AND 32),
  user_id uuid NULL,
  url_imagen_propuesta text NULL CHECK (
    url_imagen_propuesta IS NULL
    OR url_imagen_propuesta LIKE 'https://ktnrjoewhhfjbmqyxfij.supabase.co/storage/v1/object/public/fotos-puntos/%'
  ),
  ruta_storage_propuesta text NULL CHECK (
    ruta_storage_propuesta IS NULL
    OR char_length(ruta_storage_propuesta) BETWEEN 5 AND 220
  ),
  estado text NOT NULL DEFAULT 'pendiente' CHECK (
    estado IN ('pendiente', 'aprobado', 'oculto_reportes', 'rechazado')
  ),
  verificado_admin boolean NOT NULL DEFAULT false,
  corazones_count integer NOT NULL DEFAULT 0 CHECK (corazones_count >= 0),
  reportes_count integer NOT NULL DEFAULT 0 CHECK (reportes_count >= 0),
  sesion_hash text NOT NULL CHECK (char_length(sesion_hash) BETWEEN 8 AND 80),
  creado_en timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_puntos_comunidad_estado
  ON public.puntos_comunidad (estado, creado_en DESC);

CREATE INDEX IF NOT EXISTS idx_puntos_comunidad_cola_admin
  ON public.puntos_comunidad (creado_en ASC)
  WHERE estado IN ('pendiente', 'oculto_reportes');

CREATE INDEX IF NOT EXISTS idx_puntos_comunidad_sesion_fecha
  ON public.puntos_comunidad (sesion_hash, creado_en DESC);

CREATE INDEX IF NOT EXISTS idx_puntos_comunidad_user
  ON public.puntos_comunidad (user_id)
  WHERE user_id IS NOT NULL;

ALTER TABLE public.puntos_comunidad ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.puntos_comunidad FROM anon, authenticated;

-- 2) TABLA DE VOTOS ÚNICOS: public.votos_puntos_comunidad
CREATE TABLE IF NOT EXISTS public.votos_puntos_comunidad (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  punto_id text NOT NULL REFERENCES public.puntos_comunidad(id) ON DELETE CASCADE,
  sesion_hash text NOT NULL CHECK (char_length(sesion_hash) BETWEEN 8 AND 80),
  user_id uuid NULL,
  tipo text NOT NULL CHECK (tipo IN ('confirmar', 'reportar')),
  creado_en timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT ux_votos_comunidad_punto_sesion UNIQUE (punto_id, sesion_hash)
);

CREATE INDEX IF NOT EXISTS idx_votos_comunidad_punto_tipo
  ON public.votos_puntos_comunidad (punto_id, tipo);

CREATE INDEX IF NOT EXISTS idx_votos_comunidad_sesion
  ON public.votos_puntos_comunidad (sesion_hash);

ALTER TABLE public.votos_puntos_comunidad ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.votos_puntos_comunidad FROM anon, authenticated;

-- 3) RPC 1: obtener_puntos_comunidad(p_sesion_hash)
-- Devuelve en 1 solo viaje todos los puntos aprobados (+ mi_voto si se envía sesion_hash)
CREATE OR REPLACE FUNCTION public.obtener_puntos_comunidad(
  p_sesion_hash text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_sesion text := trim(coalesce(p_sesion_hash, ''));
  v_items jsonb;
BEGIN
  IF char_length(v_sesion) < 8 OR char_length(v_sesion) > 80 THEN
    v_sesion := '';
  END IF;

  SELECT coalesce(jsonb_agg(jsonb_build_object(
    'id', p.id, 'titulo', p.titulo, 'descripcion', p.descripcion,
    'categoria_id', p.categoria_id, 'icono_id', p.icono_id, 'color', p.color,
    'region', p.region, 'x', p.x, 'y', p.y, 'autor_alias', p.autor_alias,
    'verificado_admin', p.verificado_admin, 'corazones_count', p.corazones_count,
    'reportes_count', p.reportes_count, 'creado_en', p.creado_en, 'mi_voto', v.tipo
  ) ORDER BY p.creado_en DESC), '[]'::jsonb)
    INTO v_items
    FROM public.puntos_comunidad p
    LEFT JOIN public.votos_puntos_comunidad v
      ON v_sesion <> '' AND v.punto_id = p.id AND v.sesion_hash = v_sesion
   WHERE p.estado = 'aprobado';

  RETURN jsonb_build_object('ok', true, 'total', jsonb_array_length(v_items), 'items', v_items);
END;
$$;

-- 4) RPC 2: proponer_punto_comunidad(...)
-- Visitantes: tope anti-spam 5/día -> estado 'pendiente'.
-- Admin autenticado (/admin): publica 'aprobado' y verificado al instante (+ foto en fotos_puntos).
CREATE OR REPLACE FUNCTION public.proponer_punto_comunidad(
  p_titulo text,
  p_descripcion text DEFAULT '',
  p_categoria_id text DEFAULT 'otro',
  p_icono_id text DEFAULT 'icono-comunidad-otro',
  p_color text DEFAULT '#ff2a85',
  p_region text DEFAULT 'Vice City',
  p_x double precision DEFAULT NULL,
  p_y double precision DEFAULT NULL,
  p_autor_alias text DEFAULT 'Anónimo',
  p_sesion_hash text DEFAULT '',
  p_url_imagen text DEFAULT NULL,
  p_ruta_storage text DEFAULT NULL,
  p_id text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_base constant text := 'https://ktnrjoewhhfjbmqyxfij.supabase.co/storage/v1/object/public/fotos-puntos/';
  v_es_admin boolean := public.es_admin_cangel();
  v_id text := trim(coalesce(p_id, ''));
  v_titulo text := left(regexp_replace(trim(coalesce(p_titulo, '')), '[[:cntrl:]]', '', 'g'), 80);
  v_desc text := left(regexp_replace(trim(coalesce(p_descripcion, '')), '[[:cntrl:]]', ' ', 'g'), 320);
  v_cat text := lower(trim(coalesce(p_categoria_id, 'otro')));
  v_icono text := lower(trim(coalesce(p_icono_id, 'icono-comunidad-otro')));
  v_color text := trim(coalesce(p_color, '#ff2a85'));
  v_region text := left(regexp_replace(trim(coalesce(p_region, '')), '[[:cntrl:]]', '', 'g'), 60);
  v_alias text := left(regexp_replace(trim(coalesce(p_autor_alias, '')), '[[:cntrl:]]', '', 'g'), 24);
  v_sesion text := trim(coalesce(p_sesion_hash, ''));
  v_url text := nullif(trim(coalesce(p_url_imagen, '')), '');
  v_ruta text := nullif(trim(coalesce(p_ruta_storage, '')), '');
  v_envios integer;
  v_estado text;
  v_user_id uuid := NULL;
BEGIN
  IF v_alias = '' THEN
    v_alias := CASE WHEN v_es_admin THEN 'CANGEL' ELSE 'Anónimo' END;
  END IF;

  IF v_id = '' THEN
    v_id := 'com_' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 12);
  ELSIF v_id !~ '^com_[a-zA-Z0-9_-]{4,60}$' THEN
    RETURN jsonb_build_object('ok', false, 'codigo', 'ID_INVALIDO', 'mensaje', 'Identificador de punto no válido.');
  END IF;

  IF char_length(v_titulo) < 2 THEN
    RETURN jsonb_build_object('ok', false, 'codigo', 'TITULO_INVALIDO', 'mensaje', 'Escribe un título de al menos 2 caracteres.');
  END IF;
  IF v_cat !~ '^[a-z0-9-]{1,60}$' THEN
    RETURN jsonb_build_object('ok', false, 'codigo', 'CATEGORIA_INVALIDA', 'mensaje', 'Categoría no válida.');
  END IF;
  IF v_icono !~ '^icono-[a-z0-9-]{2,50}$' THEN
    RETURN jsonb_build_object('ok', false, 'codigo', 'ICONO_INVALIDO', 'mensaje', 'Icono no válido.');
  END IF;
  IF v_color !~ '^#[0-9a-fA-F]{6}$' THEN v_color := '#ff2a85'; END IF;
  IF char_length(v_region) < 2 THEN
    RETURN jsonb_build_object('ok', false, 'codigo', 'REGION_INVALIDA', 'mensaje', 'Selecciona una región válida.');
  END IF;
  IF p_x IS NULL OR p_y IS NULL OR p_x < 0 OR p_x > 100 OR p_y < 0 OR p_y > 100 THEN
    RETURN jsonb_build_object('ok', false, 'codigo', 'COORDS_INVALIDAS', 'mensaje', 'Coordenadas fuera del mapa de Leonida.');
  END IF;

  IF v_es_admin AND (char_length(v_sesion) < 8 OR char_length(v_sesion) > 80) THEN
    v_sesion := 'admin_oficial';
  END IF;
  IF char_length(v_sesion) < 8 OR char_length(v_sesion) > 80 THEN
    RETURN jsonb_build_object('ok', false, 'codigo', 'SESION_INVALIDA', 'mensaje', 'Sesión no válida.');
  END IF;

  IF (v_url IS NULL) <> (v_ruta IS NULL) THEN
    RETURN jsonb_build_object('ok', false, 'codigo', 'RUTA_INVALIDA', 'mensaje', 'Datos de imagen incompletos.');
  END IF;
  IF v_ruta IS NOT NULL THEN
    IF v_es_admin THEN
      IF v_ruta !~ '^(propuestas|oficiales)/[a-zA-Z0-9_-]{1,100}/[a-zA-Z0-9._-]{4,80}\.(webp|jpg|jpeg|png)$'
         OR v_url <> (v_base || v_ruta) THEN
        RETURN jsonb_build_object('ok', false, 'codigo', 'RUTA_INVALIDA', 'mensaje', 'Ruta de imagen no permitida.');
      END IF;
    ELSE
      IF v_ruta !~ '^propuestas/[a-zA-Z0-9_-]{1,100}/[a-zA-Z0-9._-]{4,80}\.(webp|jpg|jpeg|png)$'
         OR v_url <> (v_base || v_ruta) THEN
        RETURN jsonb_build_object('ok', false, 'codigo', 'RUTA_INVALIDA', 'mensaje', 'Ruta de imagen no permitida.');
      END IF;
    END IF;
  END IF;

  IF NOT v_es_admin THEN
    SELECT count(*) INTO v_envios
      FROM public.puntos_comunidad
     WHERE sesion_hash = v_sesion AND creado_en > now() - interval '24 hours';
    IF v_envios >= 5 THEN
      RETURN jsonb_build_object('ok', false, 'codigo', 'LIMITE_DIARIO', 'mensaje', 'Alcanzaste el límite de 5 puntos propuestos por día.');
    END IF;
    v_estado := 'pendiente';
  ELSE
    v_estado := 'aprobado';
    v_user_id := auth.uid();
  END IF;

  INSERT INTO public.puntos_comunidad (
    id, titulo, descripcion, categoria_id, icono_id, color, region, x, y,
    autor_alias, user_id, url_imagen_propuesta, ruta_storage_propuesta,
    estado, verificado_admin, sesion_hash
  ) VALUES (
    v_id, v_titulo, v_desc, v_cat, v_icono, v_color, v_region,
    round(p_x::numeric, 2)::double precision, round(p_y::numeric, 2)::double precision,
    v_alias, v_user_id, v_url, v_ruta, v_estado, v_es_admin, v_sesion
  );

  IF v_es_admin AND v_url IS NOT NULL AND v_ruta IS NOT NULL THEN
    UPDATE public.fotos_puntos SET estado = 'rechazada'
     WHERE punto_id = v_id AND estado = 'aprobada';
    INSERT INTO public.fotos_puntos (
      punto_id, url_imagen, ruta_storage, autor_alias, es_oficial, estado, sesion_hash
    ) VALUES (v_id, v_url, v_ruta, v_alias, true, 'aprobada', v_sesion);
  END IF;

  RETURN jsonb_build_object('ok', true, 'id', v_id, 'estado', v_estado, 'verificado_admin', v_es_admin);
EXCEPTION
  WHEN unique_violation THEN
    RETURN jsonb_build_object('ok', false, 'codigo', 'ID_DUPLICADO', 'mensaje', 'Ya existe un punto con ese identificador.');
END;
$$;

-- 5) RPC 3: votar_punto_comunidad(p_punto_id, p_tipo, p_sesion_hash)
-- 1 voto único por sesión (alterna o retira). Auto-oculta si reportes - corazones >= 5.
CREATE OR REPLACE FUNCTION public.votar_punto_comunidad(
  p_punto_id text,
  p_tipo text,
  p_sesion_hash text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_punto_id text := trim(coalesce(p_punto_id, ''));
  v_tipo text := lower(trim(coalesce(p_tipo, '')));
  v_sesion text := trim(coalesce(p_sesion_hash, ''));
  v_punto record;
  v_voto_previo text := NULL;
  v_mi_voto text := NULL;
  v_corazones integer := 0;
  v_reportes integer := 0;
  v_nuevo_estado text;
BEGIN
  IF v_punto_id !~ '^com_[a-zA-Z0-9_-]{4,60}$' THEN
    RETURN jsonb_build_object('ok', false, 'codigo', 'PUNTO_INVALIDO', 'mensaje', 'Punto comunitario no válido.');
  END IF;
  IF v_tipo NOT IN ('confirmar', 'reportar') THEN
    RETURN jsonb_build_object('ok', false, 'codigo', 'TIPO_INVALIDO', 'mensaje', 'Tipo de voto no válido.');
  END IF;
  IF char_length(v_sesion) < 8 OR char_length(v_sesion) > 80 THEN
    RETURN jsonb_build_object('ok', false, 'codigo', 'SESION_INVALIDA', 'mensaje', 'Sesión no válida.');
  END IF;

  SELECT id, estado INTO v_punto
    FROM public.puntos_comunidad WHERE id = v_punto_id FOR UPDATE;
  IF NOT FOUND OR v_punto.estado <> 'aprobado' THEN
    RETURN jsonb_build_object('ok', false, 'codigo', 'NO_DISPONIBLE', 'mensaje', 'Este punto ya no está activo en el mapa.');
  END IF;

  SELECT tipo INTO v_voto_previo
    FROM public.votos_puntos_comunidad WHERE punto_id = v_punto_id AND sesion_hash = v_sesion;

  IF v_voto_previo IS NULL THEN
    INSERT INTO public.votos_puntos_comunidad (punto_id, sesion_hash, user_id, tipo)
    VALUES (v_punto_id, v_sesion, auth.uid(), v_tipo);
    v_mi_voto := v_tipo;
  ELSIF v_voto_previo = v_tipo THEN
    DELETE FROM public.votos_puntos_comunidad WHERE punto_id = v_punto_id AND sesion_hash = v_sesion;
    v_mi_voto := NULL;
  ELSE
    UPDATE public.votos_puntos_comunidad SET tipo = v_tipo, creado_en = now()
     WHERE punto_id = v_punto_id AND sesion_hash = v_sesion;
    v_mi_voto := v_tipo;
  END IF;

  SELECT count(*) FILTER (WHERE tipo = 'confirmar'), count(*) FILTER (WHERE tipo = 'reportar')
    INTO v_corazones, v_reportes
    FROM public.votos_puntos_comunidad WHERE punto_id = v_punto_id;

  v_nuevo_estado := CASE WHEN (v_reportes - v_corazones) >= 5 THEN 'oculto_reportes' ELSE 'aprobado' END;

  UPDATE public.puntos_comunidad
     SET corazones_count = v_corazones, reportes_count = v_reportes, estado = v_nuevo_estado
   WHERE id = v_punto_id;

  RETURN jsonb_build_object(
    'ok', true, 'punto_id', v_punto_id, 'estado', v_nuevo_estado,
    'ocultado', (v_nuevo_estado = 'oculto_reportes'),
    'corazones_count', v_corazones, 'reportes_count', v_reportes, 'mi_voto', v_mi_voto
  );
END;
$$;

-- 6) RPC 4: admin_gestionar_punto(...)
-- Exclusivo de Admin (/admin): listar_cola, aprobar, verificar, reactivar, rechazar.
CREATE OR REPLACE FUNCTION public.admin_gestionar_punto(
  p_accion text,
  p_punto_id text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_accion text := lower(trim(coalesce(p_accion, '')));
  v_punto_id text := trim(coalesce(p_punto_id, ''));
  v_punto record;
  v_items jsonb;
  v_ruta_borrar text := NULL;
  v_corazones integer := 0;
BEGIN
  IF NOT public.es_admin_cangel() THEN
    RETURN jsonb_build_object('ok', false, 'codigo', 'NO_AUTORIZADO', 'mensaje', 'Acceso restringido al administrador.');
  END IF;

  IF v_accion = 'listar_cola' THEN
    SELECT coalesce(jsonb_agg(jsonb_build_object(
      'id', p.id, 'titulo', p.titulo, 'descripcion', p.descripcion,
      'categoria_id', p.categoria_id, 'icono_id', p.icono_id, 'color', p.color,
      'region', p.region, 'x', p.x, 'y', p.y, 'autor_alias', p.autor_alias,
      'url_imagen_propuesta', p.url_imagen_propuesta, 'ruta_storage_propuesta', p.ruta_storage_propuesta,
      'estado', p.estado, 'verificado_admin', p.verificado_admin,
      'corazones_count', p.corazones_count, 'reportes_count', p.reportes_count, 'creado_en', p.creado_en
    ) ORDER BY p.creado_en ASC), '[]'::jsonb)
      INTO v_items
      FROM public.puntos_comunidad p
     WHERE p.estado IN ('pendiente', 'oculto_reportes');

    RETURN jsonb_build_object('ok', true, 'total', jsonb_array_length(v_items), 'items', v_items);

  ELSIF v_accion IN ('aprobar', 'verificar') THEN
    SELECT * INTO v_punto FROM public.puntos_comunidad
     WHERE id = v_punto_id AND estado IN ('pendiente', 'oculto_reportes') FOR UPDATE;
    IF NOT FOUND THEN
      RETURN jsonb_build_object('ok', false, 'codigo', 'NO_ENCONTRADO', 'mensaje', 'Punto no encontrado en cola.');
    END IF;

    UPDATE public.puntos_comunidad
       SET estado = 'aprobado', verificado_admin = (v_accion = 'verificar')
     WHERE id = v_punto_id;

    IF v_punto.url_imagen_propuesta IS NOT NULL AND v_punto.ruta_storage_propuesta IS NOT NULL THEN
      UPDATE public.fotos_puntos SET estado = 'rechazada'
       WHERE punto_id = v_punto_id AND estado = 'aprobada';
      INSERT INTO public.fotos_puntos (
        punto_id, url_imagen, ruta_storage, autor_alias, es_oficial, estado, sesion_hash
      ) VALUES (
        v_punto_id, v_punto.url_imagen_propuesta, v_punto.ruta_storage_propuesta,
        v_punto.autor_alias, (v_accion = 'verificar'), 'aprobada', v_punto.sesion_hash
      );
    END IF;

    RETURN jsonb_build_object('ok', true, 'accion', v_accion, 'punto_id', v_punto_id, 'verificado_admin', (v_accion = 'verificar'));

  ELSIF v_accion = 'reactivar' THEN
    SELECT * INTO v_punto FROM public.puntos_comunidad
     WHERE id = v_punto_id AND estado = 'oculto_reportes' FOR UPDATE;
    IF NOT FOUND THEN
      RETURN jsonb_build_object('ok', false, 'codigo', 'NO_ENCONTRADO', 'mensaje', 'Punto oculto no encontrado.');
    END IF;

    DELETE FROM public.votos_puntos_comunidad WHERE punto_id = v_punto_id AND tipo = 'reportar';
    SELECT count(*) INTO v_corazones FROM public.votos_puntos_comunidad WHERE punto_id = v_punto_id AND tipo = 'confirmar';

    UPDATE public.puntos_comunidad
       SET estado = 'aprobado', corazones_count = v_corazones, reportes_count = 0
     WHERE id = v_punto_id;

    RETURN jsonb_build_object('ok', true, 'accion', 'reactivar', 'punto_id', v_punto_id, 'corazones_count', v_corazones, 'reportes_count', 0);

  ELSIF v_accion = 'rechazar' THEN
    SELECT * INTO v_punto FROM public.puntos_comunidad
     WHERE id = v_punto_id AND estado IN ('pendiente', 'oculto_reportes', 'aprobado') FOR UPDATE;
    IF NOT FOUND THEN
      RETURN jsonb_build_object('ok', false, 'codigo', 'NO_ENCONTRADO', 'mensaje', 'Punto no encontrado.');
    END IF;

    v_ruta_borrar := v_punto.ruta_storage_propuesta;
    UPDATE public.fotos_puntos SET estado = 'rechazada'
     WHERE punto_id = v_punto_id AND estado IN ('aprobada', 'pendiente');
    UPDATE public.puntos_comunidad SET estado = 'rechazado' WHERE id = v_punto_id;

    RETURN jsonb_build_object('ok', true, 'accion', 'rechazar', 'punto_id', v_punto_id, 'ruta_borrar', v_ruta_borrar);
  END IF;

  RETURN jsonb_build_object('ok', false, 'codigo', 'ACCION_INVALIDA', 'mensaje', 'Acción no reconocida.');
END;
$$;

-- 7) PERMISOS ESTRICTOS SOBRE LOS 4 RPCs
REVOKE ALL ON FUNCTION public.obtener_puntos_comunidad(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.obtener_puntos_comunidad(text) TO anon, authenticated;

REVOKE ALL ON FUNCTION public.proponer_punto_comunidad(
  text, text, text, text, text, text, double precision, double precision, text, text, text, text, text
) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.proponer_punto_comunidad(
  text, text, text, text, text, text, double precision, double precision, text, text, text, text, text
) TO anon, authenticated;

REVOKE ALL ON FUNCTION public.votar_punto_comunidad(text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.votar_punto_comunidad(text, text, text) TO anon, authenticated;

REVOKE ALL ON FUNCTION public.admin_gestionar_punto(text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_gestionar_punto(text, text) TO authenticated;
