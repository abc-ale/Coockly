package com.cookly.controladores;

import com.cookly.dto.SolicitudElementoMenu;
import com.cookly.dto.SolicitudMenuSemanal;
import com.cookly.modelos.ElementoMenuSemanal;
import com.cookly.modelos.MenuSemanal;
import com.cookly.servicios.ServicioMenuSemanal;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/menus")
public class ControladorMenuSemanal {
    private final ServicioMenuSemanal servicio;
    public ControladorMenuSemanal(ServicioMenuSemanal servicio) { this.servicio = servicio; }

    /** Trae el menú de esa semana (lunes) del usuario autenticado, creándolo si no existe. */
    @PostMapping
    public MenuSemanal obtenerOCrear(@Valid @RequestBody SolicitudMenuSemanal s, Authentication autenticacion) {
        return servicio.obtenerOCrear(autenticacion.getName(), s.semana());
    }

    @PostMapping("/{menuId}/elementos")
    @ResponseStatus(HttpStatus.CREATED)
    public ElementoMenuSemanal agregarReceta(@PathVariable Long menuId, @Valid @RequestBody SolicitudElementoMenu s) {
        return servicio.agregarReceta(menuId, s.recetaId(), s.diaSemana(), s.tipoComida());
    }

    @DeleteMapping("/elementos/{elementoId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void quitarReceta(@PathVariable Long elementoId) { servicio.quitarReceta(elementoId); }
}
