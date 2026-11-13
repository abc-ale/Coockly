package com.cookly.dto;

import java.time.Instant;

/** Comentario listo para enviar a la app (sin entidades de JPA, para evitar errores de carga diferida). */
public record RespuestaComentario(Long id, String contenido, Instant creadoEn, Autor usuario) {
    public record Autor(String nombre, String correo) { }
}
