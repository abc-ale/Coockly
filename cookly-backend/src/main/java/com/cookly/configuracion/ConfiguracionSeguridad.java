package com.cookly.configuracion;

import com.cookly.seguridad.FiltroJwt;
import org.springframework.context.annotation.*;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.*;

import java.util.*;

@Configuration
public class ConfiguracionSeguridad {

    @Bean
    PasswordEncoder codificador() {
        return new BCryptPasswordEncoder();
    }

    @Bean
    SecurityFilterChain cadena(HttpSecurity http, FiltroJwt filtro) throws Exception {
        return http
                .csrf(c -> c.disable())
                .cors(c -> c.configurationSource(cors()))
                .sessionManagement(s -> s.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                // Sin sesión válida (por ejemplo, el token venció a los 60 min) respondemos 401 y no 403,
                // que es lo que la app espera para cerrar la sesión y pedir el login otra vez.
                .exceptionHandling(e -> e.authenticationEntryPoint((solicitud, respuesta, excepcion) -> {
                    respuesta.setStatus(401);
                    respuesta.setContentType("application/json;charset=UTF-8");
                    respuesta.getWriter().write("{\"mensaje\":\"Tu sesión venció. Entra de nuevo.\"}");
                }))
                // Solo el propio sitio, más imágenes del Supabase de Cookly (fotos de Comunidad) y de Cloudinary (fotos de recetas).
                .headers(h -> h.contentSecurityPolicy(c -> c.policyDirectives(
                        "default-src 'self'; img-src 'self' data: https://torfbgyqvvyajmtbyuvb.supabase.co https://res.cloudinary.com")))
                .authorizeHttpRequests(a -> a
                        .requestMatchers(
                                "/api/v1/autenticacion/**",
                                "/api/v1/salud",
                                "/privacidad.html",
                                "/eliminar-datos.html",
                                "/legal.css",
                                "/restablecer.html",
                                "/restablecer.js",
                                "/restablecer.css",
                                "/favicon.ico",
                                "/",
                                "/admin",
                                "/admin/",
                                "/admin/**",
                                "/webjars/**",
                                "/api/v1/panel/acceso"
                        ).permitAll()
                        .requestMatchers("/api/v1/administracion/**").hasRole("ADMINISTRADOR")
                        .requestMatchers("/api/v1/moderacion/**").hasRole("ADMINISTRADOR")
                        // Crear recetas y manejar sus fotos es solo del administrador; ver recetas sigue abierto a todo usuario con sesión.
                        .requestMatchers(HttpMethod.POST, "/api/v1/recetas").hasRole("ADMINISTRADOR")
                        .requestMatchers(HttpMethod.POST, "/api/v1/imagenes").hasRole("ADMINISTRADOR")
                        .requestMatchers(HttpMethod.DELETE, "/api/v1/imagenes/**").hasRole("ADMINISTRADOR")
                        .requestMatchers(HttpMethod.GET, "/api/v1/imagenes/firma").hasRole("ADMINISTRADOR")
                        .anyRequest().authenticated())
                .addFilterBefore(filtro, UsernamePasswordAuthenticationFilter.class)
                .build();
    }

    @Bean
    CorsConfigurationSource cors() {
        var c = new CorsConfiguration();
        c.setAllowedOrigins(List.of("https://cookly.app", "https://cookly-api-sb9w.onrender.com"));
        c.setAllowedMethods(List.of("GET", "POST", "PUT", "DELETE"));
        c.setAllowedHeaders(List.of("Authorization", "Content-Type"));
        var s = new UrlBasedCorsConfigurationSource();
        s.registerCorsConfiguration("/**", c);
        return s;
    }
}