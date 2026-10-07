package com.cookly.dto;

/** Latido que envía la app móvil mientras está abierta. "plataforma" es opcional (android, ios, web). */
public record SolicitudLatido(String plataforma) { }