package com.cookly.repositorios;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.cookly.modelos.Receta;

public interface RepositorioReceta extends JpaRepository<Receta, Long> {

    @EntityGraph(attributePaths = {"detallesIngredientes", "creador"})
    Page<Receta> findByNombreContainingIgnoreCase(String texto, Pageable pagina);

    @EntityGraph(attributePaths = {"detallesIngredientes", "creador"})
    @Query("select r from Receta r where exists " +
           "(select 1 from RecetaEtiqueta re where re.receta = r and re.etiqueta.id = :etiquetaId)")
    Page<Receta> buscarPorEtiqueta(@Param("etiquetaId") Long etiquetaId, Pageable pagina);

}
