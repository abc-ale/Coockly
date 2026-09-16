package com.cookly.modelos;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;

@Entity
@Table(name = "elementos_lista_compra")
public class ElementoListaCompra {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    @ManyToOne(optional = false, fetch = FetchType.LAZY) @JoinColumn(name = "lista_id")
    @JsonIgnore private ListaCompra lista;
    @ManyToOne(fetch = FetchType.EAGER) @JoinColumn(name = "ingrediente_id")
    private Ingrediente ingrediente;
    /** Solo se usa si el ingrediente no existe en el catálogo. */
    private String nombrePersonalizado;
    private Double cantidad;
    private String unidad;
    private boolean comprado = false;

    public ElementoListaCompra() { }
    public ElementoListaCompra(ListaCompra lista, Ingrediente ingrediente, String nombrePersonalizado,
                                Double cantidad, String unidad) {
        this.lista = lista; this.ingrediente = ingrediente;
        this.nombrePersonalizado = nombrePersonalizado; this.cantidad = cantidad; this.unidad = unidad;
    }

    /** Nombre a mostrar: el del catálogo si existe, si no el personalizado. */
    public String getNombreMostrado() {
        return ingrediente != null ? ingrediente.getNombre() : nombrePersonalizado;
    }

    public Long getId() { return id; }
    public Ingrediente getIngrediente() { return ingrediente; }
    public String getNombrePersonalizado() { return nombrePersonalizado; }
    public Double getCantidad() { return cantidad; }
    public String getUnidad() { return unidad; }
    public boolean isComprado() { return comprado; }
    public void setComprado(boolean v) { comprado = v; }
}