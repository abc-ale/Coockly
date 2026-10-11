package com.cookly.controladores;

import com.cookly.dto.SolicitudCrearReceta;
import com.cookly.servicios.ServicioPanelExtra;
import jakarta.validation.Valid;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/** Exige rol ADMINISTRADOR por estar bajo /api/v1/administracion/** (ver ConfiguracionSeguridad). */
@RestController
@RequestMapping("/api/v1/administracion")
public class ControladorPanelExtra {

    private final ServicioPanelExtra servicio;

    public ControladorPanelExtra(ServicioPanelExtra servicio) {
        this.servicio = servicio;
    }

    // ---- Comunidad
    @GetMapping("/comunidad/publicaciones")
    public List<Map<String, Object>> publicaciones(@RequestParam(required = false) String q) {
        return servicio.publicaciones(q);
    }

    @DeleteMapping("/comunidad/publicaciones/{id}")
    public Map<String, String> eliminarPublicacion(@PathVariable String id, Authentication a) {
        servicio.eliminarPublicacion(id, a.getName());
        return Map.of("mensaje", "Publicación eliminada");
    }

    @GetMapping("/comunidad/comentarios")
    public List<Map<String, Object>> comentariosComunidad(@RequestParam(required = false) String q) {
        return servicio.comentariosComunidad(q);
    }

    @DeleteMapping("/comunidad/comentarios/{id}")
    public Map<String, String> eliminarComentarioComunidad(@PathVariable String id, Authentication a) {
        servicio.eliminarComentarioComunidad(id, a.getName());
        return Map.of("mensaje", "Comentario eliminado");
    }

    // ---- Editar recetas
    @GetMapping("/recetas/{id}/detalle")
    public Map<String, Object> detalleReceta(@PathVariable Long id) {
        return servicio.detalleReceta(id);
    }

    @PutMapping("/recetas/{id}")
    public Map<String, String> editarReceta(@PathVariable Long id, @Valid @RequestBody SolicitudCrearReceta s, Authentication a) {
        servicio.editarReceta(id, s, a.getName());
        return Map.of("mensaje", "Receta actualizada");
    }

    // ---- Alergias y alérgenos
    @GetMapping("/alergias")
    public List<Map<String, Object>> alergias() {
        return servicio.alergias();
    }

    @PostMapping("/alergias")
    public Map<String, String> crearAlergia(@RequestBody Map<String, String> cuerpo, Authentication a) {
        servicio.crearAlergia(cuerpo.get("nombre"), a.getName());
        return Map.of("mensaje", "Alergia creada");
    }

    @DeleteMapping("/alergias/{id}")
    public Map<String, String> eliminarAlergia(@PathVariable Long id, Authentication a) {
        servicio.eliminarAlergia(id, a.getName());
        return Map.of("mensaje", "Alergia eliminada");
    }

    @GetMapping("/alergias/ingredientes")
    public List<Map<String, Object>> ingredientes(@RequestParam(required = false) String q,
                                                  @RequestParam(defaultValue = "false") boolean sinRevisar) {
        return servicio.ingredientesConAlergenos(q, sinRevisar);
    }

    @PutMapping("/alergias/ingredientes/{id}")
    public Map<String, String> guardarAlergenos(@PathVariable Long id, @RequestBody Map<String, List<Long>> cuerpo, Authentication a) {
        servicio.guardarAlergenos(id, cuerpo.get("alergiaIds"), a.getName());
        return Map.of("mensaje", "Guardado");
    }
}