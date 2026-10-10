package com.cookly.controladores;

import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Notificaciones de cada usuario (campana de Inicio). Las crean disparadores de la base de datos
 * (receta nueva, reporte revisado); aquí solo se listan, se cuentan y se marcan como leídas.
 * Usa JdbcTemplate: es una tabla sencilla y no necesita entidad.
 */
@RestController
@RequestMapping("/api/v1/notificaciones")
public class ControladorNotificacion {
    private final JdbcTemplate jdbc;

    public ControladorNotificacion(JdbcTemplate jdbc) { this.jdbc = jdbc; }

    /** Las 50 más recientes del usuario que hizo la petición. */
    @GetMapping
    public List<Map<String, Object>> listar(Authentication autenticacion) {
        return jdbc.queryForList(
                "SELECT id, titulo, mensaje, tipo, receta_id AS \"recetaId\", leida, creado_en AS \"creadoEn\" "
                        + "FROM public.notificaciones WHERE usuario_id = ? ORDER BY creado_en DESC, id DESC LIMIT 50",
                usuarioId(autenticacion));
    }

    /** Cuántas no ha leído: de ahí sale el puntito rosado de la campana. */
    @GetMapping("/sin-leer")
    public Map<String, Object> sinLeer(Authentication autenticacion) {
        Integer n = jdbc.queryForObject(
                "SELECT count(*) FROM public.notificaciones WHERE usuario_id = ? AND NOT leida",
                Integer.class, usuarioId(autenticacion));
        Map<String, Object> r = new LinkedHashMap<>();
        r.put("cantidad", n == null ? 0 : n);
        return r;
    }

    @PutMapping("/leer-todas")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void leerTodas(Authentication autenticacion) {
        jdbc.update("UPDATE public.notificaciones SET leida = true WHERE usuario_id = ? AND NOT leida", usuarioId(autenticacion));
    }

    @PutMapping("/{id}/leer")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void leer(@PathVariable Long id, Authentication autenticacion) {
        jdbc.update("UPDATE public.notificaciones SET leida = true WHERE id = ? AND usuario_id = ?", id, usuarioId(autenticacion));
    }

    private Long usuarioId(Authentication autenticacion) {
        List<Long> ids = jdbc.queryForList("SELECT id FROM public.usuarios WHERE correo = ?", Long.class, autenticacion.getName());
        if (ids.isEmpty()) throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Usuario no encontrado");
        return ids.get(0);
    }
}
