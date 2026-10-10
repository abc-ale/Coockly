package com.cookly.servicios;

import com.cookly.dto.RespuestaResena;
import com.cookly.modelos.Resena;
import com.cookly.repositorios.RepositorioReceta;
import com.cookly.repositorios.RepositorioResena;
import com.cookly.repositorios.RepositorioUsuario;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.List;
import java.util.Map;

@Service
public class ServicioResena {
    private final RepositorioResena resenas;
    private final RepositorioReceta recetas;
    private final RepositorioUsuario usuarios;

    public ServicioResena(RepositorioResena resenas, RepositorioReceta recetas, RepositorioUsuario usuarios) {
        this.resenas = resenas; this.recetas = recetas; this.usuarios = usuarios;
    }

    /** Se convierte a DTO dentro de la transacción: así el autor (carga diferida) ya está disponible. */
    private RespuestaResena aRespuesta(Resena r) {
        var u = r.getUsuario();
        return new RespuestaResena(r.getId(), r.getPuntuacion(), r.getComentario(), r.getCreadoEn(),
                new RespuestaResena.Autor(u.getNombre(), u.getCorreo()));
    }

    /** Reseñas y promedio de una receta, calculados en una sola transacción. */
    @Transactional(readOnly = true)
    public Map<String, Object> listarConPromedio(Long recetaId) {
        List<Resena> lista = resenas.findByRecetaIdOrderByCreadoEnDesc(recetaId);
        double promedio = lista.isEmpty() ? 0 : lista.stream().mapToInt(Resena::getPuntuacion).average().orElse(0);
        return Map.of("resenas", lista.stream().map(this::aRespuesta).toList(), "promedio", promedio);
    }

    /** Crea la reseña o actualiza la que el usuario ya tenía en esa receta (una por usuario, según UNIQUE). */
    @Transactional
    public RespuestaResena guardar(Long recetaId, String correo, Short puntuacion, String comentario) {
        var usuario = usuarios.findByCorreo(correo).orElseThrow(() -> new IllegalArgumentException("Usuario no encontrado"));
        var existente = resenas.findByRecetaIdAndUsuarioId(recetaId, usuario.getId());
        if (existente.isPresent()) {
            var r = existente.get();
            r.setPuntuacion(puntuacion);
            r.setComentario(comentario);
            return aRespuesta(resenas.save(r));
        }
        var receta = recetas.findById(recetaId).orElseThrow(() -> new IllegalArgumentException("Receta no encontrada"));
        return aRespuesta(resenas.save(new Resena(receta, usuario, puntuacion, comentario)));
    }
}