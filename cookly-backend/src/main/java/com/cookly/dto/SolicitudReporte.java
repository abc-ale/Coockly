package com.cookly.dto;
import jakarta.validation.constraints.*;
public record SolicitudReporte(@NotNull Long recetaId, @NotBlank @Size(max = 500) String motivo) {}
