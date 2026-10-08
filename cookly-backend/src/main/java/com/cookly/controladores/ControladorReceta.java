package com.cookly.controladores;

import java.util.List;
import java.util.Map;
import java.util.NoSuchElementException;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import com.cookly.dto.RecomendacionReceta;
import com.cookly.dto.SolicitudCrearReceta;
import com.cookly.dto.SolicitudMenuExpress;
import com.cookly.modelos.ClaveFavorito;
import com.cookly.modelos.Etiqueta;
import com.cookly.modelos.Favorito;
import com.cookly.modelos.Receta;
import com.cookly.modelos.RecetaEtiqueta;
import com.cookly.modelos.Usuario;
import com.cookly.repositorios.RepositorioFavorito;
import com.cookly.repositorios.RepositorioReceta;
import com.cookly.repositorios.RepositorioRecetaEtiqueta;
import com.cookly.repositorios.RepositorioUsuario;
import com.cookly.servicios.ServicioReceta;

import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/v1/recetas")
public class ControladorReceta {
    private final ServicioReceta servicio;
    private final RepositorioReceta recetas;
    private final RepositorioUsuario usuarios;
    private final RepositorioFavorito favoritos;
    private final RepositorioRecetaEtiqueta recetaEtiquetas;

    public ControladorReceta(ServicioReceta servicio, RepositorioReceta recetas,
                             RepositorioUsuario usuarios, RepositorioFavorito favoritos,
                             RepositorioRecetaEtiqueta recetaEtiquetas) {
        this.servicio = servicio;
        this.recetas = recetas;
        this.usuarios = usuarios;
        this.favoritos = favoritos;
        this.recetaEtiquetas = recetaEtiquetas;
    }

    @PostMapping("/menu-express")
    public Map<String, List<RecomendacionReceta>> menuExpress(@Valid @RequestBody SolicitudMenuExpress s) {
        return Map.of("recetas", servicio.menuExpress(s));
    }

    /** Autenticado (ya cubierto por ConfiguracionSeguridad: todo lo que no es /autenticacion/** requiere login). */
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public Receta crear(@Valid @RequestBody SolicitudCrearReceta s, Authentication autenticacion) {
        return servicio.crear(autenticacion.getName(), s);
    }

    /** Búsqueda por nombre, insensible a mayúsculas, paginada. texto puede ser parcial ("past" encuentra "Pasta cremosa"). */
    @GetMapping("/buscar")
    public Page<Receta> buscar(@RequestParam String texto,
                               @RequestParam(defaultValue = "0") int pagina,
                               @RequestParam(defaultValue = "20") int tamano) {
        return recetas.findByNombreContainingIgnoreCase(texto, PageRequest.of(pagina, tamano));
    }

    @GetMapping("/{id}")
    public Receta detalle(@PathVariable Long id) {
        return recetas.findById(id).orElseThrow(() -> new NoSuchElementException("Receta no encontrada"));
    }

    @GetMapping("/{id}/etiquetas")
    public List<Etiqueta> etiquetasDeReceta(@PathVariable Long id) {
        return recetaEtiquetas.findByRecetaId(id).stream()
                .map(RecetaEtiqueta::getEtiqueta)
                .toList();
    }

    @GetMapping("/por-etiqueta/{etiquetaId}")
    public Page<Receta> porEtiqueta(@PathVariable Long etiquetaId,
                                    @RequestParam(defaultValue = "0") int pagina,
                                    @RequestParam(defaultValue = "20") int tamano) {
        return recetas.buscarPorEtiqueta(etiquetaId, PageRequest.of(pagina, tamano));
    }

    @GetMapping("/favoritos")
    public List<Receta> favoritos(Authentication autenticacion) {
        return favoritos.buscarRecetasPorCorreo(autenticacion.getName());
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