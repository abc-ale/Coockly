package com.cookly.utilidades;

/** Conversiones locales para mostrar cantidades; no reemplaza las unidades de la receta. */
public final class ConversorMedidas {
    private ConversorMedidas() { }
    public static double gramosAKilogramos(double gramos) { return gramos / 1000d; }
    public static double mililitrosALitros(double mililitros) { return mililitros / 1000d; }
    public static double escalar(double cantidad, int porcionesOriginales, int porcionesDeseadas) {
        if (porcionesOriginales <= 0 || porcionesDeseadas <= 0) throw new IllegalArgumentException("Las porciones deben ser mayores que cero");
        return cantidad * porcionesDeseadas / porcionesOriginales;
    }
}
