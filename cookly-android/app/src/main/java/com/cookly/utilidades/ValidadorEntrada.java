package com.cookly.utilidades;

import android.util.Patterns;
import java.util.ArrayList;
import java.util.List;

public final class ValidadorEntrada {
    private ValidadorEntrada() { }
    public static boolean correoValido(String correo) { return correo != null && Patterns.EMAIL_ADDRESS.matcher(correo.trim()).matches(); }
    public static boolean contrasenaValida(String contrasena) { return contrasena != null && contrasena.length() >= 10; }
    public static List<String> separarIngredientes(String texto) {
        List<String> resultado = new ArrayList<>();
        if (texto == null) return resultado;
        for (String ingrediente : texto.split("[,\\n\\r;]+")) {
            String limpio = ingrediente.trim();
            if (!limpio.isEmpty() && limpio.length() <= 80 && !resultado.contains(limpio)) resultado.add(limpio);
        }
        return resultado;
    }
}
