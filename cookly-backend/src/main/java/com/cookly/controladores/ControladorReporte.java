package com.cookly.controladores;

import com.cookly.dto.SolicitudReporte;
import com.cookly.modelos.Reporte;
import com.cookly.servicios.ServicioReporte;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/reportes")
public class ControladorReporte {
    private final ServicioReporte servicio;
    public ControladorReporte(ServicioReporte servicio) { this.servicio = servicio; }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public Reporte crear(@Valid @RequestBody SolicitudReporte s, Authentication autenticacion) {
        return servicio.crear(autenticacion.getName(), s.recetaId(), s.motivo());
    }
}