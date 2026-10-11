package com.cookly.controladores;

import com.cookly.servicios.ServicioPanelExtra;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;

/** Alérgenos por ingrediente que la app usa para avisar con exactitud (cualquier persona con sesión). */
@RestController
public class ControladorAlergenos {

    private final ServicioPanelExtra servicio;

    public ControladorAlergenos(ServicioPanelExtra servicio) {
        this.servicio = servicio;
    }

    @GetMapping("/api/v1/alergenos")
    public List<Map<String, Object>> alergenos() {
        return servicio.alergenosParaApp();
    }
}