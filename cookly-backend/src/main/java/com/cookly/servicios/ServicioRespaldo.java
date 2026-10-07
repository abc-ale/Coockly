package com.cookly.servicios;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.dao.DataAccessException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.*;

/**
 * Respaldo y recuperación de los datos de la aplicación.
 *
 * Respaldo: un archivo JSON con todas las tablas del esquema "public".
 * Recuperación: vuelve a insertar las filas del archivo que FALTEN en la base de datos. Nunca borra ni
 * modifica filas existentes, así que sirve para recuperar datos eliminados por error. Todo ocurre en una
 * sola transacción: si algo falla, no se cambia nada.
 *
 * Los nombres de tabla salen siempre de la propia base de datos (nunca del archivo subido).
 */
@Service
public class ServicioRespaldo {

    private final JdbcTemplate jdbc;
    private final ObjectMapper mapper;

    public ServicioRespaldo(JdbcTemplate jdbc, ObjectMapper mapper) {
        this.jdbc = jdbc;
        this.mapper = mapper;
    }

    /** Tablas ordenadas para insertar: primero las que no dependen de otras (según claves foráneas). */
    public List<String> tablasEnOrden() {
        List<String> tablas = jdbc.queryForList(
                "SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename", String.class);

        Map<String, Set<String>> dependeDe = new LinkedHashMap<>();
        for (String t : tablas) {
            dependeDe.put(t, new HashSet<>());
        }
        jdbc.query(
                "SELECT cl.relname AS hija, cf.relname AS padre "
                        + "FROM pg_constraint c "
                        + "JOIN pg_class cl ON cl.oid = c.conrelid "
                        + "JOIN pg_class cf ON cf.oid = c.confrelid "
                        + "JOIN pg_namespace n ON n.oid = cl.relnamespace "
                        + "WHERE c.contype = 'f' AND n.nspname = 'public' AND cl.relname <> cf.relname",
                rs -> {
                    Set<String> padres = dependeDe.get(rs.getString("hija"));
                    if (padres != null && dependeDe.containsKey(rs.getString("padre"))) {
                        padres.add(rs.getString("padre"));
                    }
                });

        List<String> orden = new ArrayList<>();
        Set<String> colocadas = new HashSet<>();
        while (orden.size() < tablas.size()) {
            List<String> listas = new ArrayList<>();
            for (String t : tablas) {
                if (!colocadas.contains(t) && colocadas.containsAll(dependeDe.get(t))) {
                    listas.add(t);
                }
            }
            if (listas.isEmpty()) { // dependencia circular: se agrega lo que quede
                for (String t : tablas) {
                    if (!colocadas.contains(t)) {
                        listas.add(t);
                    }
                }
            }
            for (String t : listas) {
                orden.add(t);
                colocadas.add(t);
            }
        }
        return orden;
    }

    @Transactional(readOnly = true)
    public Map<String, Object> informacion() {
        List<Map<String, Object>> tablas = new ArrayList<>();
        long total = 0;
        for (String t : tablasEnOrden()) {
            Long filas = jdbc.queryForObject("SELECT COUNT(*) FROM " + identificador(t), Long.class);
            long n = filas == null ? 0 : filas;
            total += n;
            Map<String, Object> fila = new LinkedHashMap<>();
            fila.put("tabla", t);
            fila.put("filas", n);
            tablas.add(fila);
        }
        Map<String, Object> info = new LinkedHashMap<>();
        info.put("tablas", tablas);
        info.put("filasTotal", total);
        info.put("baseDatosBytes", jdbc.queryForObject("SELECT pg_database_size(current_database())", Long.class));
        info.put("version", jdbc.queryForObject("SHOW server_version", String.class));
        return info;
    }

    @Transactional(readOnly = true)
    public byte[] generarRespaldo() {
        StringBuilder json = new StringBuilder(64 * 1024);
        json.append("{\"app\":\"cookly\",\"version\":1,\"generadoEn\":\"")
            .append(Instant.now()).append("\",\"tablas\":{");
        boolean primera = true;
        for (String t : tablasEnOrden()) {
            String filas = jdbc.queryForObject(
                    "SELECT COALESCE(jsonb_agg(to_jsonb(t)), '[]'::jsonb)::text FROM " + identificador(t) + " t",
                    String.class);
            if (!primera) {
                json.append(',');
            }
            primera = false;
            json.append('"').append(t.replace("\\", "\\\\").replace("\"", "\\\"")).append("\":").append(filas);
        }
        json.append("}}");
        return json.toString().getBytes(StandardCharsets.UTF_8);
    }

    /**
     * Restaura las filas que faltan. Devuelve cuántas filas se recuperaron por tabla.
     * Si falla algo (por ejemplo, una fila depende de otra que no está en el archivo), revierte todo.
     */
    @Transactional
    public Map<String, Object> restaurar(byte[] contenido) {
        JsonNode raiz;
        try {
            raiz = mapper.readTree(contenido);
        } catch (Exception e) {
            throw new IllegalArgumentException("El archivo no es un respaldo válido (no se pudo leer el JSON).");
        }
        if (raiz == null || !"cookly".equals(raiz.path("app").asText()) || !raiz.path("tablas").isObject()) {
            throw new IllegalArgumentException("El archivo no es un respaldo de Cookly.");
        }
        JsonNode tablasNodo = raiz.get("tablas");

        List<String> orden = tablasEnOrden();
        Set<String> conocidas = new HashSet<>(orden);
        List<String> ignoradas = new ArrayList<>();
        tablasNodo.fieldNames().forEachRemaining(nombre -> {
            if (!conocidas.contains(nombre)) {
                ignoradas.add(nombre);
            }
        });

        Map<String, Object> recuperadas = new LinkedHashMap<>();
        long total = 0;
        try {
            for (String t : orden) {
                JsonNode filas = tablasNodo.get(t);
                if (filas == null || !filas.isArray() || filas.isEmpty()) {
                    continue;
                }
                String id = identificador(t);
                int n = jdbc.update(
                        "INSERT INTO " + id + " OVERRIDING SYSTEM VALUE "
                                + "SELECT * FROM jsonb_populate_recordset(NULL::" + id + ", ?::jsonb) "
                                + "ON CONFLICT DO NOTHING",
                        filas.toString());
                if (n > 0) {
                    recuperadas.put(t, n);
                    total += n;
                }
            }
            reiniciarSecuencias();
        } catch (DataAccessException e) {
            String causa = e.getMostSpecificCause().getMessage();
            if (causa != null && causa.contains("\n")) {
                causa = causa.substring(0, causa.indexOf('\n'));
            }
            if (causa != null && causa.length() > 300) {
                causa = causa.substring(0, 300);
            }
            throw new IllegalArgumentException("No se pudo restaurar, no se cambió nada. Motivo: " + causa);
        }

        Map<String, Object> resultado = new LinkedHashMap<>();
        resultado.put("filasRecuperadas", total);
        resultado.put("porTabla", recuperadas);
        resultado.put("tablasIgnoradas", ignoradas);
        return resultado;
    }

    /** Después de insertar ids explícitos, hay que mover los contadores para que los nuevos ids no choquen. */
    private void reiniciarSecuencias() {
        jdbc.query(
                "SELECT table_name, column_name FROM information_schema.columns "
                        + "WHERE table_schema = 'public' AND (is_identity = 'YES' OR column_default LIKE 'nextval%')",
                rs -> {
                    String tabla = identificador(rs.getString("table_name"));
                    String columnaCruda = rs.getString("column_name");
                    String columna = identificador(columnaCruda);
                    jdbc.queryForObject(
                            "SELECT setval(pg_get_serial_sequence(?, ?), "
                                    + "COALESCE((SELECT MAX(" + columna + ") FROM " + tabla + "), 1), "
                                    + "(SELECT MAX(" + columna + ") FROM " + tabla + ") IS NOT NULL)",
                            Long.class, tabla, columnaCruda);
                });
    }

    private static String identificador(String nombre) {
        return "\"" + nombre.replace("\"", "\"\"") + "\"";
    }
}