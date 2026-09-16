package com.cookly.repositorios;
import com.cookly.modelos.Resena;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.*;
public interface RepositorioResena extends JpaRepository<Resena, Long> {
    List<Resena> findByRecetaIdOrderByCreadoEnDesc(Long recetaId);
    Optional<Resena> findByRecetaIdAndUsuarioId(Long recetaId, Long usuarioId);
}