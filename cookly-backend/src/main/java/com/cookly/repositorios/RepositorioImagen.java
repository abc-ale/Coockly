package com.cookly.repositorios;
import com.cookly.modelos.Imagen;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
public interface RepositorioImagen extends JpaRepository<Imagen, Long> {
    List<Imagen> findByRecetaId(Long recetaId);
}

