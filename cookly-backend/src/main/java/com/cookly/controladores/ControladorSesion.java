package com.cookly.controladores;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

/** Ping de sesión: el panel lo usa para renovar el token del administrador mientras hay actividad. */
@RestController
public class ControladorSesion {

    @GetMapping("/api/v1/sesion")
    public Map<String, Object> sesion() {
        return Map.of("ok", true);
    }
}