package com.cookly.servicios;

import org.springframework.stereotype.Service;

import java.security.SecureRandom;
import java.time.Instant;
import java.util.Base64;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Enlaces de descarga temporales para la app móvil.
 *
 * El celular no puede enviar el token de sesión a su navegador, así que el administrador pide un enlace
 * (con su sesión) y lo abre en el navegador. El enlace sirve UNA sola vez y vence a los 2 minutos.
 * Se guarda en memoria: si el servidor se reinicia, los enlaces pendientes dejan de servir (solo hay que pedir otro).
 */
@Service
public class ServicioDescargas {

    private static final long SEGUNDOS_DE_VIDA = 120;

    private record Entrada(String tipo, Instant expira) { }

    private final Map<String, Entrada> pendientes = new ConcurrentHashMap<>();
    private final SecureRandom azar = new SecureRandom();

    public long segundosDeVida() {
        return SEGUNDOS_DE_VIDA;
    }

    /** Crea un enlace para "xlsx" o "pdf" y devuelve su código. */
    public String crear(String tipo) {
        limpiarVencidos();
        byte[] bytes = new byte[24];
        azar.nextBytes(bytes);
        String codigo = Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
        pendientes.put(codigo, new Entrada(tipo, Instant.now().plusSeconds(SEGUNDOS_DE_VIDA)));
        return codigo;
    }

    /** Devuelve el tipo y deja el enlace inservible. Vacío si no existe, ya se usó o venció. */
    public Optional<String> consumir(String codigo) {
        Entrada e = pendientes.remove(codigo);
        if (e == null || e.expira().isBefore(Instant.now())) {
            return Optional.empty();
        }
        return Optional.of(e.tipo());
    }

    private void limpiarVencidos() {
        Instant ahora = Instant.now();
        pendientes.values().removeIf(e -> e.expira().isBefore(ahora));
    }
}