package com.cookly.servicios;

import com.cookly.dto.SolicitudCrearReceta;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * Funciones del panel web: moderar Comunidad, editar recetas y administrar alérgenos.
 * Todo con JdbcTemplate (los datos de Comunidad usan UUID y no encajan con las entidades de recetas).
 */
@Service
public class ServicioPanelExtra {

    private final JdbcTemplate jdbc;
    private final ServicioAuditoria auditoria;
    private final String zona;

    public ServicioPanelExtra(JdbcTemplate jdbc, ServicioAuditoria auditoria,
                              @Value("${app.zona-horaria:America/Lima}") String zona) {
        this.jdbc = jdbc;
        this.auditoria = auditoria;
        this.zona = zona;
    }

    private static String patron(String q) {
        return "%" + q.trim().replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_") + "%";
    }

    private static UUID uuid(String texto) {
        try {
            return UUID.fromString(texto);
        } catch (IllegalArgumentException e) {
            throw new IllegalArgumentException("Identificador inválido");
        }
    }

    private static String recorte(String t) {
        if (t == null) return "";
        return t.length() > 120 ? t.substring(0, 120) : t;
    }

    // ------------------------------------------------------------------ Comunidad

    @Transactional(readOnly = true)
    public List<Map<String, Object>> publicaciones(String q) {
        boolean filtra = q != null && !q.isBlank();
        List<Object> p = new ArrayList<>();
        p.add(zona);
        String sql = "SELECT p.id::text AS id, COALESCE(p.contenido, '') AS contenido, "
                + "COALESCE(pr.nombre_completo, pr.username, '(sin perfil)') AS autor, "
                + "to_char((COALESCE(to_jsonb(p)->>'created_at', to_jsonb(p)->>'creado_en'))::timestamptz AT TIME ZONE ?, 'YYYY-MM-DD HH24:MI') AS fecha, "
                + "CASE WHEN p.imagen_url IS NULL OR p.imagen_url = '' THEN 'No' ELSE 'Sí' END AS foto, "
                + "(SELECT COUNT(*) FROM public.comments c WHERE c.post_id = p.id) AS comentarios "
                + "FROM public.posts p LEFT JOIN public.profiles pr ON pr.user_id = p.user_id ";
        if (filtra) {
            sql += "WHERE p.contenido ILIKE ? OR pr.nombre_completo ILIKE ? OR pr.username ILIKE ? ";
            String x = patron(q);
            p.add(x); p.add(x); p.add(x);
        }
        return jdbc.queryForList(sql + "ORDER BY 4 DESC NULLS LAST LIMIT 100", p.toArray());
    }

    @Transactional
    public void eliminarPublicacion(String id, String admin) {
        UUID u = uuid(id);
        List<String> t = jdbc.queryForList("SELECT COALESCE(contenido, '') FROM public.posts WHERE id = ?", String.class, u);
        if (t.isEmpty()) throw new IllegalArgumentException("Publicación no encontrada");
        // Primero lo que cuelga de la publicación (por si la base no borra en cascada).
        jdbc.update("DELETE FROM public.comments WHERE post_id = ?", u);
        jdbc.update("DELETE FROM public.posts WHERE id = ?", u);
        auditoria.registrar(admin, "PUBLICACION_ELIMINADA", recorte(t.get(0)));
    }

    @Transactional(readOnly = true)
    public List<Map<String, Object>> comentariosComunidad(String q) {
        boolean filtra = q != null && !q.isBlank();
        List<Object> p = new ArrayList<>();
        p.add(zona);
        String sql = "SELECT c.id::text AS id, COALESCE(c.contenido, '') AS contenido, "
                + "COALESCE(pr.nombre_completo, pr.username, '(sin perfil)') AS autor, "
                + "to_char((COALESCE(to_jsonb(c)->>'created_at', to_jsonb(c)->>'creado_en'))::timestamptz AT TIME ZONE ?, 'YYYY-MM-DD HH24:MI') AS fecha, "
                + "CASE WHEN c.parent_comment_id IS NULL THEN 'Comentario' ELSE 'Respuesta' END AS tipo, "
                + "LEFT(COALESCE(po.contenido, ''), 60) AS publicacion "
                + "FROM public.comments c LEFT JOIN public.profiles pr ON pr.user_id = c.user_id "
                + "LEFT JOIN public.posts po ON po.id = c.post_id ";
        if (filtra) {
            sql += "WHERE c.contenido ILIKE ? OR pr.nombre_completo ILIKE ? OR pr.username ILIKE ? ";
            String x = patron(q);
            p.add(x); p.add(x); p.add(x);
        }
        return jdbc.queryForList(sql + "ORDER BY 4 DESC NULLS LAST LIMIT 100", p.toArray());
    }

    @Transactional
    public void eliminarComentarioComunidad(String id, String admin) {
        UUID u = uuid(id);
        List<String> t = jdbc.queryForList("SELECT COALESCE(contenido, '') FROM public.comments WHERE id = ?", String.class, u);
        if (t.isEmpty()) throw new IllegalArgumentException("Comentario no encontrado");
        // Se borra el comentario y todas sus respuestas (a cualquier nivel).
        jdbc.update("WITH RECURSIVE arbol AS (SELECT id FROM public.comments WHERE id = ? "
                + "UNION ALL SELECT c.id FROM public.comments c JOIN arbol a ON c.parent_comment_id = a.id) "
                + "DELETE FROM public.comments WHERE id IN (SELECT id FROM arbol)", u);
        auditoria.registrar(admin, "COMENTARIO_COMUNIDAD_ELIMINADO", recorte(t.get(0)));
    }

    // ------------------------------------------------------------------ Editar recetas

    @Transactional(readOnly = true)
    public Map<String, Object> detalleReceta(Long id) {
        List<Map<String, Object>> filas = jdbc.queryForList(
                "SELECT id, nombre, descripcion, minutos_preparacion AS \"minutosPreparacion\" FROM recetas WHERE id = ?", id);
        if (filas.isEmpty()) throw new IllegalArgumentException("Receta no encontrada");
        Map<String, Object> r = new LinkedHashMap<>(filas.get(0));
        r.put("etiquetas", jdbc.queryForList("SELECT etiqueta_id FROM recetas_etiquetas WHERE receta_id = ?", Long.class, id));
        r.put("ingredientes", jdbc.queryForList(
                "SELECT i.nombre, ir.cantidad, ir.unidad FROM ingredientes_receta ir JOIN ingredientes i ON i.id = ir.ingrediente_id "
                        + "WHERE ir.receta_id = ? ORDER BY i.nombre", id));
        r.put("pasos", jdbc.queryForList("SELECT orden, instruccion FROM pasos_receta WHERE receta_id = ? ORDER BY orden", id));
        r.put("imagenes", jdbc.queryForList("SELECT id, url FROM imagenes WHERE receta_id = ? ORDER BY id", id));
        return r;
    }

    @Transactional
    public void editarReceta(Long id, SolicitudCrearReceta s, String admin) {
        Integer existe = jdbc.queryForObject("SELECT COUNT(*) FROM recetas WHERE id = ?", Integer.class, id);
        if (existe == null || existe == 0) throw new IllegalArgumentException("Receta no encontrada");

        jdbc.update("UPDATE recetas SET nombre = ?, descripcion = ?, minutos_preparacion = ? WHERE id = ?",
                s.nombre().trim(), s.descripcion(), s.minutosPreparacion(), id);

        jdbc.update("DELETE FROM ingredientes_receta WHERE receta_id = ?", id);
        for (var linea : s.ingredientes()) {
            long ingredienteId = ingredienteId(linea.nombre().trim());
            jdbc.update("INSERT INTO ingredientes_receta (receta_id, ingrediente_id, cantidad, unidad) VALUES (?, ?, ?, ?) "
                    + "ON CONFLICT DO NOTHING", id, ingredienteId, linea.cantidad(), linea.unidad());
        }

        jdbc.update("DELETE FROM pasos_receta WHERE receta_id = ?", id);
        for (var paso : s.pasos()) {
            jdbc.update("INSERT INTO pasos_receta (receta_id, orden, instruccion) VALUES (?, ?, ?)", id, paso.orden(), paso.instruccion());
        }

        jdbc.update("DELETE FROM recetas_etiquetas WHERE receta_id = ?", id);
        if (s.etiquetas() != null) {
            for (Long etiquetaId : new LinkedHashSet<>(s.etiquetas())) {
                jdbc.update("INSERT INTO recetas_etiquetas (receta_id, etiqueta_id) VALUES (?, ?) ON CONFLICT DO NOTHING", id, etiquetaId);
            }
        }
        auditoria.registrar(admin, "RECETA_EDITADA", s.nombre() + " (#" + id + ")");
    }

    private long ingredienteId(String nombre) {
        List<Long> ids = jdbc.queryForList("SELECT id FROM ingredientes WHERE lower(nombre) = lower(?)", Long.class, nombre);
        if (!ids.isEmpty()) return ids.get(0);
        jdbc.update("INSERT INTO ingredientes (nombre) VALUES (?) ON CONFLICT DO NOTHING", nombre);
        return jdbc.queryForObject("SELECT id FROM ingredientes WHERE lower(nombre) = lower(?)", Long.class, nombre);
    }

    // ------------------------------------------------------------------ Alérgenos

    @Transactional(readOnly = true)
    public List<Map<String, Object>> alergias() {
        return jdbc.queryForList(
                "SELECT a.id, a.nombre, "
                        + "(SELECT COUNT(*) FROM usuarios_alergias ua WHERE ua.alergia_id = a.id) AS personas, "
                        + "(SELECT COUNT(*) FROM ingredientes_alergias ia WHERE ia.alergia_id = a.id) AS ingredientes "
                        + "FROM alergias a ORDER BY a.nombre");
    }

    @Transactional
    public void crearAlergia(String nombre, String admin) {
        String n = nombre == null ? "" : nombre.trim();
        if (n.isEmpty() || n.length() > 80) throw new IllegalArgumentException("Escribe un nombre de hasta 80 letras");
        Integer ya = jdbc.queryForObject("SELECT COUNT(*) FROM alergias WHERE lower(nombre) = lower(?)", Integer.class, n);
        if (ya != null && ya > 0) throw new IllegalArgumentException("Esa alergia ya existe");
        jdbc.update("INSERT INTO alergias (nombre) VALUES (?)", n);
        auditoria.registrar(admin, "ALERGIA_CREADA", n);
    }

    @Transactional
    public void eliminarAlergia(Long id, String admin) {
        List<String> n = jdbc.queryForList("SELECT nombre FROM alergias WHERE id = ?", String.class, id);
        if (n.isEmpty()) throw new IllegalArgumentException("Alergia no encontrada");
        jdbc.update("DELETE FROM ingredientes_alergias WHERE alergia_id = ?", id);
        jdbc.update("DELETE FROM usuarios_alergias WHERE alergia_id = ?", id);
        jdbc.update("DELETE FROM alergias WHERE id = ?", id);
        auditoria.registrar(admin, "ALERGIA_ELIMINADA", n.get(0));
    }

    /** Ingredientes con sus alérgenos. sinRevisar = solo los que aún nadie ha marcado. */
    @Transactional(readOnly = true)
    public List<Map<String, Object>> ingredientesConAlergenos(String q, boolean sinRevisar) {
        boolean filtra = q != null && !q.isBlank();
        List<Object> p = new ArrayList<>();
        StringBuilder sql = new StringBuilder(
                "SELECT i.id, i.nombre, (r.ingrediente_id IS NOT NULL) AS revisado, "
                        + "COALESCE((SELECT array_to_string(array_agg(ia.alergia_id ORDER BY ia.alergia_id), ',') "
                        + "FROM ingredientes_alergias ia WHERE ia.ingrediente_id = i.id), '') AS alergias "
                        + "FROM ingredientes i LEFT JOIN ingredientes_revisados r ON r.ingrediente_id = i.id WHERE 1=1 ");
        if (filtra) { sql.append("AND i.nombre ILIKE ? "); p.add(patron(q)); }
        if (sinRevisar) sql.append("AND r.ingrediente_id IS NULL ");
        sql.append("ORDER BY i.nombre LIMIT 150");
        return jdbc.queryForList(sql.toString(), p.toArray());
    }

    @Transactional
    public void guardarAlergenos(Long ingredienteId, List<Long> alergiaIds, String admin) {
        List<String> n = jdbc.queryForList("SELECT nombre FROM ingredientes WHERE id = ?", String.class, ingredienteId);
        if (n.isEmpty()) throw new IllegalArgumentException("Ingrediente no encontrado");
        jdbc.update("DELETE FROM ingredientes_alergias WHERE ingrediente_id = ?", ingredienteId);
        if (alergiaIds != null) {
            for (Long a : new LinkedHashSet<>(alergiaIds)) {
                jdbc.update("INSERT INTO ingredientes_alergias (ingrediente_id, alergia_id) "
                        + "SELECT ?, id FROM alergias WHERE id = ? ON CONFLICT DO NOTHING", ingredienteId, a);
            }
        }
        jdbc.update("INSERT INTO ingredientes_revisados (ingrediente_id) VALUES (?) ON CONFLICT DO NOTHING", ingredienteId);
        auditoria.registrar(admin, "ALERGENOS_ACTUALIZADOS", n.get(0));
    }
}