package com.cookly.controladores;

import com.cookly.dto.SolicitudCrearReceta;
import com.cookly.modelos.Receta;
import com.cookly.servicios.ServicioAuditoria;
import com.cookly.servicios.ServicioContenidoAdmin;
import com.cookly.servicios.ServicioRecetaAdmin;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.Map;

/** Exige rol ADMINISTRADOR por estar bajo /api/v1/administracion/** (ver ConfiguracionSeguridad). */
@RestController
@RequestMapping("/api/v1/administracion")
public class ControladorContenidoAdmin {

    private final ServicioContenidoAdmin contenido;
    private final ServicioAuditoria auditoria;
    private final ServicioRecetaAdmin recetaAdmin;

    public ControladorContenidoAdmin(ServicioContenidoAdmin contenido, ServicioAuditoria auditoria, ServicioRecetaAdmin recetaAdmin) {
        this.contenido = contenido;
        this.auditoria = auditoria;
        this.recetaAdmin = recetaAdmin;
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

    @GetMapping("/recetas")
    public List<Map<String, Object>> recetas(@RequestParam(required = false) String q) {
        return contenido.recetas(q);
    }

    /** Receta nueva con fotos: "datos" es el JSON de la receta e "imagenes" son las fotos (la primera es la portada). */
    @PostMapping(value = "/recetas", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @ResponseStatus(HttpStatus.CREATED)
    public Map<String, Object> crearReceta(@RequestPart("datos") @Valid SolicitudCrearReceta datos,
                                           @RequestPart(value = "imagenes", required = false) List<MultipartFile> imagenes,
                                           Authentication a) {
        Receta r = recetaAdmin.crear(a.getName(), datos, imagenes);
        auditoria.registrar(a.getName(), "RECETA_CREADA", r.getNombre() + " (#" + r.getId() + ")");
        return Map.of("id", r.getId(), "nombre", r.getNombre());
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