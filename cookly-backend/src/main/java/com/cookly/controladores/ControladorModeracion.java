package com.cookly.controladores;

import com.cookly.dto.SolicitudRevisionReporte;
import com.cookly.modelos.Reporte;
import com.cookly.servicios.ServicioReporte;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import java.util.List;

/** Todo bajo /api/v1/moderacion/** ya está protegido con hasAnyRole("MODERADOR","ADMINISTRADOR")
 *  por ConfiguracionSeguridad — no hace falta repetir la verificación de rol aquí. */
@RestController
@RequestMapping("/api/v1/moderacion")
public class ControladorModeracion {
    private final ServicioReporte servicio;
    public ControladorModeracion(ServicioReporte servicio) { this.servicio = servicio; }

    @GetMapping("/reportes/pendientes")
    public List<Reporte> pendientes() { return servicio.pendientes(); }

    @PutMapping("/reportes/{id}")
    public Reporte resolver(@PathVariable Long id, @Valid @RequestBody SolicitudRevisionReporte s,
                             @RequestParam(defaultValue = "false") boolean eliminarReceta,
                             Authentication autenticacion) {
        return servicio.resolver(id, autenticacion.getName(), s.estado(), eliminarReceta);
    }

    @DeleteMapping("/comentarios/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void eliminarComentario(@PathVariable Long id) { servicio.eliminarComentario(id); }
}
