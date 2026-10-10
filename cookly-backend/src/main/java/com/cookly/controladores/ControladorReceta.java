package com.cookly.controladores;

import com.cookly.dto.*;
import com.cookly.modelos.*;
import com.cookly.repositorios.*;
import com.cookly.servicios.ServicioReceta;
import jakarta.validation.Valid;
import org.springframework.data.domain.Page;
import org.springframework.http.*;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import java.util.*;

@RestController
@RequestMapping("/api/v1/recetas")
public class ControladorReceta {
    private final ServicioReceta servicio;
    private final RepositorioReceta recetas;
    private final RepositorioUsuario usuarios;
    private final RepositorioFavorito favoritos;

    public ControladorReceta(ServicioReceta servicio, RepositorioReceta recetas,
                             RepositorioUsuario usuarios, RepositorioFavorito favoritos) {
        this.servicio = servicio;
        this.recetas = recetas;
        this.usuarios = usuarios;
        this.favoritos = favoritos;
    }

    @PostMapping("/menu-express")
    public Map<String, List<RecomendacionReceta>> menuExpress(@Valid @RequestBody SolicitudMenuExpress s) {
        return Map.of("recetas", servicio.menuExpress(s));
    }

    /** Solo ADMINISTRADOR (lo exige ConfiguracionSeguridad). Las recetas con fotos se crean desde el panel. */
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public Receta crear(@Valid @RequestBody SolicitudCrearReceta s, Authentication autenticacion) {
        return servicio.crear(autenticacion.getName(), s);
    }

    /** Búsqueda por nombre, insensible a mayúsculas, paginada. texto puede ser parcial ("past" encuentra "Pasta cremosa"). */
    @GetMapping("/buscar")
    public Page<TarjetaReceta> buscar(@RequestParam String texto,
                                      @RequestParam(defaultValue = "0") int pagina,
                                      @RequestParam(defaultValue = "20") int tamano) {
        return servicio.buscar(texto, pagina, tamano);
    }

    /** Recetas que tienen una etiqueta (Postres, Saludables...). */
    @GetMapping("/por-etiqueta/{etiquetaId}")
    public Page<TarjetaReceta> porEtiqueta(@PathVariable Long etiquetaId,
                                           @RequestParam(defaultValue = "0") int pagina,
                                           @RequestParam(defaultValue = "20") int tamano) {
        return servicio.porEtiqueta(etiquetaId, pagina, tamano);
    }

    @GetMapping("/{id}")
    public Receta detalle(@PathVariable Long id) {
        return recetas.findById(id).orElseThrow(() -> new NoSuchElementException("Receta no encontrada"));
    }

    @GetMapping("/favoritos")
    public List<TarjetaReceta> favoritos(Authentication autenticacion) {
        return servicio.tarjetas(favoritos.buscarRecetasPorCorreo(autenticacion.getName()));
    }

    @PostMapping("/{id}/favorito")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void marcarFavorito(@PathVariable Long id, Authentication autenticacion) {
        Usuario usuario = usuarios.findByCorreo(autenticacion.getName())
                .orElseThrow(() -> new NoSuchElementException("Usuario no encontrado"));
        Receta receta = recetas.findById(id)
                .orElseThrow(() -> new NoSuchElementException("Receta no encontrada"));
        favoritos.save(new Favorito(usuario, receta));
    }

    @DeleteMapping("/{id}/favorito")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void quitarFavorito(@PathVariable Long id, Authentication autenticacion) {
        Usuario usuario = usuarios.findByCorreo(autenticacion.getName())
                .orElseThrow(() -> new NoSuchElementException("Usuario no encontrado"));
        favoritos.deleteById(new ClaveFavorito(usuario.getId(), id));
    }
}