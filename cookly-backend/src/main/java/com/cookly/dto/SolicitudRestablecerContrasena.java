package com.cookly.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record SolicitudRestablecerContrasena(@NotBlank @Size(min = 10, max = 72) String nuevaContrasena) {}
