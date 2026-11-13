package com.cookly.servicios;

import com.cookly.modelos.*;
import com.cookly.repositorios.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.List;

@Service
public class ServicioReporte {
    private final RepositorioReporte reportes;
    private final RepositorioReceta recetas;
    private final RepositorioUsuario usuarios;
    private final RepositorioComentario comentarios;

    public ServicioReporte(RepositorioReporte reportes, RepositorioReceta recetas,
                            RepositorioUsuario usuarios, RepositorioComentario comentarios) {
        this.reportes = reportes; this.recetas = recetas; this.usuarios = usuarios; this.comentarios = comentarios;
    }

    @Transactional
    public Reporte crear(String correo, Long recetaId, String motivo) {
        var usuario = usuarios.findByCorreo(correo).orElseThrow(() -> new IllegalArgumentException("Usuario no encontrado"));
        var receta = recetas.findById(recetaId).orElseThrow(() -> new IllegalArgumentException("Receta no encontrada"));
        return reportes.save(new Reporte(usuario, receta, motivo));
    }

    @Transactional(readOnly = true)
    public List<Reporte> pendientes() { return reportes.findByEstadoOrderByCreadoEnAsc(EstadoReporte.PENDIENTE); }

    /** El moderador resuelve el reporte. Si estado=REVISADO y eliminarReceta=true, borra también la receta reportada. */
    @Transactional
    public Reporte resolver(Long reporteId, String correoModerador, EstadoReporte estado, boolean eliminarReceta) {
        var r = reportes.findById(reporteId).orElseThrow(() -> new IllegalArgumentException("Reporte no encontrado"));
        var moderador = usuarios.findByCorreo(correoModerador).orElseThrow(() -> new IllegalArgumentException("Usuario no encontrado"));
        r.setEstado(estado);
        r.setModerador(moderador);
        if (estado == EstadoReporte.REVISADO && eliminarReceta) recetas.delete(r.getReceta());
        return reportes.save(r);
    }

    @Transactional
    public void eliminarComentario(Long comentarioId) {
        comentarios.deleteById(comentarioId);
    }
}