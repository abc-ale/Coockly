package com.cookly.repositorios;
import com.cookly.modelos.RestriccionAlimentaria;
import org.springframework.data.jpa.repository.JpaRepository;
public interface RepositorioRestriccionAlimentaria extends JpaRepository<RestriccionAlimentaria, Long> { }