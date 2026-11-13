package com.cookly.repositorios;

import com.cookly.modelos.MenuSemanal;
import org.springframework.data.jpa.repository.JpaRepository;
import java.time.LocalDate;
import java.util.Optional;

public interface RepositorioMenuSemanal extends JpaRepository<MenuSemanal, Long> {
    Optional<MenuSemanal> findByUsuarioIdAndSemana(Long usuarioId, LocalDate semana);
}
