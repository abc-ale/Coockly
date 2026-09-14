package com.cookly.modelos;

import jakarta.persistence.*;
import java.util.*;
import java.util.stream.Collectors;

@Entity
@Table(name = "recetas")
public class Receta {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    @Column(nullable = false) private String nombre;
    @Column(length = 2000) private String descripcion;
    private Short minutosPreparacion;
    @ManyToOne(optional = false) private Usuario creador;
    @OneToMany(mappedBy = "receta", fetch = FetchType.EAGER)
    private Set<IngredienteReceta> detallesIngredientes = new LinkedHashSet<>();
    @OneToMany(mappedBy = "receta", fetch = FetchType.EAGER, orderBy = "orden ASC")
    private List<PasoReceta> pasos = new ArrayList<>();

    public Long getId() { return id; }
    public String getNombre() { return nombre; }
    public String getDescripcion() { return descripcion; }
    public Short getMinutosPreparacion() { return minutosPreparacion; }
    public Usuario getCreador() { return creador; }
    public Set<IngredienteReceta> getDetallesIngredientes() { return detallesIngredientes; }
    public List<PasoReceta> getPasos() { return pasos; }
    /** Compatibilidad con el algoritmo de Menú Express. */
    public Set<Ingrediente> getIngredientes() {
        return detallesIngredientes.stream().map(IngredienteReceta::getIngrediente)
                .filter(Objects::nonNull).collect(Collectors.toCollection(LinkedHashSet::new));
    }
    public void setNombre(String v) { nombre = v; }
    public void setDescripcion(String v) { descripcion = v; }
    public void setMinutosPreparacion(Short v) { minutosPreparacion = v; }
    public void setCreador(Usuario v) { creador = v; }
}