package com.cookly.controladores;

import com.cookly.dto.RespuestaFirmaCloudinary;
import com.cookly.servicios.ServicioCloudinary;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/imagenes")
public class ControladorImagen {
    private final ServicioCloudinary cloudinary;
    public ControladorImagen(ServicioCloudinary cloudinary) { this.cloudinary = cloudinary; }

    @GetMapping("/firma")
    public RespuestaFirmaCloudinary firma() {
        return cloudinary.firmarSubida("cookly/recetas");
    }
}