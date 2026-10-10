package com.cookly.repositorios;
import com.cookly.modelos.ClaveRecetaEtiqueta;
import com.cookly.modelos.Receta;
import com.cookly.modelos.RecetaEtiqueta;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.util.List;
public interface RepositorioRecetaEtiqueta extends JpaRepository<RecetaEtiqueta, ClaveRecetaEtiqueta> {
    List<RecetaEtiqueta> findByRecetaId(Long recetaId);

    @Query(value = "select re.receta from RecetaEtiqueta re where re.etiqueta.id = :etiquetaId order by re.receta.id desc",
           countQuery = "select count(re) from RecetaEtiqueta re where re.etiqueta.id = :etiquetaId")
    Page<Receta> recetasPorEtiqueta(@Param("etiquetaId") Long etiquetaId, Pageable pagina);
}