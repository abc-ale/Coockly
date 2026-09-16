package com.cookly.repositorios;
import com.cookly.modelos.Etiqueta;
import org.springframework.data.jpa.repository.JpaRepository;
public interface RepositorioEtiqueta extends JpaRepository<Etiqueta, Long> { }
