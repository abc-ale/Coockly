package com.cookly.dto;
import jakarta.validation.constraints.*;
public record SolicitudCambioNombre(@NotBlank @Size(min = 2, max = 60) String nombre) {}