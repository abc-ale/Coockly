package com.cookly.controladores;

import com.cookly.dto.*;
import com.cookly.repositorios.RepositorioUsuario;
import com.cookly.servicios.ServicioAutenticacion;
import com.cookly.servicios.ServicioSupabase;
import jakarta.validation.Valid;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;
import java.util.*;

@RestController
@RequestMapping("/api/v1/autenticacion")
public class ControladorAutenticacion {
    private final ServicioAutenticacion servicio;
    private final ServicioSupabase servicioSupabase;
    private final RepositorioUsuario usuarios;

    public ControladorAutenticacion(ServicioAutenticacion servicio, ServicioSupabase servicioSupabase, RepositorioUsuario usuarios) {
        this.servicio = servicio;
        this.servicioSupabase = servicioSupabase;
        this.usuarios = usuarios;
    }

    @PostMapping("/registro")
    @ResponseStatus(HttpStatus.CREATED)
    public RespuestaAcceso registro(@Valid @RequestBody SolicitudRegistro s) { return servicio.registrar(s); }

    @PostMapping("/login")
    public RespuestaAcceso login(@Valid @RequestBody SolicitudAcceso s) { return servicio.acceder(s); }

    /**
     * El correo de recuperación lo envía Supabase (supabase.auth.resetPasswordForEmail
     * desde el frontend). Este endpoint solo confirma que el usuario existe, sin revelarlo.
     */
    @PostMapping("/solicitar-recuperacion")
    public Map<String, String> solicitar(@Valid @RequestBody SolicitudRecuperacion s) {
        usuarios.findByCorreo(s.correo().toLowerCase()).ifPresent(usuario -> {
        });
        return Map.of("mensaje", "Si el correo existe, recibirás instrucciones de recuperación.");
    }

    /**
     * El usuario ya confirmó su identidad al abrir el enlace del correo (Supabase valida eso).
     * Aquí solo verificamos el access_token de Supabase y actualizamos la contraseña en nuestra tabla.
     */
    @PostMapping("/restablecer-por-supabase")
    public Map<String, String> restablecerPorSupabase(
            @RequestHeader("Authorization") String authorization,
            @Valid @RequestBody SolicitudRestablecerContrasena cuerpo) {
        String token = authorization.replace("Bearer ", "");
        String correo = servicioSupabase.obtenerCorreoDesdeToken(token);
        servicio.restablecerContrasena(correo, cuerpo.nuevaContrasena());
        return Map.of("mensaje", "Contraseña actualizada");
    }

    /**
     * Login con Google/Facebook: el frontend ya autenticó al usuario contra Supabase
     * (supabase.auth.signInWithOAuth) y nos manda su access_token. Verificamos ese
     * token contra Supabase, y creamos o recuperamos el usuario en nuestra tabla.
     */
    @PostMapping("/acceso-social")
    public RespuestaAcceso accesoSocial(@RequestHeader("Authorization") String authorization) {
        String token = authorization.replace("Bearer ", "");
        var datos = servicioSupabase.obtenerCorreoYNombre(token);
        return servicio.accederOCrearPorSocial(datos.correo(), datos.nombre());
    }

    @PostMapping("/cerrar-sesion")
    public ResponseEntity<Void> cerrar() { return ResponseEntity.noContent().build(); }
}