package com.cookly.repositorios;
import com.cookly.modelos.Receta; import org.springframework.data.jpa.repository.*; import org.springframework.data.domain.*;
public interface RepositorioReceta extends JpaRepository<Receta,Long>{ @EntityGraph(attributePaths={"ingredientes","creador"}) Page<Receta> findByNombreContainingIgnoreCase(String texto, Pageable pagina); }
