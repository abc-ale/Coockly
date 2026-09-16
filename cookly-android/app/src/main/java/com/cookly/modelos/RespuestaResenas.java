package com.cookly.modelos;

import java.util.List;

/** Lo que devuelve GET recetas/{id}/resenas: la lista + el promedio ya calculado. */
public class RespuestaResenas {
    public List<Resena> resenas;
    public double promedio;
}
