package com.cookly.controladores;

import com.cookly.servicios.ServicioDescargas;
import com.cookly.servicios.ServicioReportes;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.io.IOException;
import java.util.Map;

/**
 * Descarga de los reportes desde la app móvil.
 *  1) La app (con la sesión del administrador) pide un enlace:  POST /api/v1/administracion/exportar/enlace
 *  2) Abre ese enlace en el navegador del celular:               GET  /api/v1/descargas/{codigo}
 * El segundo paso no lleva sesión: el código aleatorio, de un solo uso y de 2 minutos, es la autorización.
 */
@RestController
public class ControladorDescargas {

    private static final String XLSX = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

    private final ServicioDescargas descargas;
    private final ServicioReportes reportes;
    private final String urlPublica;

    public ControladorDescargas(ServicioDescargas descargas, ServicioReportes reportes,
                                @Value("${app.url-publica}") String urlPublica) {
        this.descargas = descargas;
        this.reportes = reportes;
        this.urlPublica = urlPublica.replaceAll("/+$", "");
    }

    /** Exige rol ADMINISTRADOR por la ruta (ver ConfiguracionSeguridad). */
    @PostMapping("/api/v1/administracion/exportar/enlace")
    public Map<String, Object> crearEnlace(@RequestParam String tipo) {
        if (!"xlsx".equals(tipo) && !"pdf".equals(tipo)) {
            throw new IllegalArgumentException("Tipo de reporte no válido. Usa xlsx o pdf.");
        }
        String codigo = descargas.crear(tipo);
        return Map.of(
                "url", urlPublica + "/api/v1/descargas/" + codigo,
                "expiraEnSegundos", descargas.segundosDeVida());
    }

    @GetMapping("/api/v1/descargas/{codigo}")
    public ResponseEntity<byte[]> descargar(@PathVariable String codigo) throws IOException {
        String tipo = descargas.consumir(codigo).orElse(null);
        if (tipo == null) {
            return ResponseEntity.status(404).build();
        }
        boolean excel = "xlsx".equals(tipo);
        byte[] datos = excel ? reportes.usuariosXlsx() : reportes.usuariosPdf();
        String nombre = reportes.nombreArchivo("cookly-usuarios", excel ? "xlsx" : "pdf");
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + nombre + "\"")
                .header(HttpHeaders.CACHE_CONTROL, "no-store")
                .contentType(MediaType.parseMediaType(excel ? XLSX : MediaType.APPLICATION_PDF_VALUE))
                .body(datos);
    }
}