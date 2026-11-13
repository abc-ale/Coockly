package com.cookly.repositorios;
import com.cookly.modelos.ClaveUsuarioAlergia;
import com.cookly.modelos.UsuarioAlergia;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
public interface RepositorioUsuarioAlergia extends JpaRepository<UsuarioAlergia, ClaveUsuarioAlergia> {
    List<UsuarioAlergia> findByUsuarioId(Long usuarioId);
    void deleteByUsuarioId(Long usuarioId);
}