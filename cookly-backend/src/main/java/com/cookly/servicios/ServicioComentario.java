package com.cookly.servicios;

import com.cookly.modelos.Comentario;
import com.cookly.repositorios.RepositorioComentario;
import com.cookly.repositorios.RepositorioReceta;
import com.cookly.repositorios.RepositorioUsuario;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.List;

@Service
public class ServicioComentario {
    private final RepositorioComentario comentarios;
    private final RepositorioReceta recetas;
    private final RepositorioUsuario usuarios;

    public ServicioComentario(RepositorioComentario comentarios, RepositorioReceta recetas, RepositorioUsuario usuarios) {
        this.comentarios = comentarios; this.recetas = recetas; this.usuarios = usuarios;
    }

    @Transactional(readOnly = true)
    public List<Comentario> listar(Long recetaId) { return comentarios.findByRecetaIdOrderByCreadoEnDesc(recetaId); }

    @Transactional
    public Comentario crear(Long recetaId, String correoAutor, String contenido) {
        var receta = recetas.findById(recetaId).orElseThrow(() -> new IllegalArgumentException("Receta no encontrada"));
        var usuario = usuarios.findByCorreo(correoAutor).orElseThrow(() -> new IllegalArgumentException("Usuario no encontrado"));
        return comentarios.save(new Comentario(receta, usuario, contenido));
    }

    @Transactional
    public void eliminar(Long comentarioId, String correoSolicitante, boolean esModeradorOAdmin) {
        var c = comentarios.findById(comentarioId).orElseThrow(() -> new IllegalArgumentException("Comentario no encontrado"));
        if (!esModeradorOAdmin && !c.getUsuario().getCorreo().equalsIgnoreCase(correoSolicitante))
            throw new IllegalArgumentException("No puedes eliminar el comentario de otro usuario");
        comentarios.delete(c);
    }
}