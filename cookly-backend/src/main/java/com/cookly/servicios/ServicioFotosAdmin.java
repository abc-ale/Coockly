package com.cookly.servicios;

import com.cookly.servicios.ServicioCloudinary.ImagenSubida;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.ArrayList;
import java.util.List;
import java.util.Set;

/** Agrega o quita fotos de una receta que ya existe (la edición del panel). */
@Service
public class ServicioFotosAdmin {
    private static final int MAX_FOTOS = 6;
    private static final long MAX_BYTES = 8L * 1024 * 1024;
    private static final Set<String> TIPOS = Set.of("image/jpeg", "image/png", "image/webp");

    private final JdbcTemplate jdbc;
    private final ServicioCloudinary cloudinary;
    private final ServicioAuditoria auditoria;

    public ServicioFotosAdmin(JdbcTemplate jdbc, ServicioCloudinary cloudinary, ServicioAuditoria auditoria) {
        this.jdbc = jdbc;
        this.cloudinary = cloudinary;
        this.auditoria = auditoria;
    }

    @Transactional
    public void agregar(Long recetaId, List<MultipartFile> archivos, String admin) {
        List<String> nombres = jdbc.queryForList("SELECT nombre FROM recetas WHERE id = ?", String.class, recetaId);
        if (nombres.isEmpty()) throw new IllegalArgumentException("Receta no encontrada");
        List<MultipartFile> fotos = archivos == null ? List.of() : archivos.stream().filter(f -> !f.isEmpty()).toList();
        if (fotos.isEmpty()) throw new IllegalArgumentException("Elige al menos una foto.");
        Integer actuales = jdbc.queryForObject("SELECT COUNT(*) FROM imagenes WHERE receta_id = ?", Integer.class, recetaId);
        if ((actuales == null ? 0 : actuales) + fotos.size() > MAX_FOTOS) {
            throw new IllegalArgumentException("Máximo " + MAX_FOTOS + " fotos por receta.");
        }
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
            for (ImagenSubida s : subidas) {
                jdbc.update("INSERT INTO imagenes (receta_id, url, identificador_publico) VALUES (?, ?, ?)",
                        recetaId, s.url(), s.identificadorPublico());
            }
        } catch (RuntimeException e) {
            for (ImagenSubida s : subidas) cloudinary.destruir(s.identificadorPublico());
            throw e;
        } catch (IOException e) {
            for (ImagenSubida s : subidas) cloudinary.destruir(s.identificadorPublico());
            throw new IllegalArgumentException("No se pudo leer una de las fotos.");
        }
        auditoria.registrar(admin, "FOTOS_AGREGADAS", fotos.size() + " en " + nombres.get(0) + " (#" + recetaId + ")");
    }

    @Transactional
    public void quitar(Long imagenId, String admin) {
        var filas = jdbc.queryForList("SELECT receta_id, identificador_publico FROM imagenes WHERE id = ?", imagenId);
        if (filas.isEmpty()) throw new IllegalArgumentException("Foto no encontrada");
        String publico = String.valueOf(filas.get(0).get("identificador_publico"));
        jdbc.update("DELETE FROM imagenes WHERE id = ?", imagenId);
        cloudinary.destruir(publico);
        auditoria.registrar(admin, "FOTO_ELIMINADA", "#" + imagenId + " de la receta #" + filas.get(0).get("receta_id"));
    }
}