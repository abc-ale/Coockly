package com.cookly.repositorios;

import com.cookly.modelos.ListaCompra;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface RepositorioListaCompra extends JpaRepository<ListaCompra, Long> {
    List<ListaCompra> findByUsuarioIdOrderByCreadaEnDesc(Long usuarioId);
}
