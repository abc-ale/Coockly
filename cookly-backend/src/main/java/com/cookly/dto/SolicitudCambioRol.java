package com.cookly.dto;
import com.cookly.modelos.Rol;
import jakarta.validation.constraints.NotNull;
public record SolicitudCambioRol(@NotNull Rol rol) {}