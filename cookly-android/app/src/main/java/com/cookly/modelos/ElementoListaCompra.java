package com.cookly.modelos;

public class ElementoListaCompra {
    public Long id;
    public Ingrediente ingrediente;
    public String nombrePersonalizado;
    public Double cantidad;
    public String unidad;
    public boolean comprado;

    /** Nombre a mostrar en la UI: el del catálogo si existe, si no el que escribió el usuario. */
    public String nombreVisible() {
        return ingrediente != null ? ingrediente.nombre : nombrePersonalizado;
    }
}