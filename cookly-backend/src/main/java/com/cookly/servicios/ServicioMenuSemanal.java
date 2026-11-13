package com.cookly.servicios;

import com.cookly.modelos.*;
import com.cookly.repositorios.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.time.LocalDate;
import java.util.NoSuchElementException;

@Service
public class ServicioMenuSemanal {
    private final RepositorioMenuSemanal menus;
    private final RepositorioElementoMenuSemanal elementos;
    private final RepositorioUsuario usuarios;
    private final RepositorioReceta recetas;

    public ServicioMenuSemanal(RepositorioMenuSemanal menus, RepositorioElementoMenuSemanal elementos,
                                RepositorioUsuario usuarios, RepositorioReceta recetas) {
        this.menus = menus; this.elementos = elementos; this.usuarios = usuarios; this.recetas = recetas;
    }

    /** Devuelve el menú de esa semana para el usuario, creándolo si todavía no existe. */
    @Transactional
    public MenuSemanal obtenerOCrear(String correo, LocalDate semana) {
        var usuario = usuarios.findByCorreo(correo).orElseThrow(() -> new IllegalArgumentException("Usuario no encontrado"));
        return menus.findByUsuarioIdAndSemana(usuario.getId(), semana)
                .orElseGet(() -> menus.save(new MenuSemanal(usuario, semana)));
    }

    @Transactional
    public ElementoMenuSemanal agregarReceta(String correo, Long menuId, Long recetaId, Short diaSemana, TipoComida tipoComida) {
        var menu = menuPropio(correo, menuId);
        var receta = recetas.findById(recetaId).orElseThrow(() -> new IllegalArgumentException("Receta no encontrada"));
        return elementos.save(new ElementoMenuSemanal(menu, receta, diaSemana, tipoComida));
    }

    @Transactional
    public void quitarReceta(String correo, Long elementoId) {
        var elemento = elementos.findById(elementoId).orElse(null);
        if (elemento == null) return; // ya no existe: nada que borrar
        menuPropio(correo, elemento.getMenu().getId());
        elementos.deleteById(elementoId);
    }

    /** Devuelve el menú solo si es de esa persona; si es de otra se responde 404, igual que si no existiera. */
    private MenuSemanal menuPropio(String correo, Long menuId) {
        var usuario = usuarios.findByCorreo(correo).orElseThrow(() -> new IllegalArgumentException("Usuario no encontrado"));
        var menu = menus.findById(menuId).orElseThrow(() -> new NoSuchElementException("Menú no encontrado"));
        if (!menu.getUsuario().getId().equals(usuario.getId()))
            throw new NoSuchElementException("Menú no encontrado");
        return menu;
    }
}