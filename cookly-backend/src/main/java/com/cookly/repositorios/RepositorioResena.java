package com.cookly.repositorios;
import com.cookly.modelos.Resena;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.*;
public interface RepositorioResena extends JpaRepository<Resena, Long> {
    // Se trae el usuario junto con la reseña: así el JSON se puede escribir sin sesión abierta.
    @EntityGraph(attributePaths = {"usuario"})
    List<Resena> findByRecetaIdOrderByCreadoEnDesc(Long recetaId);

    @EntityGraph(attributePaths = {"usuario"})
    Optional<Resena> findByRecetaIdAndUsuarioId(Long recetaId, Long usuarioId);
}