package com.cookly.controladores;

import com.cookly.servicios.ServicioFotosAdmin;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/administracion")
public class ControladorFotosAdmin {
    private final ServicioFotosAdmin servicio;

    public ControladorFotosAdmin(ServicioFotosAdmin servicio) { this.servicio = servicio; }

    @PostMapping(value = "/recetas/{id}/imagenes", consumes = "multipart/form-data")
    public Map<String, String> agregar(@PathVariable Long id, @RequestPart("imagenes") List<MultipartFile> imagenes, Authentication a) {
        servicio.agregar(id, imagenes, a.getName());
        return Map.of("mensaje", "Fotos agregadas");
    }

    @DeleteMapping("/imagenes/{id}")
    public Map<String, String> quitar(@PathVariable Long id, Authentication a) {
        servicio.quitar(id, a.getName());
        return Map.of("mensaje", "Foto eliminada");
    }
}