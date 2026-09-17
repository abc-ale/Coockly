package com.cookly.modelos;

import java.util.List;

public class SolicitudCrearReceta {
    public String nombre;
    public String descripcion;
    public Integer minutosPreparacion;
    public List<IngredienteNuevo> ingredientes;
    public List<PasoNuevo> pasos;

    public SolicitudCrearReceta(String nombre, String descripcion, Integer minutosPreparacion,
                                List<IngredienteNuevo> ingredientes, List<PasoNuevo> pasos) {
        this.nombre = nombre; this.descripcion = descripcion; this.minutosPreparacion = minutosPreparacion;
        this.ingredientes = ingredientes; this.pasos = pasos;
    }

    public static class IngredienteNuevo {
        public String nombre;
        public Double cantidad;
        public String unidad;
        public IngredienteNuevo(String nombre, Double cantidad, String unidad) {
            this.nombre = nombre; this.cantidad = cantidad; this.unidad = unidad;
        }
    }

    public static class PasoNuevo {
        public int orden;
        public String instruccion;
        public PasoNuevo(int orden, String instruccion) { this.orden = orden; this.instruccion = instruccion; }
    }
}