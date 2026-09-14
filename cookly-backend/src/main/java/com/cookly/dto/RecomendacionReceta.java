package com.cookly.dto; import java.util.*;
public record RecomendacionReceta(Long id,String nombre,int porcentajeCoincidencia,List<String> ingredientesFaltantes,Integer minutosPreparacion){}
