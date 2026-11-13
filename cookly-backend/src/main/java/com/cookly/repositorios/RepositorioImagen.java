package com.cookly.repositorios;
import com.cookly.modelos.Imagen;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.util.Collection;
import java.util.List;
public interface RepositorioImagen extends JpaRepository<Imagen, Long> {
    List<Imagen> findByRecetaId(Long recetaId);

    /** Pares (id de receta, url) en el orden en que se subieron; la primera de cada receta es la portada. */
    @Query("select i.receta.id, i.url from Imagen i where i.receta.id in :ids order by i.id asc")
    List<Object[]> urlsPorRecetas(@Param("ids") Collection<Long> ids);
}