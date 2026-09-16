package com.cookly.controladores;

import com.cookly.dto.SolicitudCambioContrasenaPropia;
import com.cookly.servicios.ServicioAutenticacion;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/perfil")
public class ControladorPerfil {
    private final ServicioAutenticacion servicio;
    public ControladorPerfil(ServicioAutenticacion servicio) { this.servicio = servicio; }

    @PutMapping("/contrasena")
    public ResponseEntity<Map<String, String>> cambiarContrasena(Authentication autenticacion,
                                                                   @Valid @RequestBody SolicitudCambioContrasenaPropia s) {
        // authentication.getName() trae el correo: es el "subject" que ServicioToken
        // guarda en el JWT y que FiltroJwt coloca como principal en cada request.
        servicio.cambiarMiContrasena(autenticacion.getName(), s.contrasenaActual(), s.contrasenaNueva());
        return ResponseEntity.ok(Map.of("mensaje", "Contraseña actualizada correctamente."));
    }
}

