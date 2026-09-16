package com.cookly.controladores;

import com.cookly.dto.*;
import com.cookly.repositorios.RepositorioUsuario;
import com.cookly.servicios.ServicioAutenticacion;
import jakarta.validation.Valid;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;
import java.util.*;

@RestController
@RequestMapping("/api/v1/autenticacion")
public class ControladorAutenticacion {
    private final ServicioAutenticacion servicio;
    private final RepositorioUsuario usuarios;
    public ControladorAutenticacion(ServicioAutenticacion servicio, RepositorioUsuario usuarios) {
        this.servicio = servicio; this.usuarios = usuarios;
    }
    @PostMapping("/registro")
    @ResponseStatus(HttpStatus.CREATED)
    public RespuestaAcceso registro(@Valid @RequestBody SolicitudRegistro s) { return servicio.registrar(s); }
    @PostMapping("/login")
    public RespuestaAcceso login(@Valid @RequestBody SolicitudAcceso s) { return servicio.acceder(s); }

    /**
     * Respuesta deliberadamente genérica para no revelar si un correo está registrado.
     * Conecta aquí el proveedor de correo o Supabase Auth antes de producción.
     */
    @PostMapping("/solicitar-recuperacion")
    public Map<String, String> solicitar(@Valid @RequestBody SolicitudRecuperacion s) {
        usuarios.findByCorreo(s.correo().toLowerCase()).ifPresent(usuario -> {
            // TODO producción: crear token de un solo uso con expiración y enviarlo por correo.
        });
        return Map.of("mensaje", "Si el correo existe, recibirás instrucciones de recuperación.");
    }

    @PostMapping("/validar-recuperacion")
    public Map<String, String> validar(@RequestBody Map<String, String> cuerpo) {
        return Map.of("mensaje", "Código recibido. Implementa aquí la validación de un solo uso.");
    }

    @PostMapping("/cambiar-contrasena")
    public Map<String, String> cambiar(@Valid @RequestBody SolicitudCambioContrasena solicitud) {
        return Map.of("mensaje", "Endpoint preparado: valida el token antes de actualizar la contraseña.");
    }
    @PostMapping("/refrescar-token")
    public Map<String, String> refrescar() { return Map.of("mensaje", "Use el token vigente para renovar."); }
    @PostMapping("/cerrar-sesion")
    public ResponseEntity<Void> cerrar() { return ResponseEntity.noContent().build(); }
}
