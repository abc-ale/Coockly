package com.cookly.servicios;

import com.cookly.dto.RespuestaComentario;
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

    /** Se convierte a DTO dentro de la transacción: así el autor (carga diferida) ya está disponible. */
    private RespuestaComentario aRespuesta(Comentario c) {
        var u = c.getUsuario();
        return new RespuestaComentario(c.getId(), c.getContenido(), c.getCreadoEn(),
                new RespuestaComentario.Autor(u.getNombre(), u.getCorreo()));
    }

    @Transactional(readOnly = true)
    public List<RespuestaComentario> listar(Long recetaId) {
        return comentarios.findByRecetaIdOrderByCreadoEnDesc(recetaId).stream().map(this::aRespuesta).toList();
    }

    @Transactional
    public RespuestaComentario crear(Long recetaId, String correoAutor, String contenido) {
        var receta = recetas.findById(recetaId).orElseThrow(() -> new IllegalArgumentException("Receta no encontrada"));
        var usuario = usuarios.findByCorreo(correoAutor).orElseThrow(() -> new IllegalArgumentException("Usuario no encontrado"));
        return aRespuesta(comentarios.save(new Comentario(receta, usuario, contenido)));
    }

    /** Solo la persona que escribió el comentario puede editarlo (sin límite de tiempo). */
    @Transactional
    public RespuestaComentario editar(Long comentarioId, String correoSolicitante, String contenido) {
        var c = comentarios.findById(comentarioId).orElseThrow(() -> new IllegalArgumentException("Comentario no encontrado"));
        if (!c.getUsuario().getCorreo().equalsIgnoreCase(correoSolicitante))
            throw new IllegalArgumentException("No puedes editar el comentario de otro usuario");
        c.setContenido(contenido.trim());
        return aRespuesta(comentarios.save(c));
    }

    @Transactional
    public void eliminar(Long comentarioId, String correoSolicitante, boolean esModeradorOAdmin) {
        var c = comentarios.findById(comentarioId).orElseThrow(() -> new IllegalArgumentException("Comentario no encontrado"));
        if (!esModeradorOAdmin && !c.getUsuario().getCorreo().equalsIgnoreCase(correoSolicitante))
            throw new IllegalArgumentException("No puedes eliminar el comentario de otro usuario");
        comentarios.delete(c);
    }
}