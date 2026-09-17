package com.cookly.repositorios;
import com.cookly.modelos.Ingrediente;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;
public interface RepositorioIngrediente extends JpaRepository<Ingrediente, Long> {
    Optional<Ingrediente> findByNombreIgnoreCase(String nombre);
}
