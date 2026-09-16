package com.cookly.modelos;

/** Paso de receta. segundosTemporizador es opcional y permite cocina guiada. */
public class PasoReceta {
    public int orden;
    public String instruccion;
    public int segundosTemporizador;

    public PasoReceta() { }
    public PasoReceta(int orden, String instruccion, int segundosTemporizador) {
        this.orden = orden;
        this.instruccion = instruccion;
        this.segundosTemporizador = segundosTemporizador;
    }
}