package com.cookly.controladores;

import com.cookly.dto.SolicitudCambioRol;
import com.cookly.servicios.ServicioAdministracion;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.*;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/administracion/usuarios")
public class ControladorAdministracion {
    private final ServicioAdministracion servicio;
    public ControladorAdministracion(ServicioAdministracion servicio) { this.servicio = servicio; }

    @PutMapping("/{id}/rol")
    public Map<String, String> cambiarRol(@PathVariable Long id, @Valid @RequestBody SolicitudCambioRol s) {
        var u = servicio.cambiarRol(id, s.rol());
        return Map.of("mensaje", "Rol actualizado", "correo", u.getCorreo(), "rol", u.getRol().name());
    }

    @PutMapping("/{id}/activo")
    public Map<String, String> cambiarActivo(@PathVariable Long id, @RequestParam boolean valor) {
        var u = servicio.cambiarActivo(id, valor);
        return Map.of("mensaje", "Estado actualizado", "correo", u.getCorreo(), "activo", String.valueOf(u.isActivo()));
    }
}
