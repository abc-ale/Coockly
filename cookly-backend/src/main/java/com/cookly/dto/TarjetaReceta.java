package com.cookly.dto;

/** Lo mínimo que la app necesita para dibujar la tarjeta de una receta en las listas. */
public record TarjetaReceta(Long id, String nombre, String descripcion, Short minutosPreparacion, String portada) { }