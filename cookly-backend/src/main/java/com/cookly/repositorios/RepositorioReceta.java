package com.cookly.repositorios;

import com.cookly.modelos.Receta;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import java.util.List;

public interface RepositorioReceta extends JpaRepository<Receta, Long> {
    @EntityGraph(attributePaths = {"ingredientes", "creador"})
    Page<Receta> findByNombreContainingIgnoreCase(String texto, Pageable pagina);

    /**
     * Carga las recetas y todos sus ingredientes en una sola consulta.
     * Evita el N+1 que hacía lento Menú Express al crecer el catálogo.
     */
    @EntityGraph(attributePaths = {"ingredientes"})
    @Query("select distinct r from Receta r order by r.nombre")
    List<Receta> findAllConIngredientes();
}
