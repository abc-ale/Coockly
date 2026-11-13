package com.cookly.repositorios;
import com.cookly.modelos.ClaveUsuarioRestriccion;
import com.cookly.modelos.UsuarioRestriccion;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
public interface RepositorioUsuarioRestriccion extends JpaRepository<UsuarioRestriccion, ClaveUsuarioRestriccion> {
    List<UsuarioRestriccion> findByUsuarioId(Long usuarioId);
    void deleteByUsuarioId(Long usuarioId);
}