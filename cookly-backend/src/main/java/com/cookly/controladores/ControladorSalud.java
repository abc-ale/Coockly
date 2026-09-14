package com.cookly.controladores;

import java.util.Map;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class ControladorSalud {
    @GetMapping("/api/v1/salud")
    public Map<String, String> comprobar() {
        return Map.of("estado", "ok");
    }
}
