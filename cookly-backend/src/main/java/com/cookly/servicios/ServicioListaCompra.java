package com.cookly.servicios;

import com.cookly.modelos.*;
import com.cookly.repositorios.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.*;

@Service
public class ServicioListaCompra {
    private final RepositorioListaCompra listas;
    private final RepositorioElementoListaCompra elementos;
    private final RepositorioMenuSemanal menus;
    private final RepositorioUsuario usuarios;
    private final RepositorioIngrediente ingredientes;

    public ServicioListaCompra(RepositorioListaCompra listas, RepositorioElementoListaCompra elementos,
                                RepositorioMenuSemanal menus, RepositorioUsuario usuarios,
                                RepositorioIngrediente ingredientes) {
        this.listas = listas; this.elementos = elementos; this.menus = menus;
        this.usuarios = usuarios; this.ingredientes = ingredientes;
    }

    @Transactional(readOnly = true)
    public List<ListaCompra> misListas(String correo) {
        var usuario = usuarios.findByCorreo(correo).orElseThrow(() -> new IllegalArgumentException("Usuario no encontrado"));
        return listas.findByUsuarioIdOrderByCreadaEnDesc(usuario.getId());
    }

    @Transactional
    public ListaCompra crearManual(String correo, String nombre) {
        var usuario = usuarios.findByCorreo(correo).orElseThrow(() -> new IllegalArgumentException("Usuario no encontrado"));
        return listas.save(new ListaCompra(usuario, nombre));
    }

    /**
     * EL FLUJO CLAVE: toma todas las recetas del menú semanal, suma los
     * ingredientes de ingredientes_receta (agrupados por ingrediente+unidad,
     * las cantidades se suman si dos recetas usan el mismo ingrediente con
     * la misma unidad) y genera una lista de compra lista para marcar.
     */
    @Transactional
    public ListaCompra generarDesdeMenu(String correo, Long menuId, String nombreLista) {
        var usuario = usuarios.findByCorreo(correo).orElseThrow(() -> new IllegalArgumentException("Usuario no encontrado"));
        var menu = menus.findById(menuId).orElseThrow(() -> new IllegalArgumentException("Menú no encontrado"));
        if (!menu.getUsuario().getId().equals(usuario.getId()))
            throw new IllegalArgumentException("Ese menú no te pertenece");

        var lista = new ListaCompra(usuario, nombreLista);
        lista.setMenu(menu);
        lista = listas.save(lista);

        // clave: ingredienteId + unidad -> cantidad acumulada
        Map<String, Double> acumulado = new LinkedHashMap<>();
        Map<String, Ingrediente> ingredientePorClave = new LinkedHashMap<>();
        Map<String, String> unidadPorClave = new LinkedHashMap<>();

        for (var elemento : menu.getElementos()) {
            for (var detalle : elemento.getReceta().getDetallesIngredientes()) {
                var ing = detalle.getIngrediente();
                String unidad = detalle.getUnidad() == null ? "" : detalle.getUnidad();
                String clave = ing.getId() + "|" + unidad;
                acumulado.merge(clave, detalle.getCantidad() == null ? 0 : detalle.getCantidad(), Double::sum);
                ingredientePorClave.putIfAbsent(clave, ing);
                unidadPorClave.putIfAbsent(clave, detalle.getUnidad());
            }
        }

        for (var clave : acumulado.keySet()) {
            var item = new ElementoListaCompra(lista, ingredientePorClave.get(clave), null,
                    acumulado.get(clave), unidadPorClave.get(clave));
            elementos.save(item);
        }
        return lista;
    }

    @Transactional
    public ElementoListaCompra agregarItem(Long listaId, Long ingredienteId, String nombrePersonalizado,
                                            Double cantidad, String unidad) {
        var lista = listas.findById(listaId).orElseThrow(() -> new IllegalArgumentException("Lista no encontrada"));
        Ingrediente ingrediente = null;
        if (ingredienteId != null) {
            ingrediente = ingredientes.findById(ingredienteId).orElseThrow(() -> new IllegalArgumentException("Ingrediente no encontrado"));
        } else if (nombrePersonalizado == null || nombrePersonalizado.isBlank()) {
            throw new IllegalArgumentException("Debes indicar un ingrediente del catálogo o un nombre personalizado");
        }
        return elementos.save(new ElementoListaCompra(lista, ingrediente, nombrePersonalizado, cantidad, unidad));
    }

    @Transactional
    public void marcarComprado(Long itemId, boolean comprado) {
        var item = elementos.findById(itemId).orElseThrow(() -> new IllegalArgumentException("Elemento no encontrado"));
        item.setComprado(comprado);
        elementos.save(item);
    }

    @Transactional
    public void eliminarLista(Long listaId) { listas.deleteById(listaId); }
}
