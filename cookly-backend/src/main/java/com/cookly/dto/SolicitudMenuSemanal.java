package com.cookly.dto;
import jakarta.validation.constraints.NotNull;
import java.time.LocalDate;
public record SolicitudMenuSemanal(@NotNull LocalDate semana) {}