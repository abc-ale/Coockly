package com.cookly.controladores;

import com.cookly.dto.RespuestaResena;
import com.cookly.dto.SolicitudResena;
import com.cookly.servicios.ServicioResena;
import jakarta.validation.Valid;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/recetas/{recetaId}/resenas")
public class ControladorResena {
    private final ServicioResena servicio;
    public ControladorResena(ServicioResena servicio) { this.servicio = servicio; }

    @GetMapping
    public Map<String, Object> listar(@PathVariable Long recetaId) {
        return servicio.listarConPromedio(recetaId);
    }

    /** Crea la reseña propia, o la reemplaza si ya existía una del mismo usuario en esta receta. */
    @PutMapping
    public RespuestaResena guardar(@PathVariable Long recetaId, @Valid @RequestBody SolicitudResena s, Authentication autenticacion) {
        return servicio.guardar(recetaId, autenticacion.getName(), s.puntuacion(), s.comentario());
    }
}