package com.cookly.repositorios;
import com.cookly.modelos.EstadoReporte;
import com.cookly.modelos.Reporte;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
public interface RepositorioReporte extends JpaRepository<Reporte, Long> {
    List<Reporte> findByEstadoOrderByCreadoEnAsc(EstadoReporte estado);
}