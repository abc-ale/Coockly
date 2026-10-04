package com.cookly.controladores;

import com.cookly.dto.SolicitudCambioRol;
import com.cookly.dto.SolicitudRevisionReporte;
import com.cookly.dto.UsuarioResumen;
import com.cookly.servicios.ServicioAdministracion;
import com.cookly.servicios.ServicioEstadisticas;
import com.cookly.servicios.ServicioReportes;
import com.cookly.servicios.ServicioRespaldo;
import jakarta.validation.Valid;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.List;
import java.util.Map;

/** Todo lo que cuelga de /api/v1/administracion/** exige rol ADMINISTRADOR (ver ConfiguracionSeguridad). */
@RestController
@RequestMapping("/api/v1/administracion")
public class ControladorAdministracion {

    private static final String XLSX = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

    private final ServicioAdministracion administracion;
    private final ServicioEstadisticas estadisticas;
    private final ServicioReportes reportes;
    private final ServicioRespaldo respaldo;

    public ControladorAdministracion(ServicioAdministracion administracion, ServicioEstadisticas estadisticas,
                                     ServicioReportes reportes, ServicioRespaldo respaldo) {
        this.administracion = administracion;
        this.estadisticas = estadisticas;
        this.reportes = reportes;
        this.respaldo = respaldo;
    }

    // ---------------------------------------------------------------- dashboard

    @GetMapping("/resumen")
    public Map<String, Object> resumen() {
        return estadisticas.resumen();
    }

    @GetMapping("/graficas")
    public Map<String, Object> graficas(@RequestParam(defaultValue = "30") int dias) {
        return estadisticas.graficas(dias);
    }

    // ---------------------------------------------------------------- usuarios

    @GetMapping("/usuarios")
    public List<UsuarioResumen> usuarios() {
        return estadisticas.listarUsuarios();
    }

    @PutMapping("/usuarios/{id}/rol")
    public Map<String, String> cambiarRol(@PathVariable Long id, @Valid @RequestBody SolicitudCambioRol s,
                                          Authentication autenticacion) {
        var u = administracion.cambiarRol(id, s.rol(), autenticacion.getName());
        return Map.of("mensaje", "Rol actualizado", "correo", u.getCorreo(), "rol", u.getRol().name());
    }

    @PutMapping("/usuarios/{id}/activo")
    public Map<String, String> cambiarActivo(@PathVariable Long id, @RequestParam boolean valor,
                                             Authentication autenticacion) {
        var u = administracion.cambiarActivo(id, valor, autenticacion.getName());
        return Map.of("mensaje", "Estado actualizado", "correo", u.getCorreo(), "activo", String.valueOf(u.isActivo()));
    }

    // ---------------------------------------------------------------- reportes descargables

    @GetMapping("/exportar/usuarios.xlsx")
    public ResponseEntity<byte[]> usuariosExcel() throws IOException {
        byte[] datos = reportes.usuariosXlsx();
        return descarga(datos, XLSX, reportes.nombreArchivo("cookly-usuarios", "xlsx"));
    }

    @GetMapping("/exportar/usuarios.pdf")
    public ResponseEntity<byte[]> usuariosPdf() throws IOException {
        byte[] datos = reportes.usuariosPdf();
        return descarga(datos, MediaType.APPLICATION_PDF_VALUE, reportes.nombreArchivo("cookly-usuarios", "pdf"));
    }

    // ---------------------------------------------------------------- reportes de recetas (moderación)

    @GetMapping("/moderacion/reportes")
    public List<Map<String, Object>> reportesPendientes() {
        return administracion.reportesPendientes();
    }

    @PutMapping("/moderacion/reportes/{id}")
    public Map<String, String> resolverReporte(@PathVariable Long id, @Valid @RequestBody SolicitudRevisionReporte s,
                                               @RequestParam(defaultValue = "false") boolean eliminarReceta,
                                               Authentication autenticacion) {
        administracion.resolverReporte(id, autenticacion.getName(), s.estado(), eliminarReceta);
        return Map.of("mensaje", "Reporte actualizado");
    }

    // ---------------------------------------------------------------- respaldo y recuperación

    @GetMapping("/respaldo/info")
    public Map<String, Object> infoRespaldo() {
        return respaldo.informacion();
    }

    @GetMapping("/respaldo/descargar")
    public ResponseEntity<byte[]> descargarRespaldo() {
        byte[] datos = respaldo.generarRespaldo();
        return descarga(datos, MediaType.APPLICATION_JSON_VALUE, reportes.nombreArchivo("cookly-respaldo", "json"));
    }

    @PostMapping(value = "/respaldo/restaurar", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public Map<String, Object> restaurar(@RequestParam("archivo") MultipartFile archivo,
                                         @RequestParam("confirmacion") String confirmacion) throws IOException {
        if (!"RESTAURAR".equals(confirmacion)) {
            throw new IllegalArgumentException("Escribe RESTAURAR para confirmar.");
        }
        if (archivo.isEmpty()) {
            throw new IllegalArgumentException("Elige un archivo de respaldo.");
        }
        return respaldo.restaurar(archivo.getBytes());
    }

    private static ResponseEntity<byte[]> descarga(byte[] datos, String tipo, String nombre) {
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + nombre + "\"")
                .header(HttpHeaders.CACHE_CONTROL, "no-store")
                .contentType(MediaType.parseMediaType(tipo))
                .body(datos);
    }
}