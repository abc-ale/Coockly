package com.cookly.repositorios;
import com.cookly.modelos.HistorialReceta;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
public interface RepositorioHistorialReceta extends JpaRepository<HistorialReceta, Long> {
    List<HistorialReceta> findTop50ByUsuarioIdOrderByVistoEnDesc(Long usuarioId);
}
