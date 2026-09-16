package com.cookly.servicios;

import com.cookly.modelos.Resena;
import com.cookly.repositorios.RepositorioReceta;
import com.cookly.repositorios.RepositorioResena;
import com.cookly.repositorios.RepositorioUsuario;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.List;

@Service
public class ServicioResena {
    private final RepositorioResena resenas;
    private final RepositorioReceta recetas;
    private final RepositorioUsuario usuarios;

    public ServicioResena(RepositorioResena resenas, RepositorioReceta recetas, RepositorioUsuario usuarios) {
        this.resenas = resenas; this.recetas = recetas; this.usuarios = usuarios;
    }

    @Transactional(readOnly = true)
    public List<Resena> listar(Long recetaId) { return resenas.findByRecetaIdOrderByCreadoEnDesc(recetaId); }

    /** Crea la reseña o actualiza la que el usuario ya tenía en esa receta (una por usuario, según UNIQUE). */
    @Transactional
    public Resena guardar(Long recetaId, String correo, Short puntuacion, String comentario) {
        var usuario = usuarios.findByCorreo(correo).orElseThrow(() -> new IllegalArgumentException("Usuario no encontrado"));
        var existente = resenas.findByRecetaIdAndUsuarioId(recetaId, usuario.getId());
        if (existente.isPresent()) {
            var r = existente.get();
            r.setPuntuacion(puntuacion);
            r.setComentario(comentario);
            return resenas.save(r);
        }
        var receta = recetas.findById(recetaId).orElseThrow(() -> new IllegalArgumentException("Receta no encontrada"));
        return resenas.save(new Resena(receta, usuario, puntuacion, comentario));
    }

    @Transactional(readOnly = true)
    public double promedio(Long recetaId) {
        var lista = resenas.findByRecetaIdOrderByCreadoEnDesc(recetaId);
        return lista.isEmpty() ? 0 : lista.stream().mapToInt(Resena::getPuntuacion).average().orElse(0);
    }
}