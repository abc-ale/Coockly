package com.cookly.repositorios;

import com.cookly.modelos.*;
import org.springframework.data.jpa.repository.*;
import org.springframework.data.repository.query.Param;
import java.util.List;

public interface RepositorioFavorito extends JpaRepository<Favorito, ClaveFavorito> {
    @Query("select f.receta from Favorito f join fetch f.receta.creador where f.usuario.correo = :correo order by f.clave.recetaId desc")
    List<Receta> buscarRecetasPorCorreo(@Param("correo") String correo);
}