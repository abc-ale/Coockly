package com.cookly.utilidades;

/** Conversiones locales para mostrar cantidades; no reemplaza las unidades de la receta. */
public final class ConversorMedidas {
    private ConversorMedidas() { }

    // Equivalencias de volumen usadas para el toggle "tradicional" <-> "tazas y cucharas".
    private static final double ML_POR_TAZA = 240d;
    private static final double ML_POR_CUCHARADA = 15d;
    private static final double ML_POR_CUCHARADITA = 5d;

    public static double gramosAKilogramos(double gramos) { return gramos / 1000d; }
    public static double mililitrosALitros(double mililitros) { return mililitros / 1000d; }

    public static double escalar(double cantidad, int porcionesOriginales, int porcionesDeseadas) {
        if (porcionesOriginales <= 0 || porcionesDeseadas <= 0) throw new IllegalArgumentException("Las porciones deben ser mayores que cero");
        return cantidad * porcionesDeseadas / porcionesOriginales;
    }

    /** Indica si esta unidad se puede convertir entre el sistema "tazas/cucharas" y mililitros. */
    public static boolean esUnidadDeVolumen(String unidad) {
        if (unidad == null) return false;
        String u = unidad.toLowerCase();
        return u.equals("taza") || u.equals("tazas") || u.equals("cucharada") || u.equals("cucharadas")
                || u.equals("cucharadita") || u.equals("cucharaditas") || u.equals("ml") || u.equals("mililitros");
    }

    private static double aMililitros(double cantidad, String unidad) {
        switch (unidad.toLowerCase()) {
            case "taza": case "tazas": return cantidad * ML_POR_TAZA;
            case "cucharada": case "cucharadas": return cantidad * ML_POR_CUCHARADA;
            case "cucharadita": case "cucharaditas": return cantidad * ML_POR_CUCHARADITA;
            default: return cantidad; // ya está en ml
        }
    }

    /**
     * Convierte una cantidad+unidad de volumen al sistema pedido.
     * modoTazas=true  -> intenta expresar en tazas, si no en cucharadas, si no en cucharaditas.
     * modoTazas=false -> expresa siempre en mililitros (mostrado como "tradicional").
     * Los ingredientes que no son de volumen (gramos, unidad) no se tocan: no hay
     * suficiente información de densidad para convertir peso a volumen con precisión.
     */
    public static double[] convertirVolumen(double cantidad, String unidad, boolean modoTazas) {
        double ml = aMililitros(cantidad, unidad);
        if (!modoTazas) return new double[]{ml, 0}; // 0 = código de unidad "ml"
        if (ml >= ML_POR_TAZA * 0.75) return new double[]{ml / ML_POR_TAZA, 1}; // 1 = "taza"
        if (ml >= ML_POR_CUCHARADA * 0.75) return new double[]{ml / ML_POR_CUCHARADA, 2}; // 2 = "cucharada"
        return new double[]{ml / ML_POR_CUCHARADITA, 3}; // 3 = "cucharadita"
    }

    public static String nombreUnidad(int codigo, double cantidad) {
        boolean plural = Math.abs(cantidad - 1) > 0.001;
        switch (codigo) {
            case 1: return plural ? "tazas" : "taza";
            case 2: return plural ? "cucharadas" : "cucharada";
            case 3: return plural ? "cucharaditas" : "cucharadita";
            default: return "ml";
        }
    }

    /**
     * Redondea al medio más cercano (ej: 2.19 -> 2, 17.50 -> 17.5, 5.83 -> 6),
     * con un mínimo de medio para no mostrar "0". Así en la cocina solo hay
     * que medir en números enteros o medias tazas/cucharas, nunca decimales raros.
     */
    public static double redondearAmigable(double cantidad) {
        double redondeado = Math.round(cantidad * 2) / 2.0;
        return redondeado < 0.5 ? 0.5 : redondeado;
    }

    /** Formatea como "2", "1 1/2", "17 1/2" en vez de decimales. */
    public static String formatearFraccion(double cantidad, String unidad) {
        double valor = redondearAmigable(cantidad);
        long entero = (long) valor;
        boolean tieneMedio = (valor - entero) >= 0.25;
        String numero;
        if (entero == 0) numero = "1/2";
        else if (tieneMedio) numero = entero + " 1/2";
        else numero = String.valueOf(entero);
        return numero + " " + unidad;
    }

    public static String formatear(double cantidad, String unidad) {
        if (Math.abs(cantidad - Math.rint(cantidad)) < 0.001) {
            return String.format(java.util.Locale.getDefault(), "%.0f %s", cantidad, unidad);
        }
        return String.format(java.util.Locale.getDefault(), "%.2f %s", cantidad, unidad);
    }
}
