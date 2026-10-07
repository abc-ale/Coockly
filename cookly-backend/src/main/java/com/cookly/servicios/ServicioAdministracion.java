package com.cookly.servicios;

import com.cookly.modelos.EstadoReporte;
import com.cookly.modelos.Rol;
import com.cookly.modelos.Usuario;
import com.cookly.repositorios.RepositorioUsuario;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;

@Service
public class ServicioAdministracion {

    /** Tablas que guardan datos de una receta. Se limpian antes de borrarla (no dependemos de ON DELETE CASCADE). */
    private static final List<String> TABLAS_DE_RECETA = List.of(
            "comentarios", "resenas", "favoritos", "historial_recetas", "reportes", "imagenes",
            "ingredientes_receta", "pasos_receta", "recetas_etiquetas", "elementos_menu_semanal");

    private final RepositorioUsuario usuarios;
    private final JdbcTemplate jdbc;

    public ServicioAdministracion(RepositorioUsuario usuarios, JdbcTemplate jdbc) {
        this.usuarios = usuarios;
        this.jdbc = jdbc;
    }

    @Transactional
    public Usuario cambiarRol(Long usuarioId, Rol nuevoRol, String correoSolicitante) {
        Usuario u = buscar(usuarioId);
        if (u.getRol() == Rol.ADMINISTRADOR && nuevoRol != Rol.ADMINISTRADOR) {
            protegerAdministrador(u, correoSolicitante, "quitar el rol de administrador a");
        }
        u.setRol(nuevoRol);
        return usuarios.save(u);
    }

    @Transactional
    public Usuario cambiarActivo(Long usuarioId, boolean activo, String correoSolicitante) {
        Usuario u = buscar(usuarioId);
        if (!activo && u.getRol() == Rol.ADMINISTRADOR) {
            protegerAdministrador(u, correoSolicitante, "desactivar a");
        }
        u.setActivo(activo);
        return usuarios.save(u);
    }

    /** Evita que el sistema se quede sin ningún administrador activo. */
    private void protegerAdministrador(Usuario objetivo, String correoSolicitante, String accion) {
        if (objetivo.getCorreo().equalsIgnoreCase(correoSolicitante)) {
            throw new IllegalArgumentException("No puedes " + accion + " tu propia cuenta.");
        }
        Long otros = jdbc.queryForObject(
                "SELECT COUNT(*) FROM usuarios WHERE rol = 'ADMINISTRADOR' AND activo AND id <> ?",
                Long.class, objetivo.getId());
        if (otros == null || otros == 0) {
            throw new IllegalArgumentException("Debe quedar al menos un administrador activo.");
        }
    }

    private Usuario buscar(Long id) {
        return usuarios.findById(id).orElseThrow(() -> new IllegalArgumentException("Usuario no encontrado"));
    }

    // ------------------------------------------------------------------
    // Reportes de recetas (antes los atendía el moderador)
    // ------------------------------------------------------------------

    @Transactional(readOnly = true)
    public List<Map<String, Object>> reportesPendientes() {
        return jdbc.queryForList(
                "SELECT r.id AS id, r.motivo AS motivo, r.estado AS estado, "
                        + "to_char(r.creado_en, 'YYYY-MM-DD HH24:MI') AS \"creadoEn\", "
                        + "rec.id AS \"recetaId\", rec.nombre AS \"recetaNombre\", "
                        + "u.nombre AS reportante, u.correo AS \"reportanteCorreo\" "
                        + "FROM reportes r JOIN recetas rec ON rec.id = r.receta_id "
                        + "JOIN usuarios u ON u.id = r.usuario_id "
                        + "WHERE r.estado = 'PENDIENTE' ORDER BY r.id");
    }

    /**
     * Resuelve un reporte. Si el estado es REVISADO y eliminarReceta es true, borra la receta reportada
     * junto con todos sus datos (comentarios, reseñas, favoritos, imágenes, reportes...).
     */
    @Transactional
    public void resolverReporte(Long reporteId, String correoAdmin, EstadoReporte estado, boolean eliminarReceta) {
        if (estado == EstadoReporte.PENDIENTE) {
            throw new IllegalArgumentException("Elige REVISADO o DESCARTADO.");
        }
        List<Long> recetaIds = jdbc.queryForList("SELECT receta_id FROM reportes WHERE id = ?", Long.class, reporteId);
        if (recetaIds.isEmpty()) {
            throw new IllegalArgumentException("Reporte no encontrado");
        }
        List<Long> adminIds = jdbc.queryForList("SELECT id FROM usuarios WHERE correo = ?", Long.class, correoAdmin);
        if (adminIds.isEmpty()) {
            throw new IllegalArgumentException("Usuario no encontrado");
        }

        if (estado == EstadoReporte.REVISADO && eliminarReceta) {
            Long recetaId = recetaIds.get(0);
            for (String tabla : TABLAS_DE_RECETA) {
                jdbc.update("DELETE FROM " + tabla + " WHERE receta_id = ?", recetaId);
            }
            jdbc.update("DELETE FROM recetas WHERE id = ?", recetaId);
            return;
        }
        jdbc.update("UPDATE reportes SET estado = ?, moderador_id = ? WHERE id = ?",
                estado.name(), adminIds.get(0), reporteId);
    }
}