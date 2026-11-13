package com.cookly.dto;
import jakarta.validation.constraints.*;
public record SolicitudComentario(@NotBlank @Size(max = 1000) String contenido) {}
