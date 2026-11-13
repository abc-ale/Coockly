package com.cookly.controladores;

import com.cookly.dto.SolicitudCambioContrasenaPropia;
import com.cookly.dto.SolicitudCambioNombre;
import com.cookly.repositorios.RepositorioUsuario;
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
    private final RepositorioUsuario usuarios;
    public ControladorPerfil(ServicioAutenticacion servicio, RepositorioUsuario usuarios) {
        this.servicio = servicio;
        this.usuarios = usuarios;
    }

    @PutMapping("/contrasena")
    public ResponseEntity<Map<String, String>> cambiarContrasena(Authentication autenticacion,
                                                                   @Valid @RequestBody SolicitudCambioContrasenaPropia s) {
        // authentication.getName() trae el correo: es el "subject" que ServicioToken
        // guarda en el JWT y que FiltroJwt coloca como principal en cada request.
        servicio.cambiarMiContrasena(autenticacion.getName(), s.contrasenaActual(), s.contrasenaNueva());
        return ResponseEntity.ok(Map.of("mensaje", "Contraseña actualizada correctamente."));
    }

    /** La app lo usa para saber si pide "contraseña actual" (false = cuenta de Google sin contraseña propia). */
    @GetMapping("/contrasena/estado")
    public ResponseEntity<Map<String, Boolean>> estadoContrasena(Authentication autenticacion) {
        return ResponseEntity.ok(Map.of("tienePropia", servicio.tieneContrasenaPropia(autenticacion.getName())));
    }

    /** Cambia el nombre que se muestra de la persona que tiene la sesión iniciada. */
    @PutMapping("/nombre")
    public ResponseEntity<Map<String, String>> cambiarNombre(Authentication autenticacion,
                                                              @Valid @RequestBody SolicitudCambioNombre s) {
        var usuario = usuarios.findByCorreo(autenticacion.getName().toLowerCase().trim())
                .orElseThrow(() -> new IllegalArgumentException("Usuario no encontrado"));
        usuario.setNombre(s.nombre().trim());
        usuarios.save(usuario);
        return ResponseEntity.ok(Map.of("nombre", usuario.getNombre()));
    }
}