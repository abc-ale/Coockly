package com.cookly.servicios;
import com.cookly.dto.*;
import com.cookly.modelos.*;
import com.cookly.repositorios.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.*;
import java.util.stream.*;

@Service
public class ServicioReceta {
    private final RepositorioReceta recetas;
    private final RepositorioUsuario usuarios;
    private final RepositorioIngrediente ingredientes;
    private final RepositorioIngredienteReceta ingredientesReceta;
    private final RepositorioPasoReceta pasosReceta;

    public ServicioReceta(RepositorioReceta recetas, RepositorioUsuario usuarios, RepositorioIngrediente ingredientes,
                           RepositorioIngredienteReceta ingredientesReceta, RepositorioPasoReceta pasosReceta) {
        this.recetas = recetas; this.usuarios = usuarios; this.ingredientes = ingredientes;
        this.ingredientesReceta = ingredientesReceta; this.pasosReceta = pasosReceta;
    }

    @Transactional(readOnly = true)
    public List<RecomendacionReceta> menuExpress(SolicitudMenuExpress solicitud) {
        var disponibles = solicitud.ingredientes().stream().map(x -> x.trim().toLowerCase()).collect(Collectors.toSet());
        return recetas.findAll().stream().map(r -> {
            var requeridos = r.getIngredientes().stream().map(i -> i.getNombre().toLowerCase()).collect(Collectors.toSet());
            var faltantes = requeridos.stream().filter(x -> !disponibles.contains(x)).sorted().toList();
            int porcentaje = requeridos.isEmpty() ? 0 : (int) Math.round(100.0 * (requeridos.size() - faltantes.size()) / requeridos.size());
            Integer minutos = r.getMinutosPreparacion() == null ? null : r.getMinutosPreparacion().intValue();
            return new RecomendacionReceta(r.getId(), r.getNombre(), porcentaje, faltantes, minutos);
        }).filter(x -> x.porcentajeCoincidencia() > 0)
          .sorted(Comparator.comparing(RecomendacionReceta::porcentajeCoincidencia).reversed()
                  .thenComparing(x -> x.ingredientesFaltantes().size())
                  .thenComparing(RecomendacionReceta::minutosPreparacion, Comparator.nullsLast(Comparator.naturalOrder())))
          .limit(30).toList();
    }

    /** Crea la receta junto con sus ingredientes (creando en el catálogo los que no existan aún) y sus pasos. */
    @Transactional
    public Receta crear(String correoCreador, SolicitudCrearReceta s) {
        Usuario creador = usuarios.findByCorreo(correoCreador)
                .orElseThrow(() -> new IllegalArgumentException("Usuario no encontrado"));

        Receta receta = new Receta();
        receta.setNombre(s.nombre());
        receta.setDescripcion(s.descripcion());
        receta.setMinutosPreparacion(s.minutosPreparacion());
        receta.setCreador(creador);
        receta = recetas.save(receta);

        for (var linea : s.ingredientes()) {
            Ingrediente ingrediente = ingredientes.findByNombreIgnoreCase(linea.nombre().trim())
                    .orElseGet(() -> {
                        Ingrediente nuevo = new Ingrediente();
                        nuevo.setNombre(linea.nombre().trim());
                        return ingredientes.save(nuevo);
                    });
            ingredientesReceta.save(new IngredienteReceta(receta, ingrediente, linea.cantidad(), linea.unidad()));
        }

        for (var paso : s.pasos()) {
            pasosReceta.save(new PasoReceta(receta, paso.orden(), paso.instruccion()));
        }

        return recetas.findById(receta.getId()).orElseThrow();
    }
}