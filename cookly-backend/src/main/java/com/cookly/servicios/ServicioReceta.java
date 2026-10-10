package com.cookly.servicios;
import com.cookly.dto.*;
import com.cookly.modelos.*;
import com.cookly.repositorios.*;
import com.cookly.servicios.ServicioCloudinary.ImagenSubida;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
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
    private final RepositorioEtiqueta etiquetas;
    private final RepositorioRecetaEtiqueta recetasEtiquetas;
    private final RepositorioImagen imagenes;
    private final RepositorioResena resenas;

    public ServicioReceta(RepositorioReceta recetas, RepositorioUsuario usuarios, RepositorioIngrediente ingredientes,
                           RepositorioIngredienteReceta ingredientesReceta, RepositorioPasoReceta pasosReceta,
                           RepositorioEtiqueta etiquetas, RepositorioRecetaEtiqueta recetasEtiquetas, RepositorioImagen imagenes,
                           RepositorioResena resenas) {
        this.recetas = recetas; this.usuarios = usuarios; this.ingredientes = ingredientes;
        this.ingredientesReceta = ingredientesReceta; this.pasosReceta = pasosReceta;
        this.etiquetas = etiquetas; this.recetasEtiquetas = recetasEtiquetas; this.imagenes = imagenes;
        this.resenas = resenas;
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

    /** Búsqueda por nombre (parcial, sin importar mayúsculas), las más nuevas primero, ya lista para dibujar tarjetas. */
    @Transactional(readOnly = true)
    public Page<TarjetaReceta> buscar(String texto, int pagina, int tamano) {
        return aTarjetas(recetas.findByNombreContainingIgnoreCase(texto, PageRequest.of(pagina, tamano, Sort.by(Sort.Direction.DESC, "id"))));
    }

    @Transactional(readOnly = true)
    public Page<TarjetaReceta> porEtiqueta(Long etiquetaId, int pagina, int tamano) {
        return aTarjetas(recetasEtiquetas.recetasPorEtiqueta(etiquetaId, PageRequest.of(pagina, tamano)));
    }

    @Transactional(readOnly = true)
    public List<TarjetaReceta> tarjetas(List<Receta> lista) {
        List<Long> ids = lista.stream().map(Receta::getId).toList();
        Map<Long, String> portadas = portadas(ids);
        Map<Long, Double> promedios = promedios(ids);
        return lista.stream().map(r -> tarjeta(r, portadas, promedios)).toList();
    }

    private Page<TarjetaReceta> aTarjetas(Page<Receta> pagina) {
        List<Long> ids = pagina.getContent().stream().map(Receta::getId).toList();
        Map<Long, String> portadas = portadas(ids);
        Map<Long, Double> promedios = promedios(ids);
        return pagina.map(r -> tarjeta(r, portadas, promedios));
    }

    private static TarjetaReceta tarjeta(Receta r, Map<Long, String> portadas, Map<Long, Double> promedios) {
        return new TarjetaReceta(r.getId(), r.getNombre(), r.getDescripcion(), r.getMinutosPreparacion(),
                portadas.get(r.getId()), promedios.getOrDefault(r.getId(), 0.0));
    }

    /** Promedio de estrellas de varias recetas en una sola consulta (0 si aún no tienen reseñas). */
    private Map<Long, Double> promedios(List<Long> ids) {
        Map<Long, Double> mapa = new HashMap<>();
        if (ids.isEmpty()) return mapa;
        for (Object[] fila : resenas.promediosPorRecetas(ids)) {
            mapa.put((Long) fila[0], ((Number) fila[1]).doubleValue());
        }
        return mapa;
    }

    private Map<Long, String> portadas(List<Long> ids) {
        Map<Long, String> mapa = new HashMap<>();
        if (ids.isEmpty()) return mapa;
        for (Object[] fila : imagenes.urlsPorRecetas(ids)) {
            mapa.putIfAbsent((Long) fila[0], (String) fila[1]);
        }
        return mapa;
    }

    /** Crea la receta junto con sus ingredientes (creando en el catálogo los que no existan aún), sus pasos y sus etiquetas. */
    @Transactional
    public Receta crear(String correoCreador, SolicitudCrearReceta s) {
        Usuario creador = usuarios.findByCorreo(correoCreador)
                .orElseThrow(() -> new IllegalArgumentException("Usuario no encontrado"));

        Receta receta = new Receta();
        receta.setNombre(s.nombre().trim());
        receta.setDescripcion(s.descripcion() == null || s.descripcion().isBlank() ? null : s.descripcion().trim());
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

        if (s.etiquetas() != null) {
            for (Long idEtiqueta : new LinkedHashSet<>(s.etiquetas())) {
                Etiqueta etiqueta = etiquetas.findById(idEtiqueta)
                        .orElseThrow(() -> new IllegalArgumentException("Etiqueta no encontrada"));
                recetasEtiquetas.save(new RecetaEtiqueta(receta, etiqueta));
            }
        }

        return recetas.findById(receta.getId()).orElseThrow();
    }

    /** Igual que crear, y además guarda las fotos que ya se subieron a Cloudinary (la primera es la portada). Todo o nada. */
    @Transactional
    public Receta crearConImagenes(String correoCreador, SolicitudCrearReceta s, List<ImagenSubida> subidas) {
        Receta receta = crear(correoCreador, s);
        for (ImagenSubida foto : subidas) {
            imagenes.save(new Imagen(receta, foto.url(), foto.identificadorPublico()));
        }
        return receta;
    }
}