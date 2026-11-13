package com.cookly.controladores;

import com.cookly.servicios.ServicioAuditoria;
import com.cookly.servicios.ServicioReporteComunidad;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.Map;

/**
 * Reportes de posts y comentarios de Comunidad. SOLO administradores.
 * Cuelga de /api/v1/administracion/**, que ya exige rol ADMINISTRADOR en ConfiguracionSeguridad.
 */
@RestController
@RequestMapping("/api/v1/administracion/reportes-comunidad")
public class ControladorReporteComunidad {

    private final ServicioReporteComunidad servicio;
    private final ServicioAuditoria auditoria;

    public ControladorReporteComunidad(ServicioReporteComunidad servicio, ServicioAuditoria auditoria) {
        this.servicio = servicio;
        this.auditoria = auditoria;
    }

    public record SolicitudResolver(String estado, Boolean eliminarContenido) { }

    @GetMapping
    public List<Map<String, Object>> pendientes(Authentication autenticacion) {
        exigirAdmin(autenticacion);
        return servicio.pendientes();
    }

    @PutMapping("/{id}")
    public Map<String, Object> resolver(@PathVariable String id,
                                        @RequestBody SolicitudResolver cuerpo,
                                        Authentication autenticacion) {
        exigirAdmin(autenticacion);
        boolean eliminar = Boolean.TRUE.equals(cuerpo.eliminarContenido());
        Map<String, Object> resultado = servicio.resolver(id, cuerpo.estado(), eliminar);
        auditoria.registrar(autenticacion.getName(), "REPORTE_COMUNIDAD_" + cuerpo.estado(),
                "Reporte de comunidad " + id + (eliminar ? " (contenido eliminado)" : ""));
        return resultado;
    }

    /** Doble seguro: aunque la configuración de seguridad cambie, aquí se vuelve a comprobar. */
    private void exigirAdmin(Authentication autenticacion) {
        boolean esAdmin = autenticacion != null && autenticacion.getAuthorities().stream()
                .anyMatch(a -> a.getAuthority().toUpperCase().contains("ADMIN"));
        if (!esAdmin) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Solo administradores");
        }
    }
}