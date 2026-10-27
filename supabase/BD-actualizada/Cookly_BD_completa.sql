-- =============================================================================
-- COOKLY - Base de datos (esquema completo y limpio) - 34 tablas
-- Ejecutar en Supabase > SQL Editor. Es seguro correrlo más de una vez:
-- no borra datos ni vuelve a crear lo que ya existe.
--
-- Contenido:
--   1. Extensiones
--   2. Tablas del backend (Spring Boot / panel administrativo)
--   3. Tablas de la Comunidad (las consulta la app con Supabase)
--   4. Notificaciones push y avisos de la Comunidad
--   5. Funciones y triggers
--   6. Índices
--   7. Seguridad (RLS y permisos)
--   8. Storage (imágenes de publicaciones)
--   9. Datos iniciales (catálogos)
--
--  10. Recetas de ejemplo (al final del archivo; ver el aviso del correo)
-- =============================================================================

BEGIN;

-- -----------------------------------------------------------------------------
-- 1. Extensiones
-- -----------------------------------------------------------------------------
-- pg_net permite que la base de datos avise a Expo (notificaciones push).
CREATE EXTENSION IF NOT EXISTS pg_net;

-- -----------------------------------------------------------------------------
-- 2. Tablas del backend
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.usuarios (
    id         BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    nombre     VARCHAR(100) NOT NULL,
    correo     VARCHAR(254) NOT NULL UNIQUE,
    contrasena VARCHAR(72)  NOT NULL,
    rol        VARCHAR(20)  NOT NULL DEFAULT 'USUARIO',
    activo     BOOLEAN      NOT NULL DEFAULT TRUE,
    -- FALSE = cuenta creada con Google: tiene una contraseña aleatoria que nadie conoce.
    contrasena_propia BOOLEAN   NOT NULL DEFAULT TRUE,
    creado_en  TIMESTAMPTZ  NOT NULL DEFAULT now(),
    CONSTRAINT usuarios_rol_backend_check
        CHECK (rol IN ('USUARIO', 'ADMINISTRADOR'))
);
-- Si la tabla ya existía sin esta columna (la entidad Usuario la exige con ddl-auto: validate):
ALTER TABLE public.usuarios ADD COLUMN IF NOT EXISTS contrasena_propia BOOLEAN NOT NULL DEFAULT TRUE;

CREATE TABLE IF NOT EXISTS public.ingredientes (
    id     BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    nombre VARCHAR(80) NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS public.recetas (
    id                  BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    nombre              VARCHAR(150) NOT NULL,
    descripcion         TEXT,
    minutos_preparacion SMALLINT CHECK (minutos_preparacion > 0),
    creador_id          BIGINT NOT NULL REFERENCES public.usuarios(id),
    creado_en           TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.ingredientes_receta (
    receta_id      BIGINT NOT NULL REFERENCES public.recetas(id) ON DELETE CASCADE,
    ingrediente_id BIGINT NOT NULL REFERENCES public.ingredientes(id),
    cantidad       DOUBLE PRECISION,
    unidad         VARCHAR(30),
    PRIMARY KEY (receta_id, ingrediente_id)
);

CREATE TABLE IF NOT EXISTS public.pasos_receta (
    id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    receta_id   BIGINT   NOT NULL REFERENCES public.recetas(id) ON DELETE CASCADE,
    orden       SMALLINT NOT NULL,
    instruccion TEXT     NOT NULL,
    UNIQUE (receta_id, orden)
);

CREATE TABLE IF NOT EXISTS public.imagenes (
    id                    BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    receta_id             BIGINT NOT NULL REFERENCES public.recetas(id) ON DELETE CASCADE,
    url                   TEXT   NOT NULL,
    identificador_publico VARCHAR(255) NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS public.etiquetas (
    id     BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    nombre VARCHAR(60) NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS public.recetas_etiquetas (
    receta_id   BIGINT NOT NULL REFERENCES public.recetas(id)   ON DELETE CASCADE,
    etiqueta_id BIGINT NOT NULL REFERENCES public.etiquetas(id) ON DELETE CASCADE,
    PRIMARY KEY (receta_id, etiqueta_id)
);

CREATE TABLE IF NOT EXISTS public.favoritos (
    usuario_id BIGINT NOT NULL REFERENCES public.usuarios(id) ON DELETE CASCADE,
    receta_id  BIGINT NOT NULL REFERENCES public.recetas(id)  ON DELETE CASCADE,
    creado_en  TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (usuario_id, receta_id)
);

CREATE TABLE IF NOT EXISTS public.historial_recetas (
    id         BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    usuario_id BIGINT NOT NULL REFERENCES public.usuarios(id) ON DELETE CASCADE,
    receta_id  BIGINT NOT NULL REFERENCES public.recetas(id)  ON DELETE CASCADE,
    visto_en   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.menus_semanales (
    id         BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    usuario_id BIGINT NOT NULL REFERENCES public.usuarios(id) ON DELETE CASCADE,
    semana     DATE   NOT NULL,
    UNIQUE (usuario_id, semana)
);

CREATE TABLE IF NOT EXISTS public.elementos_menu_semanal (
    id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    menu_id     BIGINT NOT NULL REFERENCES public.menus_semanales(id) ON DELETE CASCADE,
    receta_id   BIGINT NOT NULL REFERENCES public.recetas(id) ON DELETE CASCADE,
    dia_semana  SMALLINT NOT NULL CHECK (dia_semana BETWEEN 1 AND 7),
    tipo_comida VARCHAR(20) NOT NULL
        CHECK (tipo_comida IN ('DESAYUNO', 'ALMUERZO', 'CENA', 'MERIENDA')),
    UNIQUE (menu_id, dia_semana, tipo_comida)
);

CREATE TABLE IF NOT EXISTS public.listas_compra (
    id         BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    usuario_id BIGINT NOT NULL REFERENCES public.usuarios(id) ON DELETE CASCADE,
    menu_id    BIGINT REFERENCES public.menus_semanales(id) ON DELETE SET NULL,
    nombre     VARCHAR(100) NOT NULL,
    creada_en  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.elementos_lista_compra (
    id                   BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    lista_id             BIGINT NOT NULL REFERENCES public.listas_compra(id) ON DELETE CASCADE,
    ingrediente_id       BIGINT REFERENCES public.ingredientes(id),
    nombre_personalizado VARCHAR(100),
    cantidad             DOUBLE PRECISION,
    unidad               VARCHAR(30),
    comprado             BOOLEAN NOT NULL DEFAULT FALSE,
    CONSTRAINT elementos_lista_compra_ingrediente_o_nombre_ck
        CHECK (
            ingrediente_id IS NOT NULL
            OR NULLIF(BTRIM(nombre_personalizado), '') IS NOT NULL
        )
);

CREATE TABLE IF NOT EXISTS public.restricciones_alimentarias (
    id     BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    nombre VARCHAR(80) NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS public.alergias (
    id     BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    nombre VARCHAR(80) NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS public.usuarios_restricciones (
    usuario_id     BIGINT NOT NULL REFERENCES public.usuarios(id) ON DELETE CASCADE,
    restriccion_id BIGINT NOT NULL REFERENCES public.restricciones_alimentarias(id) ON DELETE CASCADE,
    PRIMARY KEY (usuario_id, restriccion_id)
);

CREATE TABLE IF NOT EXISTS public.usuarios_alergias (
    usuario_id BIGINT NOT NULL REFERENCES public.usuarios(id) ON DELETE CASCADE,
    alergia_id BIGINT NOT NULL REFERENCES public.alergias(id) ON DELETE CASCADE,
    PRIMARY KEY (usuario_id, alergia_id)
);

-- Alérgenos por ingrediente (los administra el panel web, pestaña "Alergias").
CREATE TABLE IF NOT EXISTS public.ingredientes_alergias (
    ingrediente_id BIGINT NOT NULL REFERENCES public.ingredientes(id) ON DELETE CASCADE,
    alergia_id     BIGINT NOT NULL REFERENCES public.alergias(id)     ON DELETE CASCADE,
    PRIMARY KEY (ingrediente_id, alergia_id)
);

-- Ingredientes ya revisados (aunque no contengan ningún alérgeno).
CREATE TABLE IF NOT EXISTS public.ingredientes_revisados (
    ingrediente_id BIGINT PRIMARY KEY REFERENCES public.ingredientes(id) ON DELETE CASCADE
);

-- Comentarios sobre recetas (los comentarios de publicaciones están en "comments").
CREATE TABLE IF NOT EXISTS public.comentarios (
    id         BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    receta_id  BIGINT NOT NULL REFERENCES public.recetas(id)  ON DELETE CASCADE,
    usuario_id BIGINT NOT NULL REFERENCES public.usuarios(id) ON DELETE CASCADE,
    contenido  VARCHAR(1000) NOT NULL,
    creado_en  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.resenas (
    id         BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    receta_id  BIGINT NOT NULL REFERENCES public.recetas(id)  ON DELETE CASCADE,
    usuario_id BIGINT NOT NULL REFERENCES public.usuarios(id) ON DELETE CASCADE,
    puntuacion SMALLINT NOT NULL CHECK (puntuacion BETWEEN 1 AND 5),
    comentario VARCHAR(1000),
    creado_en  TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (receta_id, usuario_id)
);

CREATE TABLE IF NOT EXISTS public.reportes (
    id           BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    usuario_id   BIGINT NOT NULL REFERENCES public.usuarios(id) ON DELETE CASCADE,
    receta_id    BIGINT NOT NULL REFERENCES public.recetas(id)  ON DELETE CASCADE,
    motivo       VARCHAR(500) NOT NULL,
    estado       VARCHAR(20)  NOT NULL DEFAULT 'PENDIENTE',
    moderador_id BIGINT REFERENCES public.usuarios(id) ON DELETE SET NULL,
    creado_en    TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT reportes_estado_backend_check
        CHECK (estado IN ('PENDIENTE', 'REVISADO', 'DESCARTADO'))
);

-- Campana de Inicio de la app.
CREATE TABLE IF NOT EXISTS public.notificaciones (
    id         BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    usuario_id BIGINT NOT NULL REFERENCES public.usuarios(id) ON DELETE CASCADE,
    titulo     VARCHAR(120) NOT NULL,
    mensaje    TEXT NOT NULL,
    tipo       VARCHAR(30) NOT NULL DEFAULT 'GENERAL',
    receta_id  BIGINT REFERENCES public.recetas(id) ON DELETE CASCADE,
    leida      BOOLEAN NOT NULL DEFAULT FALSE,
    creado_en  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Tiempo de uso de la app (ServicioUso y ServicioEstadisticas).
CREATE TABLE IF NOT EXISTS public.sesiones_uso (
    id            BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    usuario_id    BIGINT NOT NULL REFERENCES public.usuarios(id) ON DELETE CASCADE,
    inicio        TIMESTAMPTZ NOT NULL DEFAULT now(),
    ultimo_latido TIMESTAMPTZ NOT NULL DEFAULT now(),
    plataforma    VARCHAR(20)
);

-- Registro de acciones del panel administrativo.
CREATE TABLE IF NOT EXISTS public.acciones_admin (
    id           BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    admin_correo VARCHAR(254) NOT NULL,
    accion       VARCHAR(40)  NOT NULL,
    detalle      VARCHAR(300),
    creado_en    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- -----------------------------------------------------------------------------
-- 3. Comunidad (la app la consulta directamente con Supabase Auth)
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.profiles (
    user_id         UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    username        TEXT NOT NULL UNIQUE,
    nombre_completo TEXT,
    avatar          TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
-- Si la tabla ya existía sin la columna de avatar de la app:
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS avatar TEXT;

CREATE TABLE IF NOT EXISTS public.posts (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id    UUID NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
    contenido  TEXT NOT NULL DEFAULT '',
    imagen_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT posts_contenido_o_imagen_ck
        CHECK (NULLIF(BTRIM(contenido), '') IS NOT NULL OR imagen_url IS NOT NULL)
);

-- Las notificaciones de la campana pueden apuntar a una publicación de la Comunidad
-- (ControladorNotificacion lee la columna post_id). Se agrega aquí porque "posts" se crea arriba.
ALTER TABLE public.notificaciones
    ADD COLUMN IF NOT EXISTS post_id UUID REFERENCES public.posts(id) ON DELETE CASCADE;

CREATE TABLE IF NOT EXISTS public.likes (
    post_id    UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
    user_id    UUID NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (post_id, user_id)
);

CREATE TABLE IF NOT EXISTS public.comments (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    post_id           UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
    user_id           UUID NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
    parent_comment_id UUID,
    contenido         TEXT NOT NULL,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT comments_id_post_unique UNIQUE (id, post_id),
    CONSTRAINT comments_contenido_no_vacio_ck CHECK (LENGTH(BTRIM(contenido)) > 0),
    CONSTRAINT comments_parent_same_post_fk
        FOREIGN KEY (parent_comment_id, post_id)
        REFERENCES public.comments(id, post_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS public.comment_likes (
    comment_id UUID NOT NULL REFERENCES public.comments(id) ON DELETE CASCADE,
    user_id    UUID NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (comment_id, user_id)
);

-- Reportes de publicaciones y comentarios de la Comunidad.
-- La app inserta: { tipo, post_id | comentario_id, motivo }.
CREATE TABLE IF NOT EXISTS public.reportes_comunidad (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tipo          TEXT NOT NULL CHECK (tipo IN ('POST', 'COMENTARIO')),
    post_id       UUID REFERENCES public.posts(id)    ON DELETE CASCADE,
    comentario_id UUID REFERENCES public.comments(id) ON DELETE CASCADE,
    reportado_por UUID NOT NULL DEFAULT auth.uid()
        REFERENCES auth.users(id) ON DELETE CASCADE,
    motivo        TEXT NOT NULL,
    estado        TEXT NOT NULL DEFAULT 'PENDIENTE'
        CHECK (estado IN ('PENDIENTE', 'REVISADO', 'DESCARTADO')),
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT reportes_comunidad_contenido_ck CHECK (
        (tipo = 'POST'       AND post_id IS NOT NULL       AND comentario_id IS NULL) OR
        (tipo = 'COMENTARIO' AND comentario_id IS NOT NULL AND post_id IS NULL)
    ),
    CONSTRAINT reportes_comunidad_motivo_ck CHECK (motivo IN (
        'Spam o publicidad',
        'Fuera de tema (no es cocina)',
        'Información falsa o peligrosa',
        'Acoso u ofensas',
        'Plagio o derechos de autor'
    ))
);
-- "Ya reportaste este contenido" (la app lee el código de error 23505).
CREATE UNIQUE INDEX IF NOT EXISTS reportes_comunidad_unico_post
    ON public.reportes_comunidad (post_id, reportado_por) WHERE post_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS reportes_comunidad_unico_comentario
    ON public.reportes_comunidad (comentario_id, reportado_por) WHERE comentario_id IS NOT NULL;

-- -----------------------------------------------------------------------------
-- 4. Push y avisos de la Comunidad
-- -----------------------------------------------------------------------------

-- Tokens de los teléfonos (se registran con la función registrar_push_token).
CREATE TABLE IF NOT EXISTS public.push_tokens (
    token      TEXT PRIMARY KEY,
    user_id    UUID NOT NULL,
    plataforma TEXT NOT NULL DEFAULT 'android',
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Avisos de me gusta, comentarios y respuestas de la Comunidad.
CREATE TABLE IF NOT EXISTS public.avisos_comunidad (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id    UUID NOT NULL,
    actor_id   UUID NOT NULL,
    tipo       TEXT NOT NULL
        CHECK (tipo IN ('like_post', 'like_comment', 'respuesta', 'comentario')),
    post_id    UUID,
    comment_id UUID,
    leida      BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- -----------------------------------------------------------------------------
-- 5. Funciones y triggers
-- -----------------------------------------------------------------------------

-- 5.1 Crea un perfil por cada usuario nuevo de Supabase Auth.
CREATE OR REPLACE FUNCTION public.cookly_crear_perfil_auth()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    base_usuario TEXT;
BEGIN
    base_usuario := LOWER(REGEXP_REPLACE(
        SPLIT_PART(COALESCE(NEW.email, 'usuario'), '@', 1), '[^a-z0-9_]+', '_', 'g'));
    IF base_usuario IS NULL OR base_usuario = '' THEN
        base_usuario := 'usuario';
    END IF;

    INSERT INTO public.profiles (user_id, username, nombre_completo)
    VALUES (
        NEW.id,
        LEFT(base_usuario, 48) || '_' || LEFT(REPLACE(NEW.id::TEXT, '-', ''), 8),
        NULLIF(NEW.raw_user_meta_data ->> 'nombre_completo', '')
    )
    ON CONFLICT (user_id) DO NOTHING;
    RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.cookly_crear_perfil_auth()
    FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS cookly_crear_perfil_despues_de_signup ON auth.users;
CREATE TRIGGER cookly_crear_perfil_despues_de_signup
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.cookly_crear_perfil_auth();

-- Perfiles para usuarios de Auth que ya existieran antes del trigger.
INSERT INTO public.profiles (user_id, username, nombre_completo)
SELECT
    u.id,
    LEFT(LOWER(REGEXP_REPLACE(
        SPLIT_PART(COALESCE(u.email, 'usuario'), '@', 1), '[^a-z0-9_]+', '_', 'g')), 48)
        || '_' || LEFT(REPLACE(u.id::TEXT, '-', ''), 8),
    NULLIF(u.raw_user_meta_data ->> 'nombre_completo', '')
FROM auth.users AS u
ON CONFLICT (user_id) DO NOTHING;

-- 5.2 Cada persona actualiza SU PROPIO perfil (nombre y avatar).
--     La app llama a esta función desde lib/perfilSupabase.ts.
CREATE OR REPLACE FUNCTION public.actualizar_mi_perfil(
    p_nombre TEXT DEFAULT NULL,
    p_avatar TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'No hay sesión iniciada';
    END IF;
    UPDATE public.profiles
       SET nombre_completo = COALESCE(p_nombre, nombre_completo),
           avatar          = COALESCE(p_avatar, avatar)
     WHERE user_id = auth.uid();
END;
$$;

REVOKE ALL ON FUNCTION public.actualizar_mi_perfil(TEXT, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.actualizar_mi_perfil(TEXT, TEXT) TO authenticated;

-- 5.3 Receta nueva -> avisa a todos los usuarios activos (no a los administradores).
CREATE OR REPLACE FUNCTION public.notificar_receta_nueva() RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.notificaciones (usuario_id, titulo, mensaje, tipo, receta_id)
    SELECT u.id, 'Receta nueva', '¡Ya puedes cocinar "' || NEW.nombre || '"!', 'RECETA', NEW.id
    FROM public.usuarios u
    WHERE u.rol <> 'ADMINISTRADOR' AND u.activo = TRUE;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_notificar_receta_nueva ON public.recetas;
CREATE TRIGGER trg_notificar_receta_nueva
    AFTER INSERT ON public.recetas
    FOR EACH ROW EXECUTE FUNCTION public.notificar_receta_nueva();

-- 5.4 Reporte revisado o descartado -> avisa a quien lo envió.
CREATE OR REPLACE FUNCTION public.notificar_reporte_resuelto() RETURNS TRIGGER AS $$
DECLARE
    v_nombre TEXT;
BEGIN
    SELECT nombre INTO v_nombre FROM public.recetas WHERE id = NEW.receta_id;
    INSERT INTO public.notificaciones (usuario_id, titulo, mensaje, tipo, receta_id)
    VALUES (
        NEW.usuario_id,
        CASE WHEN NEW.estado = 'REVISADO' THEN 'Reporte atendido' ELSE 'Reporte revisado' END,
        CASE WHEN NEW.estado = 'REVISADO'
             THEN 'Gracias por avisar: revisamos tu reporte sobre "' || COALESCE(v_nombre, 'la receta') || '" y tomamos medidas.'
             ELSE 'Revisamos tu reporte sobre "' || COALESCE(v_nombre, 'la receta') || '" y no encontramos un problema.' END,
        'REPORTE',
        NULL  -- sin enlace a la receta: si la eliminan, el aviso no debe desaparecer con ella
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_notificar_reporte_resuelto ON public.reportes;
CREATE TRIGGER trg_notificar_reporte_resuelto
    AFTER UPDATE OF estado ON public.reportes
    FOR EACH ROW
    WHEN (OLD.estado = 'PENDIENTE' AND NEW.estado IN ('REVISADO', 'DESCARTADO'))
    EXECUTE FUNCTION public.notificar_reporte_resuelto();

-- 5.5 Registro y baja de tokens push (la app los llama con supabase.rpc).
CREATE OR REPLACE FUNCTION public.registrar_push_token(
    p_token TEXT, p_plataforma TEXT DEFAULT 'android'
)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
    IF auth.uid() IS NULL THEN RAISE EXCEPTION 'No hay sesión iniciada'; END IF;
    INSERT INTO public.push_tokens (token, user_id, plataforma, updated_at)
    VALUES (p_token, auth.uid(), COALESCE(p_plataforma, 'android'), now())
    ON CONFLICT (token) DO UPDATE
        SET user_id = EXCLUDED.user_id,
            plataforma = EXCLUDED.plataforma,
            updated_at = now();
END $$;

CREATE OR REPLACE FUNCTION public.quitar_push_token(p_token TEXT)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
    DELETE FROM public.push_tokens WHERE token = p_token AND user_id = auth.uid();
END $$;

REVOKE ALL ON FUNCTION public.registrar_push_token(TEXT, TEXT) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.quitar_push_token(TEXT)          FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.registrar_push_token(TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.quitar_push_token(TEXT)          TO authenticated;

-- 5.6 Avisos de la Comunidad: me gusta en publicación.
CREATE OR REPLACE FUNCTION public.tg_notif_like_post() RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE dueno UUID;
BEGIN
    SELECT user_id INTO dueno FROM public.posts WHERE id = NEW.post_id;
    IF dueno IS NOT NULL AND dueno <> NEW.user_id THEN
        INSERT INTO public.avisos_comunidad (user_id, actor_id, tipo, post_id)
        VALUES (dueno, NEW.user_id, 'like_post', NEW.post_id)
        ON CONFLICT DO NOTHING;
    END IF;
    RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS notif_like_post ON public.likes;
CREATE TRIGGER notif_like_post AFTER INSERT ON public.likes
    FOR EACH ROW EXECUTE FUNCTION public.tg_notif_like_post();

-- 5.7 Me gusta en un comentario.
CREATE OR REPLACE FUNCTION public.tg_notif_like_comment() RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE dueno UUID; pid UUID;
BEGIN
    SELECT user_id, post_id INTO dueno, pid FROM public.comments WHERE id = NEW.comment_id;
    IF dueno IS NOT NULL AND dueno <> NEW.user_id THEN
        INSERT INTO public.avisos_comunidad (user_id, actor_id, tipo, post_id, comment_id)
        VALUES (dueno, NEW.user_id, 'like_comment', pid, NEW.comment_id)
        ON CONFLICT DO NOTHING;
    END IF;
    RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS notif_like_comment ON public.comment_likes;
CREATE TRIGGER notif_like_comment AFTER INSERT ON public.comment_likes
    FOR EACH ROW EXECUTE FUNCTION public.tg_notif_like_comment();

-- 5.8 Respuesta a un comentario, o comentario en una publicación.
CREATE OR REPLACE FUNCTION public.tg_notif_comentario() RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE dueno UUID;
BEGIN
    IF NEW.parent_comment_id IS NOT NULL THEN
        SELECT user_id INTO dueno FROM public.comments WHERE id = NEW.parent_comment_id;
        IF dueno IS NOT NULL AND dueno <> NEW.user_id THEN
            INSERT INTO public.avisos_comunidad (user_id, actor_id, tipo, post_id, comment_id)
            VALUES (dueno, NEW.user_id, 'respuesta', NEW.post_id, NEW.id)
            ON CONFLICT DO NOTHING;
        END IF;
    ELSE
        SELECT user_id INTO dueno FROM public.posts WHERE id = NEW.post_id;
        IF dueno IS NOT NULL AND dueno <> NEW.user_id THEN
            INSERT INTO public.avisos_comunidad (user_id, actor_id, tipo, post_id, comment_id)
            VALUES (dueno, NEW.user_id, 'comentario', NEW.post_id, NEW.id)
            ON CONFLICT DO NOTHING;
        END IF;
    END IF;
    RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS notif_comentario ON public.comments;
CREATE TRIGGER notif_comentario AFTER INSERT ON public.comments
    FOR EACH ROW EXECUTE FUNCTION public.tg_notif_comentario();

-- 5.9 Enviar el aviso al teléfono (Expo Push).
CREATE OR REPLACE FUNCTION public.tg_enviar_push() RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions AS $$
DECLARE nombre TEXT; texto TEXT; extracto TEXT; mensajes JSONB;
BEGIN
    SELECT COALESCE(NULLIF(SPLIT_PART(nombre_completo, ' ', 1), ''), NULLIF(username, ''), 'Alguien')
      INTO nombre FROM public.profiles WHERE user_id = NEW.actor_id;
    nombre := COALESCE(nombre, 'Alguien');

    IF NEW.tipo = 'like_post' THEN
        texto := nombre || ' le dio me gusta a tu publicación';
    ELSIF NEW.tipo = 'like_comment' THEN
        texto := nombre || ' le dio me gusta a tu comentario';
    ELSIF NEW.tipo = 'respuesta' THEN
        SELECT LEFT(contenido, 80) INTO extracto FROM public.comments WHERE id = NEW.comment_id;
        texto := nombre || ' respondió tu comentario' || COALESCE(': ' || extracto, '');
    ELSE
        SELECT LEFT(contenido, 80) INTO extracto FROM public.comments WHERE id = NEW.comment_id;
        texto := nombre || ' comentó tu publicación' || COALESCE(': ' || extracto, '');
    END IF;

    SELECT jsonb_agg(jsonb_build_object(
             'to', token, 'title', 'Cookly', 'body', texto, 'sound', 'default', 'channelId', 'social',
             'data', jsonb_build_object('tipo', NEW.tipo, 'postId', NEW.post_id,
                                        'commentId', NEW.comment_id, 'notificacionId', NEW.id)))
      INTO mensajes
      FROM public.push_tokens WHERE user_id = NEW.user_id;

    IF mensajes IS NOT NULL THEN
        PERFORM net.http_post(
            url     := 'https://exp.host/--/api/v2/push/send',
            headers := jsonb_build_object('Content-Type', 'application/json', 'Accept', 'application/json'),
            body    := mensajes
        );
    END IF;
    RETURN NEW;
EXCEPTION WHEN OTHERS THEN
    RETURN NEW;  -- un fallo al avisar nunca debe impedir el me gusta o el comentario
END $$;
DROP TRIGGER IF EXISTS enviar_push ON public.avisos_comunidad;
CREATE TRIGGER enviar_push AFTER INSERT ON public.avisos_comunidad
    FOR EACH ROW EXECUTE FUNCTION public.tg_enviar_push();

-- -----------------------------------------------------------------------------
-- 6. Índices
-- -----------------------------------------------------------------------------

CREATE INDEX IF NOT EXISTS indice_recetas_nombre
    ON public.recetas USING GIN (to_tsvector('spanish', nombre));
CREATE INDEX IF NOT EXISTS indice_ingredientes_receta
    ON public.ingredientes_receta (ingrediente_id, receta_id);
CREATE INDEX IF NOT EXISTS indice_historial_usuario
    ON public.historial_recetas (usuario_id, visto_en DESC);
CREATE INDEX IF NOT EXISTS indice_elementos_menu
    ON public.elementos_menu_semanal (menu_id, dia_semana);
CREATE INDEX IF NOT EXISTS indice_elementos_lista
    ON public.elementos_lista_compra (lista_id, ingrediente_id);
CREATE INDEX IF NOT EXISTS indice_sesiones_usuario
    ON public.sesiones_uso (usuario_id, ultimo_latido DESC);
CREATE INDEX IF NOT EXISTS indice_sesiones_inicio
    ON public.sesiones_uso (inicio);
CREATE INDEX IF NOT EXISTS indice_acciones_admin_fecha
    ON public.acciones_admin (creado_en DESC);
CREATE INDEX IF NOT EXISTS idx_notificaciones_usuario
    ON public.notificaciones (usuario_id, leida, creado_en DESC);
CREATE INDEX IF NOT EXISTS indice_posts_created_at
    ON public.posts (created_at DESC);
CREATE INDEX IF NOT EXISTS indice_comments_post_created_at
    ON public.comments (post_id, created_at);
CREATE INDEX IF NOT EXISTS indice_comments_parent
    ON public.comments (parent_comment_id);
CREATE INDEX IF NOT EXISTS push_tokens_user_idx
    ON public.push_tokens (user_id);
CREATE INDEX IF NOT EXISTS avisos_user_idx
    ON public.avisos_comunidad (user_id, created_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS avisos_unica_idx
    ON public.avisos_comunidad
    (user_id, actor_id, tipo, (COALESCE(post_id::TEXT, '')), (COALESCE(comment_id::TEXT, '')));

-- -----------------------------------------------------------------------------
-- 7. Seguridad
--    - Tablas del backend: RLS activo y sin acceso para anon/authenticated
--      (solo el backend Java, que usa el rol postgres y se salta RLS).
--    - Comunidad: RLS con políticas por usuario.
-- -----------------------------------------------------------------------------

DO $$
DECLARE
    nombre_tabla TEXT;
    tablas_backend TEXT[] := ARRAY[
        'usuarios', 'ingredientes', 'recetas', 'ingredientes_receta',
        'pasos_receta', 'imagenes', 'etiquetas', 'recetas_etiquetas',
        'favoritos', 'historial_recetas', 'menus_semanales',
        'elementos_menu_semanal', 'listas_compra', 'elementos_lista_compra',
        'restricciones_alimentarias', 'alergias', 'usuarios_restricciones',
        'usuarios_alergias', 'ingredientes_alergias', 'ingredientes_revisados',
        'comentarios', 'resenas', 'reportes', 'notificaciones',
        'sesiones_uso', 'acciones_admin'
    ];
BEGIN
    FOREACH nombre_tabla IN ARRAY tablas_backend LOOP
        IF to_regclass('public.' || nombre_tabla) IS NOT NULL THEN
            EXECUTE FORMAT('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', nombre_tabla);
            EXECUTE FORMAT('REVOKE ALL ON TABLE public.%I FROM anon, authenticated', nombre_tabla);
            EXECUTE FORMAT('DROP POLICY IF EXISTS cookly_denegar_todo ON public.%I', nombre_tabla);
            EXECUTE FORMAT(
                'CREATE POLICY cookly_denegar_todo ON public.%I
                 FOR ALL TO anon, authenticated USING (FALSE) WITH CHECK (FALSE)',
                nombre_tabla);
        END IF;
    END LOOP;
END $$;

-- Tablas internas de push: nadie entra directo; se usan por funciones y triggers.
ALTER TABLE public.push_tokens ENABLE ROW LEVEL SECURITY;

-- Comunidad
ALTER TABLE public.profiles          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.posts             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.likes             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comments          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comment_likes     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reportes_comunidad ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.avisos_comunidad  ENABLE ROW LEVEL SECURITY;

GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT SELECT ON public.profiles, public.posts, public.likes,
    public.comments, public.comment_likes TO anon, authenticated;
GRANT INSERT ON public.posts, public.likes, public.comments,
    public.comment_likes TO authenticated;
GRANT UPDATE ON public.profiles, public.posts, public.comments TO authenticated;
GRANT DELETE ON public.posts, public.likes, public.comments,
    public.comment_likes TO authenticated;
GRANT INSERT ON public.reportes_comunidad TO authenticated;
GRANT SELECT, UPDATE, DELETE ON public.avisos_comunidad TO authenticated;

-- profiles
DROP POLICY IF EXISTS cookly_profiles_public_read ON public.profiles;
CREATE POLICY cookly_profiles_public_read ON public.profiles
    FOR SELECT TO anon, authenticated USING (TRUE);
DROP POLICY IF EXISTS cookly_profiles_update_self ON public.profiles;
CREATE POLICY cookly_profiles_update_self ON public.profiles
    FOR UPDATE TO authenticated
    USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- posts
DROP POLICY IF EXISTS cookly_posts_public_read ON public.posts;
CREATE POLICY cookly_posts_public_read ON public.posts
    FOR SELECT TO anon, authenticated USING (TRUE);
DROP POLICY IF EXISTS cookly_posts_insert_self ON public.posts;
CREATE POLICY cookly_posts_insert_self ON public.posts
    FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS cookly_posts_update_self ON public.posts;
CREATE POLICY cookly_posts_update_self ON public.posts
    FOR UPDATE TO authenticated
    USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS cookly_posts_delete_self ON public.posts;
CREATE POLICY cookly_posts_delete_self ON public.posts
    FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- likes
DROP POLICY IF EXISTS cookly_likes_public_read ON public.likes;
CREATE POLICY cookly_likes_public_read ON public.likes
    FOR SELECT TO anon, authenticated USING (TRUE);
DROP POLICY IF EXISTS cookly_likes_insert_self ON public.likes;
CREATE POLICY cookly_likes_insert_self ON public.likes
    FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS cookly_likes_delete_self ON public.likes;
CREATE POLICY cookly_likes_delete_self ON public.likes
    FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- comments
DROP POLICY IF EXISTS cookly_comments_public_read ON public.comments;
CREATE POLICY cookly_comments_public_read ON public.comments
    FOR SELECT TO anon, authenticated USING (TRUE);
DROP POLICY IF EXISTS cookly_comments_insert_self ON public.comments;
CREATE POLICY cookly_comments_insert_self ON public.comments
    FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS cookly_comments_update_self ON public.comments;
CREATE POLICY cookly_comments_update_self ON public.comments
    FOR UPDATE TO authenticated
    USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS cookly_comments_delete_self ON public.comments;
CREATE POLICY cookly_comments_delete_self ON public.comments
    FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- comment_likes
DROP POLICY IF EXISTS cookly_comment_likes_public_read ON public.comment_likes;
CREATE POLICY cookly_comment_likes_public_read ON public.comment_likes
    FOR SELECT TO anon, authenticated USING (TRUE);
DROP POLICY IF EXISTS cookly_comment_likes_insert_self ON public.comment_likes;
CREATE POLICY cookly_comment_likes_insert_self ON public.comment_likes
    FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS cookly_comment_likes_delete_self ON public.comment_likes;
CREATE POLICY cookly_comment_likes_delete_self ON public.comment_likes
    FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- reportes_comunidad: cualquier usuario con sesión crea SUS reportes.
-- Nadie los lee desde la app; los revisa el backend (panel admin) con el rol postgres.
DROP POLICY IF EXISTS cookly_reportes_comunidad_insert ON public.reportes_comunidad;
CREATE POLICY cookly_reportes_comunidad_insert ON public.reportes_comunidad
    FOR INSERT TO authenticated WITH CHECK (reportado_por = auth.uid());

-- avisos_comunidad: cada usuario ve y gestiona solo los suyos.
DROP POLICY IF EXISTS avisos_ver    ON public.avisos_comunidad;
DROP POLICY IF EXISTS avisos_marcar ON public.avisos_comunidad;
DROP POLICY IF EXISTS avisos_borrar ON public.avisos_comunidad;
CREATE POLICY avisos_ver    ON public.avisos_comunidad
    FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY avisos_marcar ON public.avisos_comunidad
    FOR UPDATE TO authenticated
    USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY avisos_borrar ON public.avisos_comunidad
    FOR DELETE TO authenticated USING (user_id = auth.uid());

-- -----------------------------------------------------------------------------
-- 8. Storage: bucket público para imágenes de publicaciones
--    Bucket público => las URLs de getPublicUrl() funcionan sin política SELECT
--    (así no se puede listar el contenido del bucket). Cada usuario solo escribe
--    en la carpeta cuyo primer segmento es su UUID.
-- -----------------------------------------------------------------------------

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'posts-images', 'posts-images', TRUE, 10485760,
    ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/heic', 'image/heif']
)
ON CONFLICT (id) DO UPDATE
SET public = EXCLUDED.public,
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS cookly_posts_images_public_read ON storage.objects;

DROP POLICY IF EXISTS cookly_posts_images_insert_self ON storage.objects;
CREATE POLICY cookly_posts_images_insert_self ON storage.objects
    FOR INSERT TO authenticated
    WITH CHECK (bucket_id = 'posts-images'
                AND (storage.foldername(name))[1] = auth.uid()::TEXT);

DROP POLICY IF EXISTS cookly_posts_images_update_self ON storage.objects;
CREATE POLICY cookly_posts_images_update_self ON storage.objects
    FOR UPDATE TO authenticated
    USING (bucket_id = 'posts-images'
           AND (storage.foldername(name))[1] = auth.uid()::TEXT)
    WITH CHECK (bucket_id = 'posts-images'
                AND (storage.foldername(name))[1] = auth.uid()::TEXT);

DROP POLICY IF EXISTS cookly_posts_images_delete_self ON storage.objects;
CREATE POLICY cookly_posts_images_delete_self ON storage.objects
    FOR DELETE TO authenticated
    USING (bucket_id = 'posts-images'
           AND (storage.foldername(name))[1] = auth.uid()::TEXT);

-- -----------------------------------------------------------------------------
-- 9. Datos iniciales (catálogos)
-- -----------------------------------------------------------------------------

INSERT INTO public.ingredientes (nombre) VALUES
    ('huevo'), ('arroz'), ('tomate'), ('pollo'),
    ('cebolla'), ('ajo'), ('papa'), ('limón')
ON CONFLICT (nombre) DO NOTHING;

INSERT INTO public.etiquetas (nombre) VALUES
    ('Postres'), ('Saludables'), ('Comida rápida'), ('Platos fuertes')
ON CONFLICT (nombre) DO NOTHING;

INSERT INTO public.restricciones_alimentarias (nombre) VALUES
    ('Vegetariana'), ('Vegana'), ('Sin gluten')
ON CONFLICT (nombre) DO NOTHING;

-- Alergias que se muestran en la pantalla "¿Tienes alguna alergia?".
INSERT INTO public.alergias (nombre) VALUES
    ('Gluten'), ('Lácteos'), ('Huevo'), ('Maní'), ('Frutos secos'),
    ('Mariscos'), ('Pescado'), ('Soya'), ('Sésamo')
ON CONFLICT (nombre) DO NOTHING;

COMMIT;

-- Refresca el caché de relaciones de PostgREST para los SELECT anidados.
NOTIFY pgrst, 'reload schema';

-- Verificación rápida:
-- SELECT table_name FROM information_schema.tables
--  WHERE table_schema = 'public' ORDER BY table_name;

-- -----------------------------------------------------------------------------
-- 10. Recetas de ejemplo (4 recetas)
--     ANTES DE EJECUTAR: cambia el correo de la línea "CAMBIA ESTE CORREO" por el
--     de un usuario ya registrado en la app (será el creador de las recetas).
--     Si prefieres no cargar recetas de ejemplo, borra todo desde aquí hasta el final.
--     Se puede correr varias veces: las recetas que ya existen se saltan.
-- -----------------------------------------------------------------------------

DO $$
DECLARE
    v_usuario_id  BIGINT;
    v_receta_id   BIGINT;
    v_ing_id      BIGINT;
    v_etiqueta_id BIGINT;
    v_orden       INT;
    r JSONB;
    i JSONB;
    p JSONB;
    datos JSONB := '[
      {
        "nombre": "Tortilla de tomate",
        "descripcion": "Tortilla sencilla con huevo, tomate y cebolla.",
        "minutos": 20,
        "etiqueta": "Comida rápida",
        "ingredientes": [
          {"n": "huevo",   "c": 2,   "u": "unidad"},
          {"n": "tomate",  "c": 1,   "u": "unidad"},
          {"n": "cebolla", "c": 0.5, "u": "unidad"}
        ],
        "pasos": [
          "Pica el tomate y la cebolla.",
          "Bate los huevos y mézclalos con los vegetales.",
          "Cocina la mezcla en una sartén hasta que cuaje."
        ]
      },
      {
        "nombre": "Arroz con pollo",
        "descripcion": "Arroz suelto y sabroso con pollo, cebolla, ajo y tomate.",
        "minutos": 45,
        "etiqueta": "Platos fuertes",
        "ingredientes": [
          {"n": "arroz",   "c": 2,   "u": "taza"},
          {"n": "pollo",   "c": 500, "u": "g"},
          {"n": "cebolla", "c": 1,   "u": "unidad"},
          {"n": "ajo",     "c": 3,   "u": "diente"},
          {"n": "tomate",  "c": 2,   "u": "unidad"}
        ],
        "pasos": [
          "Corta el pollo en presas y sazónalo con sal y pimienta.",
          "Dora el pollo en una olla y resérvalo.",
          "Sofríe la cebolla, el ajo y el tomate picados.",
          "Agrega el arroz, el pollo y agua caliente; tapa y cocina a fuego bajo hasta que el arroz esté listo."
        ]
      },
      {
        "nombre": "Papas doradas al limón",
        "descripcion": "Papas al horno con ajo y un toque de limón.",
        "minutos": 40,
        "etiqueta": "Saludables",
        "ingredientes": [
          {"n": "papa",  "c": 4, "u": "unidad"},
          {"n": "ajo",   "c": 2, "u": "diente"},
          {"n": "limón", "c": 1, "u": "unidad"}
        ],
        "pasos": [
          "Corta las papas en cubos y mézclalas con ajo picado y jugo de limón.",
          "Colócalas en una bandeja con un poco de aceite.",
          "Hornea a 200 °C por 30 minutos, moviéndolas a la mitad."
        ]
      },
      {
        "nombre": "Arroz con leche",
        "descripcion": "Postre cremoso de arroz con canela.",
        "minutos": 35,
        "etiqueta": "Postres",
        "ingredientes": [
          {"n": "arroz",  "c": 1,   "u": "taza"},
          {"n": "leche",  "c": 1,   "u": "L"},
          {"n": "azúcar", "c": 0.5, "u": "taza"},
          {"n": "canela", "c": 1,   "u": "rama"}
        ],
        "pasos": [
          "Hierve el arroz con la canela en agua hasta que esté casi cocido.",
          "Agrega la leche y el azúcar.",
          "Cocina a fuego bajo, removiendo, hasta que espese."
        ]
      }
    ]'::jsonb;
BEGIN
    SELECT id INTO v_usuario_id
    FROM public.usuarios
    WHERE correo = 'tu-correo@ejemplo.com';   -- <<< CAMBIA ESTE CORREO

    IF v_usuario_id IS NULL THEN
        RAISE EXCEPTION 'No existe un usuario con ese correo. Regístrate primero en la app y cambia el correo del script.';
    END IF;

    FOR r IN SELECT value FROM jsonb_array_elements(datos) LOOP
        -- Si la receta ya existe, se salta (así se puede correr varias veces).
        IF EXISTS (SELECT 1 FROM public.recetas WHERE nombre = r->>'nombre') THEN
            CONTINUE;
        END IF;

        INSERT INTO public.recetas (nombre, descripcion, minutos_preparacion, creador_id)
        VALUES (r->>'nombre', r->>'descripcion', (r->>'minutos')::SMALLINT, v_usuario_id)
        RETURNING id INTO v_receta_id;

        FOR i IN SELECT value FROM jsonb_array_elements(r->'ingredientes') LOOP
            INSERT INTO public.ingredientes (nombre)
            VALUES (i->>'n')
            ON CONFLICT (nombre) DO UPDATE SET nombre = EXCLUDED.nombre
            RETURNING id INTO v_ing_id;

            INSERT INTO public.ingredientes_receta (receta_id, ingrediente_id, cantidad, unidad)
            VALUES (v_receta_id, v_ing_id, (i->>'c')::DOUBLE PRECISION, i->>'u');
        END LOOP;

        v_orden := 0;
        FOR p IN SELECT value FROM jsonb_array_elements(r->'pasos') LOOP
            v_orden := v_orden + 1;
            INSERT INTO public.pasos_receta (receta_id, orden, instruccion)
            VALUES (v_receta_id, v_orden, p #>> '{}');
        END LOOP;

        v_etiqueta_id := NULL;
        SELECT id INTO v_etiqueta_id FROM public.etiquetas WHERE nombre = r->>'etiqueta';
        IF v_etiqueta_id IS NOT NULL THEN
            INSERT INTO public.recetas_etiquetas (receta_id, etiqueta_id)
            VALUES (v_receta_id, v_etiqueta_id)
            ON CONFLICT DO NOTHING;
        END IF;

        RAISE NOTICE 'Receta creada: % (ID %)', r->>'nombre', v_receta_id;
    END LOOP;
END $$;

-- -----------------------------------------------------------------------------
-- Foto de ejemplo SOLO para las recetas que todavía no tienen imagen.
-- (No cambia las fotos que ya existen.)
-- -----------------------------------------------------------------------------
INSERT INTO public.imagenes (receta_id, url, identificador_publico)
SELECT r.id,
       'https://res.cloudinary.com/pjbmwoxn/image/upload/v1791668357/lomo-saltado.webp',
       'ejemplo-' || r.id::TEXT
FROM public.recetas r
WHERE NOT EXISTS (SELECT 1 FROM public.imagenes i WHERE i.receta_id = r.id)
ON CONFLICT (identificador_publico) DO NOTHING;