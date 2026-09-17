package com.cookly.repositorios;
import com.cookly.modelos.ClaveIngredienteReceta;
import com.cookly.modelos.IngredienteReceta;
import org.springframework.data.jpa.repository.JpaRepository;
public interface RepositorioIngredienteReceta extends JpaRepository<IngredienteReceta, ClaveIngredienteReceta> { }
