package com.cookly.dto;

/** Fila del listado de usuarios del panel (y de los reportes en Excel y PDF). Las fechas ya vienen en hora local. */
public record UsuarioResumen(
        long id,
        String nombre,
        String correo,
        String rol,
        boolean activo,
        String creadoEn,
        long sesiones,
        long segundosUso,
        String ultimoAcceso,
        long recetas,
        long favoritos) { }