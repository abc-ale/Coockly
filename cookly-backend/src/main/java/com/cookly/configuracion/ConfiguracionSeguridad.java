package com.cookly.configuracion;

import com.cookly.seguridad.FiltroJwt;
import org.springframework.context.annotation.*;
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
                // Solo el propio sitio, más imágenes del Supabase de Cookly (fotos de Comunidad en el panel).
                .headers(h -> h.contentSecurityPolicy(c -> c.policyDirectives(
                        "default-src 'self'; img-src 'self' data: https://torfbgyqvvyajmtbyuvb.supabase.co")))
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