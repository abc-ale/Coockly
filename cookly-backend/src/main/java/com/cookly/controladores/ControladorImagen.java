package com.cookly.controladores;

import com.cookly.dto.RespuestaFirmaCloudinary;
import com.cookly.dto.SolicitudImagen;
import com.cookly.modelos.Imagen;
import com.cookly.servicios.ServicioCloudinary;
import com.cookly.servicios.ServicioImagen;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/api/v1/imagenes")
public class ControladorImagen {
    private final ServicioCloudinary cloudinary;
    private final ServicioImagen servicio;

    public ControladorImagen(ServicioCloudinary cloudinary, ServicioImagen servicio) {
        this.cloudinary = cloudinary;
        this.servicio = servicio;
    }

    @GetMapping("/firma")
    public RespuestaFirmaCloudinary firma() {
        return cloudinary.firmarSubida("cookly/recetas");
    }

    /** Se llama justo después de que la app termina de subir la imagen a Cloudinary con la firma de arriba. */
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public Imagen guardar(@Valid @RequestBody SolicitudImagen s) {
        return servicio.guardar(s.recetaId(), s.url(), s.identificadorPublico());
    }

    @GetMapping("/receta/{recetaId}")
    public List<Imagen> listar(@PathVariable Long recetaId) { return servicio.listar(recetaId); }

    /** Borra el registro Y la imagen física en Cloudinary (usa ServicioCloudinary.destruir). */
    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void eliminar(@PathVariable Long id) { servicio.eliminar(id); }
}
