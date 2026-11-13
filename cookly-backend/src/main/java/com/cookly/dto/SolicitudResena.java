package com.cookly.dto;
import jakarta.validation.constraints.*;
public record SolicitudResena(@NotNull @Min(1) @Max(5) Short puntuacion, @Size(max = 1000) String comentario) {}