package com.cookly.dto;
import jakarta.validation.constraints.NotBlank;
public record SolicitudListaCompra(@NotBlank String nombre) {}
