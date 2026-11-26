package com.cookly.dto; import java.util.*;
/** portada: primera foto de la receta (puede ser null), para que la app no tenga que pedirla aparte. */
public record RecomendacionReceta(Long id,String nombre,int porcentajeCoincidencia,List<String> ingredientesFaltantes,Integer minutosPreparacion,String portada){
    public RecomendacionReceta conPortada(String url) {
        return new RecomendacionReceta(id, nombre, porcentajeCoincidencia, ingredientesFaltantes, minutosPreparacion, url);
    }
}
