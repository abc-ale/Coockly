package com.cookly.dto;
import jakarta.validation.constraints.*;
public record SolicitudCambioContrasenaPropia(String contrasenaActual,
                                               @NotBlank @Size(min = 10, max = 72) String contrasenaNueva) {}