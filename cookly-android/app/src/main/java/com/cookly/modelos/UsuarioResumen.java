package com.cookly.modelos;

/** Versión pública de Usuario tal como la devuelve el backend (contrasena nunca viaja, tiene @JsonIgnore). */
public class UsuarioResumen {
    public Long id;
    public String nombre;
    public String correo;
    public String rol;
}