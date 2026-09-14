package com.cookly.modelos;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;

@Entity
@Table(name = "ingredientes_receta")
public class IngredienteReceta {
    @EmbeddedId private ClaveIngredienteReceta clave;
    @ManyToOne(fetch = FetchType.EAGER) @MapsId("recetaId")
    @JoinColumn(name = "receta_id") @JsonIgnore private Receta receta;
    @ManyToOne(fetch = FetchType.EAGER) @MapsId("ingredienteId")
    @JoinColumn(name = "ingrediente_id") private Ingrediente ingrediente;
    private Double cantidad;
    private String unidad;
    public IngredienteReceta() { }
    public Receta getReceta() { return receta; }
    public Ingrediente getIngrediente() { return ingrediente; }
    public Double getCantidad() { return cantidad; }
    public String getUnidad() { return unidad; }
}