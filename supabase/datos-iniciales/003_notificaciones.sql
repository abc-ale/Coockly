-- Notificaciones de Cookly (campana de Inicio). Se corre UNA sola vez en Supabase > SQL Editor.
-- Es seguro correrlo otra vez: no duplica nada.

-- 1) Tabla
CREATE TABLE IF NOT EXISTS public.notificaciones (
    id         BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    usuario_id BIGINT NOT NULL REFERENCES public.usuarios(id) ON DELETE CASCADE,
    titulo     VARCHAR(120) NOT NULL,
    mensaje    TEXT NOT NULL,
    tipo       VARCHAR(30) NOT NULL DEFAULT 'GENERAL',
    receta_id  BIGINT REFERENCES public.recetas(id) ON DELETE CASCADE,
    leida      BOOLEAN NOT NULL DEFAULT false,
    creado_en  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_notificaciones_usuario ON public.notificaciones (usuario_id, leida, creado_en DESC);

-- Privada: solo el servidor de Cookly la usa (nadie entra directo desde internet).
ALTER TABLE public.notificaciones ENABLE ROW LEVEL SECURITY;

-- 2) Receta nueva -> avisa a todos los usuarios (no a los administradores)
CREATE OR REPLACE FUNCTION public.notificar_receta_nueva() RETURNS trigger AS $$
BEGIN
    INSERT INTO public.notificaciones (usuario_id, titulo, mensaje, tipo, receta_id)
    SELECT u.id, 'Receta nueva', '¡Ya puedes cocinar "' || NEW.nombre || '"!', 'RECETA', NEW.id
    FROM public.usuarios u
    WHERE u.rol <> 'ADMINISTRADOR' AND u.activo = true;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_notificar_receta_nueva ON public.recetas;
CREATE TRIGGER trg_notificar_receta_nueva
    AFTER INSERT ON public.recetas
    FOR EACH ROW EXECUTE FUNCTION public.notificar_receta_nueva();

-- 3) Reporte revisado o descartado -> avisa a quien lo envió
CREATE OR REPLACE FUNCTION public.notificar_reporte_resuelto() RETURNS trigger AS $$
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