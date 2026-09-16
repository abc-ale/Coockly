package com.cookly.modelos;
public class SolicitudElementoListaCompra {
    public Long ingredienteId;
    public String nombrePersonalizado;
    public Double cantidad;
    public String unidad;
    public SolicitudElementoListaCompra(Long ingredienteId, String nombrePersonalizado, Double cantidad, String unidad) {
        this.ingredienteId = ingredienteId; this.nombrePersonalizado = nombrePersonalizado;
        this.cantidad = cantidad; this.unidad = unidad;
    }
}