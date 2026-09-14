package com.cookly.servicios;

import com.cookly.dto.RecomendacionReceta;
import com.cookly.dto.SolicitudMenuExpress;
import com.cookly.repositorios.RepositorioReceta;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.text.Normalizer;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import java.util.stream.Collectors;

@Service
public class ServicioReceta {
    private final RepositorioReceta recetas;

    public ServicioReceta(RepositorioReceta r) {
        recetas = r;
    }

    @Transactional(readOnly = true)
    public List<RecomendacionReceta> menuExpress(SolicitudMenuExpress solicitud) {
        Set<String> disponibles = solicitud.ingredientes().stream()
                .map(this::normalizar)
                .filter(ingrediente -> !ingrediente.isBlank())
                .collect(Collectors.toSet());

        return recetas.findAllConIngredientes().stream()
                .map(receta -> {
                    Set<String> requeridos = receta.getIngredientes().stream()
                            .map(ingrediente -> normalizar(ingrediente.getNombre()))
                            .collect(Collectors.toSet());
                    List<String> faltantes = receta.getIngredientes().stream()
                            .map(ingrediente -> ingrediente.getNombre().toLowerCase(Locale.ROOT))
                            .filter(nombre -> !disponibles.contains(normalizar(nombre)))
                            .distinct()
                            .sorted()
                            .toList();
                    int porcentaje = requeridos.isEmpty()
                            ? 0
                            : (int) Math.round(100.0 * (requeridos.size() - faltantes.size()) / requeridos.size());
                    Integer minutos = receta.getMinutosPreparacion() == null
                            ? null
                            : receta.getMinutosPreparacion().intValue();
                    return new RecomendacionReceta(receta.getId(), receta.getNombre(), porcentaje, faltantes, minutos);
                })
                .filter(recomendacion -> recomendacion.porcentajeCoincidencia() > 0)
                .sorted(Comparator.comparing(RecomendacionReceta::porcentajeCoincidencia).reversed()
                        .thenComparing(recomendacion -> recomendacion.ingredientesFaltantes().size())
                        .thenComparing(RecomendacionReceta::minutosPreparacion,
                                Comparator.nullsLast(Comparator.naturalOrder())))
                .limit(30)
                .toList();
    }

    private String normalizar(String texto) {
        return Normalizer.normalize(texto == null ? "" : texto, Normalizer.Form.NFD)
                .replaceAll("\\p{M}", "")
                .trim()
                .toLowerCase(Locale.ROOT);
    }
}
