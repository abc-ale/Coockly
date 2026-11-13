package com.cookly.dto;
import com.cookly.modelos.TipoComida;
import jakarta.validation.constraints.*;
public record SolicitudElementoMenu(@NotNull Long recetaId, @NotNull @Min(1) @Max(7) Short diaSemana, @NotNull TipoComida tipoComida) {}