package com.cookly.servicios;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;

class ServicioReportesTest {
    @Test
    void duracionEnMinutos() {
        assertEquals("0 min", ServicioReportes.duracion(0));
        assertEquals("5 min", ServicioReportes.duracion(300));
    }

    @Test
    void duracionEnHorasYMinutos() {
        assertEquals("2 h 05 min", ServicioReportes.duracion(7500));
        assertEquals("1 h 00 min", ServicioReportes.duracion(3600));
    }
}
