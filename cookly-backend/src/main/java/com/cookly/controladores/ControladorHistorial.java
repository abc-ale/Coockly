package com.cookly.controladores;

import com.cookly.modelos.HistorialReceta;
import com.cookly.servicios.ServicioHistorial;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/api/v1/historial")
public class ControladorHistorial {
    private final ServicioHistorial servicio;
    public ControladorHistorial(ServicioHistorial servicio) { this.servicio = servicio; }

    @GetMapping
    public List<HistorialReceta> listar(Authentication autenticacion) { return servicio.ultimasVistas(autenticacion.getName()); }

    @PostMapping("/{recetaId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void registrar(@PathVariable Long recetaId, Authentication autenticacion) {
        servicio.registrar(autenticacion.getName(), recetaId);
    }
}