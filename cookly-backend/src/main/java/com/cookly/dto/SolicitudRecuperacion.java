package com.cookly.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;

/** origen es opcional: "panel" cuando la solicitud viene del panel web de administración. */
public record SolicitudRecuperacion(@NotBlank @Email String correo, String origen) {}