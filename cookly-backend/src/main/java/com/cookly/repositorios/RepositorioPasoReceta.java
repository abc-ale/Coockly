package com.cookly.repositorios;
import com.cookly.modelos.PasoReceta;
import org.springframework.data.jpa.repository.JpaRepository;
public interface RepositorioPasoReceta extends JpaRepository<PasoReceta, Long> { }