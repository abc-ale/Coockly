package com.cookly.servicios;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

/**
 * Mide cuánto tiempo usan la app las personas.
 *
 * La app envía un "latido" cada 30 s mientras está abierta. Si el último latido de esa persona fue hace
 * menos de 100 s, se extiende la misma sesión; si fue hace más, empieza una sesión nueva.
 * Duración de una sesión = último latido - inicio.
 */
@Service
public class ServicioUso {

    /** Si pasan más segundos que esto sin latidos, se considera que la sesión terminó. */
    private static final double HUECO_MAXIMO_SEGUNDOS = 100;
    /** Latidos más seguidos que esto se ignoran (evita llenar la base de datos si algo falla). */
    private static final double SEPARACION_MINIMA_SEGUNDOS = 10;

    private record SesionReciente(long id, double haceSegundos) { }

    private final JdbcTemplate jdbc;

    public ServicioUso(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    @Transactional
    public void registrarLatido(String correo, String plataforma) {
        List<Long> ids = jdbc.queryForList("SELECT id FROM usuarios WHERE correo = ?", Long.class, correo);
        if (ids.isEmpty()) {
            return;
        }
        long usuarioId = ids.get(0);

        List<SesionReciente> recientes = jdbc.query(
                "SELECT id, EXTRACT(EPOCH FROM (now() - ultimo_latido)) AS hace "
                        + "FROM sesiones_uso WHERE usuario_id = ? ORDER BY ultimo_latido DESC LIMIT 1",
                (rs, n) -> new SesionReciente(rs.getLong("id"), rs.getDouble("hace")),
                usuarioId);

        if (!recientes.isEmpty() && recientes.get(0).haceSegundos() <= HUECO_MAXIMO_SEGUNDOS) {
            SesionReciente s = recientes.get(0);
            if (s.haceSegundos() >= SEPARACION_MINIMA_SEGUNDOS) {
                jdbc.update("UPDATE sesiones_uso SET ultimo_latido = now() WHERE id = ?", s.id());
            }
            return;
        }

        jdbc.update("INSERT INTO sesiones_uso (usuario_id, plataforma) VALUES (?, ?)",
                usuarioId, limpiarPlataforma(plataforma));
    }

    private static String limpiarPlataforma(String plataforma) {
        if (plataforma == null) {
            return null;
        }
        String limpia = plataforma.trim().toLowerCase().replaceAll("[^a-z0-9_-]", "");
        if (limpia.isEmpty()) {
            return null;
        }
        return limpia.length() > 20 ? limpia.substring(0, 20) : limpia;
    }
}