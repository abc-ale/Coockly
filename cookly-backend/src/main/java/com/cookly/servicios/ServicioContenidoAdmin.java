package com.cookly.servicios;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

/** Comentarios y recetas vistos y moderados directamente por el administrador. */
@Service
public class ServicioContenidoAdmin {

    private static final List<String> TABLAS_DE_RECETA = List.of(
            "comentarios", "resenas", "favoritos", "historial_recetas", "reportes", "imagenes",
            "ingredientes_receta", "pasos_receta", "recetas_etiquetas", "elementos_menu_semanal");

    private final JdbcTemplate jdbc;
    private final ServicioAuditoria auditoria;
    private final String zona;

    public ServicioContenidoAdmin(JdbcTemplate jdbc, ServicioAuditoria auditoria,
                                  @Value("${app.zona-horaria:America/Lima}") String zona) {
        this.jdbc = jdbc;
        this.auditoria = auditoria;
        this.zona = zona;
    }

    private static String patron(String q) {
        return "%" + q.trim().replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_") + "%";
    }

    @Transactional(readOnly = true)
    public List<Map<String, Object>> comentarios(String q) {
        boolean filtra = q != null && !q.isBlank();
        List<Object> p = new ArrayList<>();
        p.add(zona);
        String sql = "SELECT c.id, c.contenido, to_char(c.creado_en AT TIME ZONE ?, 'YYYY-MM-DD HH24:MI') AS fecha, "
                + "COALESCE(u.nombre, '(cuenta eliminada)') AS autor, r.nombre AS \"recetaNombre\" "
                + "FROM comentarios c JOIN recetas r ON r.id = c.receta_id LEFT JOIN usuarios u ON u.id = c.usuario_id ";
        if (filtra) {
            sql += "WHERE c.contenido ILIKE ? OR u.nombre ILIKE ? OR u.correo ILIKE ? ";
            String x = patron(q);
            p.add(x); p.add(x); p.add(x);
        }
        return jdbc.queryForList(sql + "ORDER BY c.id DESC LIMIT 100", p.toArray());
    }

    @Transactional
    public void eliminarComentario(Long id, String admin) {
        List<String> t = jdbc.queryForList("SELECT contenido FROM comentarios WHERE id = ?", String.class, id);
        if (t.isEmpty()) throw new IllegalArgumentException("Comentario no encontrado");
        jdbc.update("DELETE FROM comentarios WHERE id = ?", id);
        String texto = t.get(0) == null ? "" : t.get(0);
        auditoria.registrar(admin, "COMENTARIO_ELIMINADO", "#" + id + ": " + (texto.length() > 120 ? texto.substring(0, 120) : texto));
    }

    @Transactional(readOnly = true)
    public List<Map<String, Object>> resenas(String q) {
        boolean filtra = q != null && !q.isBlank();
        List<Object> p = new ArrayList<>();
        p.add(zona);
        String sql = "SELECT x.id, x.puntuacion AS estrellas, COALESCE(x.comentario, '') AS contenido, "
                + "to_char(x.creado_en AT TIME ZONE ?, 'YYYY-MM-DD HH24:MI') AS fecha, "
                + "COALESCE(u.nombre, '(cuenta eliminada)') AS autor, r.nombre AS \"recetaNombre\" "
                + "FROM resenas x JOIN recetas r ON r.id = x.receta_id LEFT JOIN usuarios u ON u.id = x.usuario_id ";
        if (filtra) {
            sql += "WHERE x.comentario ILIKE ? OR u.nombre ILIKE ? OR u.correo ILIKE ? OR r.nombre ILIKE ? ";
            String t = patron(q);
            p.add(t); p.add(t); p.add(t); p.add(t);
        }
        return jdbc.queryForList(sql + "ORDER BY x.id DESC LIMIT 100", p.toArray());
    }

    @Transactional
    public void eliminarResena(Long id, String admin) {
        List<String> t = jdbc.queryForList("SELECT COALESCE(comentario, '') FROM resenas WHERE id = ?", String.class, id);
        if (t.isEmpty()) throw new IllegalArgumentException("Reseña no encontrada");
        jdbc.update("DELETE FROM resenas WHERE id = ?", id);
        String texto = t.get(0);
        auditoria.registrar(admin, "RESENA_ELIMINADA", "#" + id + ": " + (texto.length() > 120 ? texto.substring(0, 120) : texto));
    }

    @Transactional(readOnly = true)
    public List<Map<String, Object>> recetas(String q) {
        boolean filtra = q != null && !q.isBlank();
        List<Object> p = new ArrayList<>();
        p.add(zona);
        String sql = "SELECT r.id, r.nombre, to_char(r.creado_en AT TIME ZONE ?, 'YYYY-MM-DD HH24:MI') AS fecha, "
                + "u.nombre AS autor, "
                + "(SELECT COUNT(*) FROM comentarios c WHERE c.receta_id = r.id) AS comentarios, "
                + "(SELECT COUNT(*) FROM favoritos f WHERE f.receta_id = r.id) AS favoritos, "
                + "(SELECT i.url FROM imagenes i WHERE i.receta_id = r.id ORDER BY i.id LIMIT 1) AS imagenUrl "
                + "FROM recetas r JOIN usuarios u ON u.id = r.creador_id ";
        if (filtra) {
            sql += "WHERE r.nombre ILIKE ? OR u.nombre ILIKE ? OR u.correo ILIKE ? ";
            String x = patron(q);
            p.add(x); p.add(x); p.add(x);
        }
        return jdbc.queryForList(sql + "ORDER BY r.id DESC LIMIT 100", p.toArray());
    }

    @Transactional
    public void eliminarReceta(Long id, String admin) {
        List<String> n = jdbc.queryForList("SELECT nombre FROM recetas WHERE id = ?", String.class, id);
        if (n.isEmpty()) throw new IllegalArgumentException("Receta no encontrada");
        for (String tabla : TABLAS_DE_RECETA) {
            jdbc.update("DELETE FROM " + tabla + " WHERE receta_id = ?", id);
        }
        jdbc.update("DELETE FROM recetas WHERE id = ?", id);
        auditoria.registrar(admin, "RECETA_ELIMINADA", n.get(0) + " (#" + id + ")");
    }
}