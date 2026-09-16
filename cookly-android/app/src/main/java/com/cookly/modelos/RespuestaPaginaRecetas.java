package com.cookly.modelos;

import java.util.List;

/** Refleja el JSON que produce Spring Data al serializar un Page<Receta>. */
public class RespuestaPaginaRecetas {
    public List<RecetaDetalle> content;
    public int totalPages;
    public long totalElements;
    public int number;   // página actual (0-based)
    public int size;
    public boolean last;
    public boolean first;
    public boolean empty;
}