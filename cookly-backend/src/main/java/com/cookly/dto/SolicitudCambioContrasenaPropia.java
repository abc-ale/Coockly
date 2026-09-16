package com.cookly.dto;
import jakarta.validation.constraints.*;
public record SolicitudCambioContrasenaPropia(@NotBlank String contrasenaActual,
                                               @NotBlank @Size(min = 10, max = 72) String contrasenaNueva) {}