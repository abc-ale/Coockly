package com.cookly.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;

public record SolicitudRecuperacion(@NotBlank @Email String correo) {}