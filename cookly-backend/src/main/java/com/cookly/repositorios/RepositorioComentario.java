package com.cookly.repositorios;
import com.cookly.modelos.Comentario;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
public interface RepositorioComentario extends JpaRepository<Comentario, Long> {
    List<Comentario> findByRecetaIdOrderByCreadoEnDesc(Long recetaId);
}
