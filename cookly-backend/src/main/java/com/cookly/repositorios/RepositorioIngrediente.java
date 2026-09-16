package com.cookly.repositorios;
import com.cookly.modelos.Ingrediente;
import org.springframework.data.jpa.repository.JpaRepository;
public interface RepositorioIngrediente extends JpaRepository<Ingrediente, Long> { }
