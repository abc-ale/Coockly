package com.cookly.dto;
import com.cookly.modelos.EstadoReporte;
import jakarta.validation.constraints.NotNull;
public record SolicitudRevisionReporte(@NotNull EstadoReporte estado) {}

