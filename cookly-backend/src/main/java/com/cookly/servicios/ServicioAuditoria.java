package com.cookly.servicios;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;

/** Historial de lo que hacen los administradores. Si falla al guardar, nunca bloquea la acción original. */
@Service
public class ServicioAuditoria {

    private static final Logger log = LoggerFactory.getLogger(ServicioAuditoria.class);
    private final JdbcTemplate jdbc;
    private final String zona;

    public ServicioAuditoria(JdbcTemplate jdbc, @Value("${app.zona-horaria:America/Lima}") String zona) {
        this.jdbc = jdbc;
        this.zona = zona;
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void registrar(String admin, String accion, String detalle) {
        try {
            String d = detalle == null ? null : (detalle.length() > 300 ? detalle.substring(0, 300) : detalle);
            jdbc.update("INSERT INTO acciones_admin (admin_correo, accion, detalle) VALUES (?, ?, ?)", admin, accion, d);
        } catch (Exception e) {
            log.warn("No se pudo guardar el historial ({}): {}", accion, e.getMessage());
        }
    }

    @Transactional(readOnly = true)
    public List<Map<String, Object>> listar() {
        return jdbc.queryForList(
                "SELECT id, admin_correo AS admin, accion, detalle, "
                        + "to_char(creado_en AT TIME ZONE ?, 'YYYY-MM-DD HH24:MI') AS fecha "
                        + "FROM acciones_admin ORDER BY id DESC LIMIT 200", zona);
    }
}

