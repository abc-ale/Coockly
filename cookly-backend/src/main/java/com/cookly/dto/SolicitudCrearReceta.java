package com.cookly.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import java.util.List;

public record SolicitudCrearReceta(
    @NotBlank String nombre,
    String descripcion,
    Short minutosPreparacion,
    @NotEmpty List<@Valid SolicitudIngredienteNuevo> ingredientes,
    @NotEmpty List<@Valid SolicitudPasoNuevo> pasos
) {
    public record SolicitudIngredienteNuevo(@NotBlank String nombre, Double cantidad, String unidad) { }
    public record SolicitudPasoNuevo(@NotNull Short orden, @NotBlank String instruccion) { }
}

