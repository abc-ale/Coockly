package com.cookly.servicios;

import com.cookly.dto.UsuarioResumen;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.ZoneId;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/** Cifras y series para el dashboard del panel administrativo. Solo lectura. */
@Service
public class ServicioEstadisticas {

    private final JdbcTemplate jdbc;
    private final String zona;

    public ServicioEstadisticas(JdbcTemplate jdbc, @Value("${app.zona-horaria:America/Lima}") String zona) {
        this.jdbc = jdbc;
        // Falla al arrancar si la zona está mal escrita, en vez de fallar en cada consulta.
        this.zona = ZoneId.of(zona).getId();
    }

    @Transactional(readOnly = true)
    public Map<String, Object> resumen() {
        Map<String, Object> m = new LinkedHashMap<>();

        m.put("usuariosTotal", contar("SELECT COUNT(*) FROM usuarios"));
        m.put("usuariosActivos", contar("SELECT COUNT(*) FROM usuarios WHERE activo"));
        m.put("usuariosInactivos", contar("SELECT COUNT(*) FROM usuarios WHERE NOT activo"));
        m.put("administradores", contar("SELECT COUNT(*) FROM usuarios WHERE rol = 'ADMINISTRADOR'"));
        m.put("usuariosNuevos7d", contar("SELECT COUNT(*) FROM usuarios WHERE creado_en >= now() - interval '7 days'"));
        m.put("usuariosNuevos30d", contar("SELECT COUNT(*) FROM usuarios WHERE creado_en >= now() - interval '30 days'"));

        m.put("recetasTotal", contar("SELECT COUNT(*) FROM recetas"));
        m.put("recetasNuevas30d", contar("SELECT COUNT(*) FROM recetas WHERE creado_en >= now() - interval '30 days'"));
        m.put("comentariosTotal", contar("SELECT COUNT(*) FROM comentarios"));
        m.put("favoritosTotal", contar("SELECT COUNT(*) FROM favoritos"));
        m.put("resenasTotal", contar("SELECT COUNT(*) FROM resenas"));
        m.put("puntuacionPromedio", jdbc.queryForObject(
                "SELECT COALESCE(ROUND(AVG(puntuacion)::numeric, 2), 0) FROM resenas", Double.class));
        m.put("imagenesTotal", contar("SELECT COUNT(*) FROM imagenes"));
        m.put("reportesPendientes", contar("SELECT COUNT(*) FROM reportes WHERE estado = 'PENDIENTE'"));

        m.put("enLineaAhora", contar(
                "SELECT COUNT(DISTINCT usuario_id) FROM sesiones_uso WHERE ultimo_latido > now() - interval '100 seconds'"));
        m.put("activosHoy", jdbc.queryForObject(
                "SELECT COUNT(DISTINCT usuario_id) FROM sesiones_uso "
                        + "WHERE (inicio AT TIME ZONE ?)::date = (now() AT TIME ZONE ?)::date",
                Long.class, zona, zona));
        m.put("activos7d", contar(
                "SELECT COUNT(DISTINCT usuario_id) FROM sesiones_uso WHERE ultimo_latido >= now() - interval '7 days'"));
        m.put("sesionesTotal", contar("SELECT COUNT(*) FROM sesiones_uso"));
        m.put("minutosUsoTotal", minutos("SELECT COALESCE(SUM(EXTRACT(EPOCH FROM (ultimo_latido - inicio))), 0) / 60.0 FROM sesiones_uso"));
        m.put("minutosUso7d", minutos("SELECT COALESCE(SUM(EXTRACT(EPOCH FROM (ultimo_latido - inicio))), 0) / 60.0 "
                + "FROM sesiones_uso WHERE inicio >= now() - interval '7 days'"));
        m.put("minutosPorSesion", minutos("SELECT COALESCE(AVG(EXTRACT(EPOCH FROM (ultimo_latido - inicio))), 0) / 60.0 FROM sesiones_uso"));

        m.put("baseDatosBytes", contar("SELECT pg_database_size(current_database())"));
        m.put("zonaHoraria", zona);
        return m;
    }

    @Transactional(readOnly = true)
    public Map<String, Object> graficas(int dias) {
        int rango = Math.min(Math.max(dias, 7), 90);
        int atras = rango - 1;
        Map<String, Object> g = new LinkedHashMap<>();
        g.put("dias", rango);

        String serie = "FROM generate_series((now() AT TIME ZONE ?)::date - " + atras
                + ", (now() AT TIME ZONE ?)::date, interval '1 day') d ";

        g.put("usuariosPorDia", jdbc.queryForList(
                "SELECT to_char(d, 'YYYY-MM-DD') AS dia, COUNT(u.id) AS valor " + serie
                        + "LEFT JOIN usuarios u ON (u.creado_en AT TIME ZONE ?)::date = d::date "
                        + "GROUP BY d ORDER BY d",
                zona, zona, zona));

        g.put("recetasPorDia", jdbc.queryForList(
                "SELECT to_char(d, 'YYYY-MM-DD') AS dia, COUNT(r.id) AS valor " + serie
                        + "LEFT JOIN recetas r ON (r.creado_en AT TIME ZONE ?)::date = d::date "
                        + "GROUP BY d ORDER BY d",
                zona, zona, zona));

        g.put("usoPorDia", jdbc.queryForList(
                "SELECT to_char(d, 'YYYY-MM-DD') AS dia, "
                        + "COALESCE(ROUND(SUM(EXTRACT(EPOCH FROM (s.ultimo_latido - s.inicio))) / 60.0, 1), 0) AS minutos, "
                        + "COUNT(DISTINCT s.usuario_id) AS activos " + serie
                        + "LEFT JOIN sesiones_uso s ON (s.inicio AT TIME ZONE ?)::date = d::date "
                        + "GROUP BY d ORDER BY d",
                zona, zona, zona));

        g.put("horasPico", jdbc.queryForList(
                "SELECT h AS hora, COUNT(s.id) AS valor FROM generate_series(0, 23) h "
                        + "LEFT JOIN sesiones_uso s ON EXTRACT(HOUR FROM s.inicio AT TIME ZONE ?)::int = h "
                        + "AND s.inicio >= now() - interval '" + rango + " days' "
                        + "GROUP BY h ORDER BY h",
                zona));

        g.put("topRecetasVistas", jdbc.queryForList(
                "SELECT r.nombre AS nombre, COUNT(h.id) AS valor FROM recetas r "
                        + "JOIN historial_recetas h ON h.receta_id = r.id "
                        + "GROUP BY r.id, r.nombre ORDER BY valor DESC, r.nombre LIMIT 8"));

        g.put("topRecetasFavoritas", jdbc.queryForList(
                "SELECT r.nombre AS nombre, COUNT(f.usuario_id) AS valor FROM recetas r "
                        + "JOIN favoritos f ON f.receta_id = r.id "
                        + "GROUP BY r.id, r.nombre ORDER BY valor DESC, r.nombre LIMIT 8"));

        g.put("topUsuariosTiempo", jdbc.queryForList(
                "SELECT u.nombre AS nombre, ROUND(SUM(EXTRACT(EPOCH FROM (s.ultimo_latido - s.inicio))) / 60.0, 1) AS valor "
                        + "FROM usuarios u JOIN sesiones_uso s ON s.usuario_id = u.id "
                        + "GROUP BY u.id, u.nombre ORDER BY valor DESC, u.nombre LIMIT 8"));

        g.put("reportesPorEstado", jdbc.queryForList(
                "SELECT estado AS nombre, COUNT(*) AS valor FROM reportes GROUP BY estado ORDER BY estado"));
        return g;
    }

    /** Todas las personas registradas, con su tiempo de uso. Máximo 10 000 filas. */
    @Transactional(readOnly = true)
    public List<UsuarioResumen> listarUsuarios() {
        return jdbc.query(
                "SELECT u.id, u.nombre, u.correo, u.rol, u.activo, "
                        + "to_char(u.creado_en AT TIME ZONE ?, 'YYYY-MM-DD HH24:MI') AS creado_en, "
                        + "COALESCE(s.sesiones, 0) AS sesiones, COALESCE(s.segundos, 0) AS segundos, "
                        + "to_char(s.ultimo AT TIME ZONE ?, 'YYYY-MM-DD HH24:MI') AS ultimo_acceso, "
                        + "(SELECT COUNT(*) FROM recetas r WHERE r.creador_id = u.id) AS recetas, "
                        + "(SELECT COUNT(*) FROM favoritos f WHERE f.usuario_id = u.id) AS favoritos "
                        + "FROM usuarios u LEFT JOIN ("
                        + "  SELECT usuario_id, COUNT(*) AS sesiones, "
                        + "         SUM(EXTRACT(EPOCH FROM (ultimo_latido - inicio)))::bigint AS segundos, "
                        + "         MAX(ultimo_latido) AS ultimo "
                        + "  FROM sesiones_uso GROUP BY usuario_id) s ON s.usuario_id = u.id "
                        + "ORDER BY u.creado_en DESC, u.id DESC LIMIT 10000",
                (rs, n) -> new UsuarioResumen(
                        rs.getLong("id"),
                        rs.getString("nombre"),
                        rs.getString("correo"),
                        rs.getString("rol"),
                        rs.getBoolean("activo"),
                        rs.getString("creado_en"),
                        rs.getLong("sesiones"),
                        rs.getLong("segundos"),
                        rs.getString("ultimo_acceso"),
                        rs.getLong("recetas"),
                        rs.getLong("favoritos")),
                zona, zona);
    }

    private long contar(String sql) {
        Long n = jdbc.queryForObject(sql, Long.class);
        return n == null ? 0 : n;
    }

    private double minutos(String sql) {
        Double n = jdbc.queryForObject(sql, Double.class);
        return n == null ? 0 : Math.round(n * 10.0) / 10.0;
    }
}