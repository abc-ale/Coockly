package com.cookly.seguridad;

import io.jsonwebtoken.Claims;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

class ServicioTokenTest {
    private static final String SECRETO = "secreto-de-prueba-con-mas-de-32-caracteres";

    private final ServicioToken servicio = new ServicioToken(SECRETO, 5_256_000, 30);

    private static long minutosDeVida(Claims c) {
        return (c.getExpiration().getTime() - c.getIssuedAt().getTime()) / 60_000;
    }

    @Test
    void tokenDelAdministradorVenceALos30Minutos() {
        Claims c = servicio.validar(servicio.crear("admin@cookly.com", "ADMINISTRADOR"));
        assertEquals("admin@cookly.com", c.getSubject());
        assertEquals("ADMINISTRADOR", c.get("rol", String.class));
        assertEquals(30, minutosDeVida(c));
    }

    @Test
    void tokenDelUsuarioDuraDiezAnios() {
        Claims c = servicio.validar(servicio.crear("usuario@cookly.com", "USUARIO"));
        assertEquals("USUARIO", c.get("rol", String.class));
        assertEquals(5_256_000, minutosDeVida(c));
    }

    @Test
    void tokenAlteradoSeRechaza() {
        String token = servicio.crear("usuario@cookly.com", "USUARIO");
        assertThrows(Exception.class, () -> servicio.validar(token + "x"));
    }

    @Test
    void tokenFirmadoConOtraClaveSeRechaza() {
        ServicioToken otro = new ServicioToken("otra-clave-distinta-de-mas-de-32-caracteres", 60, 30);
        String token = otro.crear("usuario@cookly.com", "USUARIO");
        assertThrows(Exception.class, () -> servicio.validar(token));
    }

    @Test
    void secretoCortoNoSePermite() {
        assertThrows(IllegalArgumentException.class, () -> new ServicioToken("corto", 60, 30));
    }

    @Test
    void soloElRolAdministradorEsAdministrador() {
        assertTrue(ServicioToken.esAdministrador("ADMINISTRADOR"));
        assertFalse(ServicioToken.esAdministrador("USUARIO"));
    }
}
