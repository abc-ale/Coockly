package com.cookly.seguridad;

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
import java.util.List;

@Component
public class FiltroJwt extends OncePerRequestFilter {
    private final ServicioToken servicio;

    public FiltroJwt(ServicioToken servicio) {
        this.servicio = servicio;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest solicitud, HttpServletResponse respuesta, FilterChain cadena)
            throws ServletException, IOException {
        String cabecera = solicitud.getHeader("Authorization");
        if (cabecera != null && cabecera.startsWith("Bearer ")) {
            try {
                var datos = servicio.validar(cabecera.substring(7));
                String rol = datos.get("rol", String.class);
                var autoridad = new SimpleGrantedAuthority("ROLE_" + rol);
                SecurityContextHolder.getContext().setAuthentication(
                        new UsernamePasswordAuthenticationToken(datos.getSubject(), null, List.of(autoridad)));
                // Administrador: sesión corta que se renueva con cada petición (vence por inactividad).
                if (ServicioToken.esAdministrador(rol)) {
                    respuesta.setHeader("X-Token-Nuevo", servicio.crear(datos.getSubject(), rol));
                    respuesta.setHeader("Access-Control-Expose-Headers", "X-Token-Nuevo");
                }
            } catch (Exception ignorada) {
                // Token inválido o vencido: sigue como anónimo y la seguridad responde 401.
            }
        }
        cadena.doFilter(solicitud, respuesta);
    }
}