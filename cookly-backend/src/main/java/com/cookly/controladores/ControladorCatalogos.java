package com.cookly.controladores;

import com.cookly.dto.SolicitudIds;
import com.cookly.modelos.*;
import com.cookly.servicios.ServicioCatalogos;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import java.util.List;
import java.util.Map;

@RestController
public class ControladorCatalogos {
    private final ServicioCatalogos servicio;
    public ControladorCatalogos(ServicioCatalogos servicio) { this.servicio = servicio; }

    @GetMapping("/api/v1/catalogos")
    public Map<String, Object> catalogos() {
        return Map.of("etiquetas", servicio.etiquetas(), "restricciones", servicio.restricciones(), "alergias", servicio.alergias());
    }

    @GetMapping("/api/v1/perfil/restricciones")
    public List<UsuarioRestriccion> misRestricciones(Authentication autenticacion) { return servicio.misRestricciones(autenticacion.getName()); }

    @PutMapping("/api/v1/perfil/restricciones")
    public void actualizarMisRestricciones(@RequestBody SolicitudIds s, Authentication autenticacion) {
        servicio.actualizarMisRestricciones(autenticacion.getName(), s.ids());
    }

    @GetMapping("/api/v1/perfil/alergias")
    public List<UsuarioAlergia> misAlergias(Authentication autenticacion) { return servicio.misAlergias(autenticacion.getName()); }

    @PutMapping("/api/v1/perfil/alergias")
    public void actualizarMisAlergias(@RequestBody SolicitudIds s, Authentication autenticacion) {
        servicio.actualizarMisAlergias(autenticacion.getName(), s.ids());
    }
}
