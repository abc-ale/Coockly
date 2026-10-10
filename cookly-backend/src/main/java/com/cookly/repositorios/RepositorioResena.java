package com.cookly.repositorios;
import com.cookly.modelos.Resena;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.util.*;
public interface RepositorioResena extends JpaRepository<Resena, Long> {
    List<Resena> findByRecetaIdOrderByCreadoEnDesc(Long recetaId);
    Optional<Resena> findByRecetaIdAndUsuarioId(Long recetaId, Long usuarioId);

    /** Pares (id de receta, promedio de estrellas) de varias recetas a la vez; las que no tienen reseñas no aparecen. */
    @Query("select r.receta.id, avg(r.puntuacion) from Resena r where r.receta.id in :ids group by r.receta.id")
    List<Object[]> promediosPorRecetas(@Param("ids") Collection<Long> ids);
}