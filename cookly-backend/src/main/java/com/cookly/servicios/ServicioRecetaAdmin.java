package com.cookly.servicios;

import com.cookly.dto.SolicitudCrearReceta;
import com.cookly.modelos.Receta;
import com.cookly.servicios.ServicioCloudinary.ImagenSubida;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.ArrayList;
import java.util.List;
import java.util.Set;

/** Receta nueva del administrador: primero sube las fotos a Cloudinary y luego guarda todo en la base de datos. */
@Service
public class ServicioRecetaAdmin {
    private static final int MAX_FOTOS = 6;
    private static final long MAX_BYTES = 8L * 1024 * 1024;
    private static final Set<String> TIPOS = Set.of("image/jpeg", "image/png", "image/webp");

    private final ServicioReceta recetas;
    private final ServicioCloudinary cloudinary;

    public ServicioRecetaAdmin(ServicioReceta recetas, ServicioCloudinary cloudinary) {
        this.recetas = recetas;
        this.cloudinary = cloudinary;
    }

    public Receta crear(String correoAdmin, SolicitudCrearReceta datos, List<MultipartFile> archivos) {
        List<MultipartFile> fotos = archivos == null ? List.of() : archivos.stream().filter(f -> !f.isEmpty()).toList();
        if (fotos.size() > MAX_FOTOS) throw new IllegalArgumentException("Máximo " + MAX_FOTOS + " fotos por receta.");
        for (MultipartFile f : fotos) {
            if (f.getContentType() == null || !TIPOS.contains(f.getContentType())) {
                throw new IllegalArgumentException("Solo se aceptan fotos JPG, PNG o WebP.");
            }
            if (f.getSize() > MAX_BYTES) throw new IllegalArgumentException("Cada foto debe pesar menos de 8 MB.");
        }

        List<ImagenSubida> subidas = new ArrayList<>();
        try {
            for (MultipartFile f : fotos) {
                subidas.add(cloudinary.subir(f.getBytes(), f.getOriginalFilename(), f.getContentType()));
            }
            return recetas.crearConImagenes(correoAdmin, datos, subidas);
        } catch (RuntimeException e) {
            limpiar(subidas);
            throw e;
        } catch (IOException e) {
            limpiar(subidas);
            throw new IllegalArgumentException("No se pudo leer una de las fotos.");
        }
    }

    /** Si algo falla, no dejamos fotos huérfanas en Cloudinary. */
    private void limpiar(List<ImagenSubida> subidas) {
        for (ImagenSubida s : subidas) cloudinary.destruir(s.identificadorPublico());
    }
}