package com.cookly.servicios;

import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * Reportes de Comunidad (posts y comentarios guardados en la tabla reportes_comunidad).
 * Usa JdbcTemplate porque los IDs son UUID y no encajan con la entidad Reporte (recetas).
 */
@Service
public class ServicioReporteComunidad {

    private final JdbcTemplate jdbc;

    public ServicioReporteComunidad(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    @Transactional(readOnly = true)
    public List<Map<String, Object>> pendientes() {
        List<Map<String, Object>> filas = jdbc.queryForList(
                "SELECT * FROM public.reportes_comunidad WHERE estado = 'PENDIENTE'");

        List<Map<String, Object>> salida = new ArrayList<>();
        for (Map<String, Object> fila : filas) {
            salida.add(armar(fila));
        }
        // Los más antiguos primero.
        salida.sort(Comparator.comparing(m -> String.valueOf(m.get("creadoEn"))));
        return salida;
    }

    @Transactional
    public Map<String, Object> resolver(String reporteId, String estado, boolean eliminarContenido) {
        if (!"REVISADO".equals(estado) && !"DESCARTADO".equals(estado)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Estado inválido");
        }

        UUID id;
        try {
            id = UUID.fromString(reporteId);
        } catch (IllegalArgumentException e) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Id de reporte inválido");
        }

        Map<String, Object> fila = primero("SELECT * FROM public.reportes_comunidad WHERE id = ?", id);
        if (fila.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Reporte no encontrado");
        }

        jdbc.update("UPDATE public.reportes_comunidad SET estado = ? WHERE id = ?", estado, id);

        if (eliminarContenido && "REVISADO".equals(estado)) {
            String tipo = texto(fila.get("tipo"));
            if ("POST".equals(tipo) && fila.get("post_id") != null) {
                jdbc.update("DELETE FROM public.posts WHERE id = ?", fila.get("post_id"));
            } else if ("COMENTARIO".equals(tipo) && fila.get("comentario_id") != null) {
                jdbc.update("DELETE FROM public.comments WHERE id = ?", fila.get("comentario_id"));
            }
        }

        Map<String, Object> respuesta = new LinkedHashMap<>();
        respuesta.put("id", reporteId);
        respuesta.put("estado", estado);
        respuesta.put("contenidoEliminado", eliminarContenido && "REVISADO".equals(estado));
        return respuesta;
    }

    // ---------- ayudas ----------

    private Map<String, Object> armar(Map<String, Object> fila) {
        Map<String, Object> m = new LinkedHashMap<>();
        String tipo = texto(fila.get("tipo"));

        m.put("id", texto(fila.get("id")));
        m.put("tipo", tipo);
        m.put("motivo", fila.get("motivo"));
        m.put("estado", fila.get("estado"));

        // La columna de fecha puede llamarse created_at o creado_en.
        Object fecha = fila.get("created_at") != null ? fila.get("created_at") : fila.get("creado_en");
        m.put("creadoEn", fecha == null ? null : fecha.toString());

        m.put("reportadoPor", nombreDePerfil(fila.get("reportado_por")));

        if ("POST".equals(tipo)) {
            Object postId = fila.get("post_id");
            m.put("postId", texto(postId));
            Map<String, Object> p = primero(
                    "SELECT p.contenido, p.imagen_url, COALESCE(pr.nombre_completo, pr.username) AS autor "
                            + "FROM public.posts p LEFT JOIN public.profiles pr ON pr.user_id = p.user_id "
                            + "WHERE p.id = ?", postId);
            m.put("contenido", p.get("contenido"));
            m.put("imagenUrl", p.get("imagen_url"));
            m.put("autor", p.get("autor"));
            m.put("contenidoExiste", !p.isEmpty());
        } else {
            Object comentarioId = fila.get("comentario_id");
            m.put("comentarioId", texto(comentarioId));
            Map<String, Object> c = primero(
                    "SELECT c.contenido, c.post_id, COALESCE(pr.nombre_completo, pr.username) AS autor "
                            + "FROM public.comments c LEFT JOIN public.profiles pr ON pr.user_id = c.user_id "
                            + "WHERE c.id = ?", comentarioId);
            m.put("contenido", c.get("contenido"));
            m.put("postId", texto(c.get("post_id")));
            m.put("autor", c.get("autor"));
            m.put("contenidoExiste", !c.isEmpty());
        }
        return m;
    }

    private Object nombreDePerfil(Object userId) {
        if (userId == null) return null;
        Map<String, Object> p = primero(
                "SELECT COALESCE(nombre_completo, username) AS nombre FROM public.profiles WHERE user_id = ?", userId);
        return p.get("nombre");
    }

    private Map<String, Object> primero(String sql, Object... args) {
        List<Map<String, Object>> filas = jdbc.queryForList(sql, args);
        return filas.isEmpty() ? new LinkedHashMap<>() : filas.get(0);
    }

    private String texto(Object o) {
        return o == null ? null : o.toString();
    }
}