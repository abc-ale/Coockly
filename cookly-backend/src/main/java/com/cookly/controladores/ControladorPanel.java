package com.cookly.controladores;

import com.cookly.dto.RespuestaAcceso;
import com.cookly.dto.SolicitudAcceso;
import com.cookly.servicios.ServicioAutenticacion;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

import java.time.Instant;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/** Entrada al panel web (/admin) y su inicio de sesión, que solo acepta cuentas ADMINISTRADOR. */
@RestController
public class ControladorPanel {

    private static final int MAX_FALLOS = 8;
    private static final long VENTANA_SEGUNDOS = 600;

    private record Fallos(int cantidad, Instant desde) { }

    private final ServicioAutenticacion autenticacion;
    private final Map<String, Fallos> fallosPorIp = new ConcurrentHashMap<>();

    public ControladorPanel(ServicioAutenticacion autenticacion) {
        this.autenticacion = autenticacion;
    }

    @GetMapping({"/", "/admin", "/admin/"})
    public ResponseEntity<Void> entrada() {
        return ResponseEntity.status(302).header("Location", "/admin/index.html").build();
    }

    @PostMapping("/api/v1/panel/acceso")
    public ResponseEntity<?> acceso(@Valid @RequestBody SolicitudAcceso solicitud, HttpServletRequest peticion) {
        String ip = ipDelCliente(peticion);
        Fallos previos = fallosPorIp.get(ip);
        Instant ahora = Instant.now();
        limpiarVencidos(ahora);

        if (previos != null && previos.desde().plusSeconds(VENTANA_SEGUNDOS).isAfter(ahora)
                && previos.cantidad() >= MAX_FALLOS) {
            return ResponseEntity.status(429)
                    .body(Map.of("mensaje", "Demasiados intentos. Espera 10 minutos e inténtalo de nuevo."));
        }

        try {
            RespuestaAcceso respuesta = autenticacion.acceder(solicitud);
            if ("ADMINISTRADOR".equals(respuesta.rol())) {
                fallosPorIp.remove(ip);
                return ResponseEntity.ok(respuesta);
            }
        } catch (IllegalArgumentException ignorada) {
            // credenciales inválidas: se responde igual que si la cuenta no fuera administradora
        }

        boolean ventanaVigente = previos != null && previos.desde().plusSeconds(VENTANA_SEGUNDOS).isAfter(ahora);
        fallosPorIp.put(ip, ventanaVigente ? new Fallos(previos.cantidad() + 1, previos.desde()) : new Fallos(1, ahora));
        return ResponseEntity.status(401).body(Map.of("mensaje", "Credenciales inválidas o sin permiso de administrador."));
    }

    /**
     * Detrás del proxy de Render, getRemoteAddr() es la IP del proxy (la misma para todos).
     * El proxy agrega la IP real al FINAL de X-Forwarded-For; lo que venga antes lo puede inventar el cliente.
     */
    private static String ipDelCliente(HttpServletRequest peticion) {
        String cabecera = peticion.getHeader("X-Forwarded-For");
        if (cabecera != null && !cabecera.isBlank()) {
            String[] partes = cabecera.split(",");
            return partes[partes.length - 1].trim();
        }
        return peticion.getRemoteAddr();
    }

    /** Evita que el mapa crezca sin límite. */
    private void limpiarVencidos(Instant ahora) {
        if (fallosPorIp.size() > 500) {
            fallosPorIp.values().removeIf(f -> f.desde().plusSeconds(VENTANA_SEGUNDOS).isBefore(ahora));
        }
    }
}