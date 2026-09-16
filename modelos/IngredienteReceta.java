package com.cookly.modelos;

import com.google.gson.annotations.SerializedName;

/** Ingrediente con cantidad escalable. El backend puede devolver unidad y cantidad desde Supabase. */
public class IngredienteReceta {
    public String nombre;
    public double cantidad;
    public String unidad;
    @SerializedName("ingrediente") public IngredienteApi ingrediente;

    public IngredienteReceta() { }
    public IngredienteReceta(String nombre, double cantidad, String unidad) {
        this.nombre = nombre;
        this.cantidad = cantidad;
        this.unidad = unidad;
    }

    public String nombreVisible() {
        return nombre != null ? nombre : (ingrediente == null ? "Ingrediente" : ingrediente.nombre);
    }

    public static class IngredienteApi {
        public String nombre;
    }
}