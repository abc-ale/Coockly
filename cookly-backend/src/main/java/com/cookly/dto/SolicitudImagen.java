package com.cookly.dto;
import jakarta.validation.constraints.*;
public record SolicitudImagen(@NotNull Long recetaId, @NotBlank String url, @NotBlank String identificadorPublico) {}