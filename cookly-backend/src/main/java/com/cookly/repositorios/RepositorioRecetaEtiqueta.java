package com.cookly.repositorios;
import com.cookly.modelos.ClaveRecetaEtiqueta;
import com.cookly.modelos.RecetaEtiqueta;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
public interface RepositorioRecetaEtiqueta extends JpaRepository<RecetaEtiqueta, ClaveRecetaEtiqueta> {
    List<RecetaEtiqueta> findByRecetaId(Long recetaId);
}
