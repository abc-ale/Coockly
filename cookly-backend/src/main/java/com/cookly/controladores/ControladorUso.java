package com.cookly.controladores;

import com.cookly.dto.SolicitudLatido;
import com.cookly.servicios.ServicioUso;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

/** Lo llama la app móvil (cualquier persona con sesión iniciada). */
@RestController
@RequestMapping("/api/v1/uso")
public class ControladorUso {
    private final ServicioUso servicio;

    public ControladorUso(ServicioUso servicio) {
        this.servicio = servicio;
    }

    @PostMapping("/latido")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void latido(@RequestBody(required = false) SolicitudLatido solicitud, Authentication autenticacion) {
        servicio.registrarLatido(autenticacion.getName(), solicitud == null ? null : solicitud.plataforma());
    }
}