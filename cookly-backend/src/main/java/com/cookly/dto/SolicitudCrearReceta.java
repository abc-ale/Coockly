package com.cookly.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import java.util.List;

public record SolicitudCrearReceta(
    @NotBlank @Size(max = 150) String nombre,
    @Size(max = 2000) String descripcion,
    @Min(1) @Max(2000) Short minutosPreparacion,
    @NotEmpty List<@Valid SolicitudIngredienteNuevo> ingredientes,
    @NotEmpty List<@Valid SolicitudPasoNuevo> pasos,
    List<Long> etiquetas
) {
    public record SolicitudIngredienteNuevo(@NotBlank String nombre, Double cantidad, String unidad) { }
    public record SolicitudPasoNuevo(@NotNull Short orden, @NotBlank String instruccion) { }
}