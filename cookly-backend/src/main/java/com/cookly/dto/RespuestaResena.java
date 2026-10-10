package com.cookly.dto;

import java.time.Instant;

/** Reseña lista para enviar a la app (sin entidades de JPA, para evitar errores de carga diferida). */
public record RespuestaResena(Long id, Short puntuacion, String comentario, Instant creadoEn, Autor usuario) {
    public record Autor(String nombre, String correo) { }
}