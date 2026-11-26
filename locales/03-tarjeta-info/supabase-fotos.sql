-- ============================================================================
-- FASE 4 · BLOQUE A (4.2, 4.3 y 4.4) — TARJETA DE INFORMACIÓN (CANGEL GAMES)
-- Ejecutar completo en: Supabase Dashboard → SQL Editor → New query → Run
-- Nota: 100% idempotente (puedes volver a ejecutarlo sin romper datos).
-- Sin contraseñas en código: valida únicamente auth.uid() de Supabase Auth.
-- ============================================================================

-- 1) Validador interno de Administrador provisional (fowy.info@gmail.com)
CREATE OR REPLACE FUNCTION public.es_admin_cangel()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, auth
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM auth.users u
    WHERE u.id = auth.uid()
      AND lower(u.email) = 'fowy.info@gmail.com'
      AND u.email_confirmed_at IS NOT NULL
  );
$$;

REVOKE ALL ON FUNCTION public.es_admin_cangel() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.es_admin_cangel() TO anon, authenticated;

-- 2) PASO 4.2 — Bucket público fotos-puntos (WebP/JPEG/PNG <= 500 KB) + RLS
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'fotos-puntos',
  'fotos-puntos',
  true,
  524288,
  ARRAY['image/webp', 'image/jpeg', 'image/png']
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "fotos_puntos_lectura_publica" ON storage.objects;
CREATE POLICY "fotos_puntos_lectura_publica"
ON storage.objects FOR SELECT
TO anon, authenticated
USING (bucket_id = 'fotos-puntos');

DROP POLICY IF EXISTS "fotos_puntos_subida_propuestas" ON storage.objects;
CREATE POLICY "fotos_puntos_subida_propuestas"
ON storage.objects FOR INSERT
TO anon, authenticated
WITH CHECK (
  bucket_id = 'fotos-puntos'
  AND name ~ '^propuestas/[a-zA-Z0-9_-]{1,100}/[a-zA-Z0-9._-]{4,80}\.(webp|jpg|jpeg|png)$'
);

DROP POLICY IF EXISTS "fotos_puntos_admin_todo" ON storage.objects;
CREATE POLICY "fotos_puntos_admin_todo"
ON storage.objects FOR ALL
TO authenticated
USING (bucket_id = 'fotos-puntos' AND public.es_admin_cangel())
WITH CHECK (bucket_id = 'fotos-puntos' AND public.es_admin_cangel());

-- 3) PASO 4.3 — Tabla public.fotos_puntos + índices + RLS cerrada
CREATE TABLE IF NOT EXISTS public.fotos_puntos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  punto_id text NOT NULL CHECK (char_length(punto_id) BETWEEN 1 AND 120),
  url_imagen text NOT NULL CHECK (
    url_imagen LIKE 'https://ktnrjoewhhfjbmqyxfij.supabase.co/storage/v1/object/public/fotos-puntos/%'
  ),
  ruta_storage text NOT NULL CHECK (char_length(ruta_storage) BETWEEN 5 AND 220),
  autor_alias text NOT NULL DEFAULT 'Anónimo' CHECK (char_length(autor_alias) BETWEEN 1 AND 32),
  es_oficial boolean NOT NULL DEFAULT false,
  estado text NOT NULL DEFAULT 'pendiente' CHECK (estado IN ('pendiente', 'aprobada', 'rechazada')),
  reportes_incorrecta integer NOT NULL DEFAULT 0 CHECK (reportes_incorrecta >= 0),
  reemplaza_a uuid REFERENCES public.fotos_puntos(id) ON DELETE SET NULL,
  sesion_hash text NOT NULL CHECK (char_length(sesion_hash) BETWEEN 8 AND 80),
  creado_en timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_fotos_puntos_punto_estado
  ON public.fotos_puntos (punto_id, estado, creado_en DESC);

CREATE INDEX IF NOT EXISTS idx_fotos_puntos_pendientes
  ON public.fotos_puntos (creado_en ASC)
  WHERE estado = 'pendiente';

CREATE INDEX IF NOT EXISTS idx_fotos_puntos_sesion_fecha
  ON public.fotos_puntos (sesion_hash, creado_en DESC);

CREATE UNIQUE INDEX IF NOT EXISTS ux_fotos_puntos_una_aprobada
  ON public.fotos_puntos (punto_id)
  WHERE estado = 'aprobada';

ALTER TABLE public.fotos_puntos ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.fotos_puntos FROM anon, authenticated;

-- 4) PASO 4.4A — RPC obtener_foto_punto(p_punto_id)
CREATE OR REPLACE FUNCTION public.obtener_foto_punto(p_punto_id text)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_id text := trim(coalesce(p_punto_id, ''));
  v_fila record;
BEGIN
  IF char_length(v_id) < 1 OR char_length(v_id) > 120 THEN
    RETURN NULL;
  END IF;

  SELECT id, punto_id, url_imagen, autor_alias, es_oficial, reportes_incorrecta, creado_en
    INTO v_fila
    FROM public.fotos_puntos
   WHERE punto_id = v_id AND estado = 'aprobada'
   ORDER BY creado_en DESC
   LIMIT 1;

  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  RETURN jsonb_build_object(
    'id', v_fila.id,
    'punto_id', v_fila.punto_id,
    'url_imagen', v_fila.url_imagen,
    'autor_alias', v_fila.autor_alias,
    'es_oficial', v_fila.es_oficial,
    'reportes_incorrecta', v_fila.reportes_incorrecta,
    'creado_en', v_fila.creado_en
  );
END;
$$;

-- 5) PASO 4.4B — RPC proponer_foto_punto(...) con tope anti-spam (5/día)
CREATE OR REPLACE FUNCTION public.proponer_foto_punto(
  p_punto_id text,
  p_url_imagen text,
  p_ruta_storage text,
  p_autor_alias text DEFAULT 'Anónimo',
  p_sesion_hash text DEFAULT '',
  p_es_reporte boolean DEFAULT false
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_base constant text := 'https://ktnrjoewhhfjbmqyxfij.supabase.co/storage/v1/object/public/fotos-puntos/';
  v_punto text := trim(coalesce(p_punto_id, ''));
  v_ruta text := trim(coalesce(p_ruta_storage, ''));
  v_url text := trim(coalesce(p_url_imagen, ''));
  v_sesion text := trim(coalesce(p_sesion_hash, ''));
  v_alias text := left(regexp_replace(trim(coalesce(p_autor_alias, '')), '[[:cntrl:]]', '', 'g'), 24);
  v_envios integer;
  v_actual_id uuid := NULL;
  v_nuevo_id uuid;
BEGIN
  IF v_alias = '' THEN v_alias := 'Anónimo'; END IF;

  IF v_punto !~ '^[a-zA-Z0-9_-]{1,100}$' THEN
    RETURN jsonb_build_object('ok', false, 'codigo', 'PUNTO_INVALIDO', 'mensaje', 'Marcador no válido.');
  END IF;
  IF v_ruta !~ '^propuestas/[a-zA-Z0-9_-]{1,100}/[a-zA-Z0-9._-]{4,80}\.(webp|jpg|jpeg|png)$'
     OR v_url <> (v_base || v_ruta) THEN
    RETURN jsonb_build_object('ok', false, 'codigo', 'RUTA_INVALIDA', 'mensaje', 'Ruta de imagen no permitida.');
  END IF;
  IF char_length(v_sesion) < 8 OR char_length(v_sesion) > 80 THEN
    RETURN jsonb_build_object('ok', false, 'codigo', 'SESION_INVALIDA', 'mensaje', 'Sesión no válida.');
  END IF;

  SELECT count(*) INTO v_envios
    FROM public.fotos_puntos
   WHERE sesion_hash = v_sesion
     AND creado_en > now() - interval '24 hours';

  IF v_envios >= 5 THEN
    RETURN jsonb_build_object('ok', false, 'codigo', 'LIMITE_DIARIO', 'mensaje', 'Alcanzaste el límite de 5 envíos por día.');
  END IF;

  IF coalesce(p_es_reporte, false) THEN
    SELECT id INTO v_actual_id
      FROM public.fotos_puntos
     WHERE punto_id = v_punto AND estado = 'aprobada'
     LIMIT 1;
    IF v_actual_id IS NOT NULL THEN
      UPDATE public.fotos_puntos
         SET reportes_incorrecta = reportes_incorrecta + 1
       WHERE id = v_actual_id;
    END IF;
  END IF;

  INSERT INTO public.fotos_puntos (
    punto_id, url_imagen, ruta_storage, autor_alias, es_oficial, estado, reemplaza_a, sesion_hash
  ) VALUES (
    v_punto, v_url, v_ruta, v_alias, false, 'pendiente', v_actual_id, v_sesion
  )
  RETURNING id INTO v_nuevo_id;

  RETURN jsonb_build_object('ok', true, 'id', v_nuevo_id, 'estado', 'pendiente');
END;
$$;

-- 6) PASO 4.4C — RPC admin_gestionar_foto(...) validando auth.uid() Admin
CREATE OR REPLACE FUNCTION public.admin_gestionar_foto(
  p_accion text,
  p_foto_id uuid DEFAULT NULL,
  p_punto_id text DEFAULT NULL,
  p_url_imagen text DEFAULT NULL,
  p_ruta_storage text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_base constant text := 'https://ktnrjoewhhfjbmqyxfij.supabase.co/storage/v1/object/public/fotos-puntos/';
  v_accion text := lower(trim(coalesce(p_accion, '')));
  v_pend record;
  v_ant_ruta text := NULL;
  v_punto_obj text := NULL;
  v_items jsonb;
  v_nuevo_id uuid;
BEGIN
  IF NOT public.es_admin_cangel() THEN
    RETURN jsonb_build_object('ok', false, 'codigo', 'NO_AUTORIZADO', 'mensaje', 'Acceso restringido al administrador.');
  END IF;

  IF v_accion = 'listar_pendientes' THEN
    SELECT coalesce(jsonb_agg(jsonb_build_object(
      'id', p.id, 'punto_id', p.punto_id, 'url_imagen', p.url_imagen,
      'ruta_storage', p.ruta_storage, 'autor_alias', p.autor_alias,
      'reemplaza_a', p.reemplaza_a, 'creado_en', p.creado_en,
      'foto_actual_url', a.url_imagen, 'foto_actual_autor', a.autor_alias
    ) ORDER BY p.creado_en ASC), '[]'::jsonb)
      INTO v_items
      FROM public.fotos_puntos p
      LEFT JOIN public.fotos_puntos a
        ON a.punto_id = p.punto_id AND a.estado = 'aprobada'
     WHERE p.estado = 'pendiente';

    RETURN jsonb_build_object('ok', true, 'total', jsonb_array_length(v_items), 'items', v_items);

  ELSIF v_accion = 'aprobar' THEN
    SELECT id, punto_id, ruta_storage INTO v_pend
      FROM public.fotos_puntos
     WHERE id = p_foto_id AND estado = 'pendiente';
    IF NOT FOUND THEN
      RETURN jsonb_build_object('ok', false, 'codigo', 'NO_ENCONTRADA', 'mensaje', 'Propuesta no encontrada.');
    END IF;

    SELECT ruta_storage INTO v_ant_ruta
      FROM public.fotos_puntos
     WHERE punto_id = v_pend.punto_id AND estado = 'aprobada' LIMIT 1;

    UPDATE public.fotos_puntos SET estado = 'rechazada'
     WHERE punto_id = v_pend.punto_id AND estado = 'aprobada';

    UPDATE public.fotos_puntos SET estado = 'aprobada' WHERE id = v_pend.id;

    RETURN jsonb_build_object(
      'ok', true, 'accion', 'aprobar', 'punto_id', v_pend.punto_id, 'ruta_anterior_borrar', v_ant_ruta
    );

  ELSIF v_accion = 'rechazar' THEN
    UPDATE public.fotos_puntos SET estado = 'rechazada'
     WHERE id = p_foto_id AND estado = 'pendiente'
    RETURNING ruta_storage INTO v_ant_ruta;
    IF NOT FOUND THEN
      RETURN jsonb_build_object('ok', false, 'codigo', 'NO_ENCONTRADA', 'mensaje', 'Propuesta no encontrada.');
    END IF;
    RETURN jsonb_build_object('ok', true, 'accion', 'rechazar', 'ruta_borrar', v_ant_ruta);

  ELSIF v_accion = 'eliminar_aprobada' THEN
    UPDATE public.fotos_puntos SET estado = 'rechazada'
     WHERE estado = 'aprobada'
       AND (
         (p_foto_id IS NOT NULL AND id = p_foto_id)
         OR (p_foto_id IS NULL AND trim(coalesce(p_punto_id, '')) <> '' AND punto_id = trim(p_punto_id))
       )
    RETURNING punto_id, ruta_storage INTO v_punto_obj, v_ant_ruta;

    IF NOT FOUND THEN
      RETURN jsonb_build_object('ok', false, 'codigo', 'NO_ENCONTRADA', 'mensaje', 'No hay foto aprobada para eliminar.');
    END IF;

    RETURN jsonb_build_object(
      'ok', true, 'accion', 'eliminar_aprobada', 'punto_id', v_punto_obj, 'ruta_borrar', v_ant_ruta
    );

  ELSIF v_accion = 'publicar_oficial' THEN
    IF trim(coalesce(p_punto_id, '')) !~ '^[a-zA-Z0-9_-]{1,100}$'
       OR trim(coalesce(p_ruta_storage, '')) !~ '^oficiales/[a-zA-Z0-9_-]{1,100}/[a-zA-Z0-9._-]{4,80}\.(webp|jpg|jpeg|png)$'
       OR trim(coalesce(p_url_imagen, '')) <> (v_base || trim(coalesce(p_ruta_storage, ''))) THEN
      RETURN jsonb_build_object('ok', false, 'codigo', 'DATOS_INVALIDOS', 'mensaje', 'Datos de foto oficial inválidos.');
    END IF;

    SELECT ruta_storage INTO v_ant_ruta
      FROM public.fotos_puntos
     WHERE punto_id = trim(p_punto_id) AND estado = 'aprobada' LIMIT 1;

    UPDATE public.fotos_puntos SET estado = 'rechazada'
     WHERE punto_id = trim(p_punto_id) AND estado = 'aprobada';

    INSERT INTO public.fotos_puntos (
      punto_id, url_imagen, ruta_storage, autor_alias, es_oficial, estado, sesion_hash
    ) VALUES (
      trim(p_punto_id), trim(p_url_imagen), trim(p_ruta_storage), 'CANGEL', true, 'aprobada', 'admin_oficial'
    )
    RETURNING id INTO v_nuevo_id;

    RETURN jsonb_build_object(
      'ok', true, 'accion', 'publicar_oficial', 'id', v_nuevo_id,
      'punto_id', trim(p_punto_id), 'url_imagen', trim(p_url_imagen), 'ruta_anterior_borrar', v_ant_ruta
    );
  END IF;

  RETURN jsonb_build_object('ok', false, 'codigo', 'ACCION_INVALIDA', 'mensaje', 'Acción no reconocida.');
END;
$$;

-- Permisos estrictos sobre RPCs
REVOKE ALL ON FUNCTION public.obtener_foto_punto(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.obtener_foto_punto(text) TO anon, authenticated;

REVOKE ALL ON FUNCTION public.proponer_foto_punto(text, text, text, text, text, boolean) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.proponer_foto_punto(text, text, text, text, text, boolean) TO anon, authenticated;

REVOKE ALL ON FUNCTION public.admin_gestionar_foto(text, uuid, text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_gestionar_foto(text, uuid, text, text, text) TO authenticated;
