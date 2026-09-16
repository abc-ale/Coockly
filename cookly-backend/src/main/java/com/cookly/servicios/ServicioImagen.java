package com.cookly.servicios;

import com.cookly.modelos.Imagen;
import com.cookly.repositorios.RepositorioImagen;
import com.cookly.repositorios.RepositorioReceta;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.List;

@Service
public class ServicioImagen {
    private final RepositorioImagen imagenes;
    private final RepositorioReceta recetas;
    private final ServicioCloudinary cloudinary;

    public ServicioImagen(RepositorioImagen imagenes, RepositorioReceta recetas, ServicioCloudinary cloudinary) {
        this.imagenes = imagenes; this.recetas = recetas; this.cloudinary = cloudinary;
    }

    /** Se llama DESPUÉS de que la app subió la imagen a Cloudinary con la firma de /imagenes/firma. */
    @Transactional
    public Imagen guardar(Long recetaId, String url, String identificadorPublico) {
        var receta = recetas.findById(recetaId).orElseThrow(() -> new IllegalArgumentException("Receta no encontrada"));
        return imagenes.save(new Imagen(receta, url, identificadorPublico));
    }

    @Transactional(readOnly = true)
    public List<Imagen> listar(Long recetaId) { return imagenes.findByRecetaId(recetaId); }

    @Transactional
    public void eliminar(Long imagenId) {
        var imagen = imagenes.findById(imagenId).orElseThrow(() -> new IllegalArgumentException("Imagen no encontrada"));
        cloudinary.destruir(imagen.getIdentificadorPublico());
        imagenes.delete(imagen);
    }
}

