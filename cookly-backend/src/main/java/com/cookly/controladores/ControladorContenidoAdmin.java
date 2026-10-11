package com.cookly.controladores;

import com.cookly.servicios.ServicioAuditoria;
import com.cookly.servicios.ServicioContenidoAdmin;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/** Exige rol ADMINISTRADOR por estar bajo /api/v1/administracion/** (ver ConfiguracionSeguridad). */
@RestController
@RequestMapping("/api/v1/administracion")
public class ControladorContenidoAdmin {

    private final ServicioContenidoAdmin contenido;
    private final ServicioAuditoria auditoria;

    public ControladorContenidoAdmin(ServicioContenidoAdmin contenido, ServicioAuditoria auditoria) {
        this.contenido = contenido;
        this.auditoria = auditoria;
    }

    @GetMapping("/comentarios")
    public List<Map<String, Object>> comentarios(@RequestParam(required = false) String q) {
        return contenido.comentarios(q);
    }

    @DeleteMapping("/comentarios/{id}")
    public Map<String, String> eliminarComentario(@PathVariable Long id, Authentication a) {
        contenido.eliminarComentario(id, a.getName());
        return Map.of("mensaje", "Comentario eliminado");
    }

    @GetMapping("/resenas")
    public List<Map<String, Object>> resenas(@RequestParam(required = false) String q) {
        return contenido.resenas(q);
    }

    @DeleteMapping("/resenas/{id}")
    public Map<String, String> eliminarResena(@PathVariable Long id, Authentication a) {
        contenido.eliminarResena(id, a.getName());
        return Map.of("mensaje", "Reseña eliminada");
    }

    @GetMapping("/recetas")
    public List<Map<String, Object>> recetas(@RequestParam(required = false) String q) {
        return contenido.recetas(q);
    }

    @DeleteMapping("/recetas/{id}")
    public Map<String, String> eliminarReceta(@PathVariable Long id, Authentication a) {
        contenido.eliminarReceta(id, a.getName());
        return Map.of("mensaje", "Receta eliminada");
    }

    @GetMapping("/auditoria")
    public List<Map<String, Object>> auditoria() {
        return auditoria.listar();
    }
}