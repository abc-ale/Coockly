package com.cookly.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record SolicitudCambioContrasena(@NotBlank String token,
                                        @NotBlank @Size(min = 10) String nuevaContrasena) {}