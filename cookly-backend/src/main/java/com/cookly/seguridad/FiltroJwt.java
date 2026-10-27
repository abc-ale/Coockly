package com.cookly.seguridad;

import com.cookly.repositorios.RepositorioUsuario;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Component
public class FiltroJwt extends OncePerRequestFilter {
    /** Cuánto se recuerda el estado de una cuenta antes de volver a consultarlo (así un bloqueo se nota en segundos). */
    private static final long SEGUNDOS_CACHE = 30;

    private record Estado(boolean activo, String rol, Instant vence) { }

    private final ServicioToken servicio;
    private final RepositorioUsuario usuarios;
    private final Map<String, Estado> estados = new ConcurrentHashMap<>();

    public FiltroJwt(ServicioToken servicio, RepositorioUsuario usuarios) {
        this.servicio = servicio;
        this.usuarios = usuarios;
    }

    /** Estado actual de la cuenta en la base de datos (no el que dice el token: la sesión de usuario ya no vence). */
    private Estado estadoActual(String correo) {
        Estado e = estados.get(correo);
        Instant ahora = Instant.now();
        if (e != null && e.vence().isAfter(ahora)) {
            return e;
        }
        if (estados.size() > 5000) {
            estados.values().removeIf(x -> x.vence().isBefore(ahora));
        }
        Estado nuevo = usuarios.findByCorreo(correo)
                .map(u -> new Estado(u.isActivo(), u.getRol().name(), ahora.plusSeconds(SEGUNDOS_CACHE)))
                .orElse(new Estado(false, null, ahora.plusSeconds(SEGUNDOS_CACHE)));
        estados.put(correo, nuevo);
        return nuevo;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest solicitud, HttpServletResponse respuesta, FilterChain cadena)
            throws ServletException, IOException {
        String cabecera = solicitud.getHeader("Authorization");
        if (cabecera != null && cabecera.startsWith("Bearer ")) {
            try {
                var datos = servicio.validar(cabecera.substring(7));
                Estado estado = estadoActual(datos.getSubject());
                // Cuenta bloqueada o eliminada: el token (aunque sea válido) deja de servir.
                if (estado.activo()) {
                    String rol = estado.rol();
                    var autoridad = new SimpleGrantedAuthority("ROLE_" + rol);
                    SecurityContextHolder.getContext().setAuthentication(
                            new UsernamePasswordAuthenticationToken(datos.getSubject(), null, List.of(autoridad)));
                    // Administrador: sesión corta que se renueva con cada petición (vence por inactividad).
                    if (ServicioToken.esAdministrador(rol)) {
                        respuesta.setHeader("X-Token-Nuevo", servicio.crear(datos.getSubject(), rol));
                        respuesta.setHeader("Access-Control-Expose-Headers", "X-Token-Nuevo");
                    }
                }
            } catch (Exception ignorada) {
                // Token inválido o vencido: sigue como anónimo y la seguridad responde 401.
            }
        }
        cadena.doFilter(solicitud, respuesta);
    }
}