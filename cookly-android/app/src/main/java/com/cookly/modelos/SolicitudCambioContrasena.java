package com.cookly.modelos;

public class SolicitudCambioContrasena {
    public String token;
    public String nuevaContrasena;
    public SolicitudCambioContrasena(String token, String nuevaContrasena) {
        this.token = token;
        this.nuevaContrasena = nuevaContrasena;
    }
}