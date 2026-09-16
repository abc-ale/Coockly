package com.cookly.controladores;

import com.cookly.dto.SolicitudElementoListaCompra;
import com.cookly.dto.SolicitudListaCompra;
import com.cookly.modelos.ElementoListaCompra;
import com.cookly.modelos.ListaCompra;
import com.cookly.servicios.ServicioListaCompra;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/api/v1/listas-compra")
public class ControladorListaCompra {
    private final ServicioListaCompra servicio;
    public ControladorListaCompra(ServicioListaCompra servicio) { this.servicio = servicio; }

    @GetMapping
    public List<ListaCompra> misListas(Authentication autenticacion) { return servicio.misListas(autenticacion.getName()); }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public ListaCompra crearManual(@Valid @RequestBody SolicitudListaCompra s, Authentication autenticacion) {
        return servicio.crearManual(autenticacion.getName(), s.nombre());
    }

    /** El endpoint clave: genera la lista automáticamente sumando los ingredientes de todas las recetas del menú. */
    @PostMapping("/generar-desde-menu/{menuId}")
    @ResponseStatus(HttpStatus.CREATED)
    public ListaCompra generarDesdeMenu(@PathVariable Long menuId, @RequestParam(defaultValue = "Lista de la semana") String nombre,
                                         Authentication autenticacion) {
        return servicio.generarDesdeMenu(autenticacion.getName(), menuId, nombre);
    }

    @PostMapping("/{listaId}/elementos")
    @ResponseStatus(HttpStatus.CREATED)
    public ElementoListaCompra agregarItem(@PathVariable Long listaId, @RequestBody SolicitudElementoListaCompra s) {
        return servicio.agregarItem(listaId, s.ingredienteId(), s.nombrePersonalizado(), s.cantidad(), s.unidad());
    }

    @PutMapping("/elementos/{itemId}/comprado")
    public void marcarComprado(@PathVariable Long itemId, @RequestParam boolean valor) {
        servicio.marcarComprado(itemId, valor);
    }

    @DeleteMapping("/{listaId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void eliminar(@PathVariable Long listaId) { servicio.eliminarLista(listaId); }
}
