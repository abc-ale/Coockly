package com.cookly.controladores;

import com.cookly.dto.SolicitudComentario;
import com.cookly.modelos.Comentario;
import com.cookly.servicios.ServicioComentario;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/api/v1/recetas/{recetaId}/comentarios")
public class ControladorComentario {
    private final ServicioComentario servicio;
    public ControladorComentario(ServicioComentario servicio) { this.servicio = servicio; }

    @GetMapping
    public List<Comentario> listar(@PathVariable Long recetaId) { return servicio.listar(recetaId); }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public Comentario crear(@PathVariable Long recetaId, @Valid @RequestBody SolicitudComentario s, Authentication autenticacion) {
        return servicio.crear(recetaId, autenticacion.getName(), s.contenido());
    }

    @DeleteMapping("/{comentarioId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void eliminar(@PathVariable Long recetaId, @PathVariable Long comentarioId, Authentication autenticacion) {
        boolean esModeradorOAdmin = autenticacion.getAuthorities().stream()
                .anyMatch(a -> a.getAuthority().equals("ROLE_MODERADOR") || a.getAuthority().equals("ROLE_ADMINISTRADOR"));
        servicio.eliminar(comentarioId, autenticacion.getName(), esModeradorOAdmin);
    }
}
