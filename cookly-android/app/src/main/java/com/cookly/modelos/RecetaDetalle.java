package com.cookly.modelos;

import java.util.ArrayList;
import java.util.List;
import com.google.gson.annotations.SerializedName;

public class RecetaDetalle {
    public Long id;
    public String nombre;
    public String descripcion;
    public String imagenUrl;
    public int porcionesBase = 2;
    public Integer minutosPreparacion;
    public List<IngredienteReceta> ingredientes = new ArrayList<>();
    @SerializedName("detallesIngredientes")
    public List<IngredienteReceta> detallesIngredientes = new ArrayList<>();
    public List<PasoReceta> pasos = new ArrayList<>();
}